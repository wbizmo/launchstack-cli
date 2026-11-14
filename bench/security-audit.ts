import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { runProductionAudit } from "../src/audit/run";

const sizes = (process.env.LAUNCHSTACK_BENCH_SIZES ?? "1000,10000,50000,100000")
  .split(",")
  .map(Number);
const repetitions = Number(process.env.LAUNCHSTACK_BENCH_REPETITIONS ?? 3);
const warmups = Number(process.env.LAUNCHSTACK_BENCH_WARMUPS ?? 1);
const maxFiles = 100_000;

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return Number(
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
    ]?.toFixed(3) ?? 0,
  );
}

function fixture(size: number): { root: string; pathBytes: number } {
  const root = mkdtempSync(join(tmpdir(), `launchstack-audit-${size}-`));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  const oid = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd: root,
    input: "fixture\n",
    encoding: "utf8",
  }).trim();
  const rows: string[] = [];
  let pathBytes = 0;
  for (let index = 0; index < size; index += 1) {
    const path =
      index % 1000 === 0
        ? `secrets/${String(index).padStart(7, "0")}/private.pem`
        : `src/generated/${String(index).padStart(7, "0")}/file-${index}.ts`;
    pathBytes += Buffer.byteLength(path) + 1;
    rows.push(`100644 ${oid}\t${path}\n`);
  }
  execFileSync("git", ["update-index", "--index-info"], {
    cwd: root,
    input: rows.join(""),
  });
  return { root, pathBytes };
}

function currentOpenDescriptors(): number | undefined {
  try {
    return readdirSync("/proc/self/fd").length;
  } catch {
    return undefined;
  }
}

function measure(root: string, expected: number) {
  const cpuStart = process.cpuUsage();
  const descriptorStart = currentOpenDescriptors();
  const start = performance.now();
  const report = runProductionAudit(root);
  const elapsed = performance.now() - start;
  const cpu = process.cpuUsage(cpuStart);
  const secretPathFinding = report.findings.find(
    (item) => item.ruleId === "LS005",
  );
  if (report.findings.length && !secretPathFinding)
    throw new Error(
      `Unexpected audit findings in the synthetic fixture: ${report.findings.map((item) => item.ruleId).join(", ")}`,
    );
  const detected =
    secretPathFinding?.detail.match(/private\.pem/g)?.length ?? 0;
  if (detected !== expected || secretPathFinding?.verified !== false)
    throw new Error("Secret-path heuristic integrity check failed.");
  return {
    elapsed_ms: elapsed,
    cpu_user_us: cpu.user,
    cpu_system_us: cpu.system,
    finding_count: report.findings.length,
    heuristic_secret_paths: detected,
    descriptor_start: descriptorStart,
    descriptor_end: currentOpenDescriptors(),
  };
}

async function main(): Promise<void> {
  const measurements = [];
  for (const size of sizes) {
    if (!Number.isSafeInteger(size) || size < 1 || size > maxFiles)
      throw new Error(`Audit fixture size must be between 1 and ${maxFiles}.`);
    const { root, pathBytes } = fixture(size);
    try {
      const expectedHeuristics = Math.ceil(size / 1000);
      for (let index = 0; index < warmups; index += 1)
        measure(root, expectedHeuristics);
      const samples = Array.from({ length: repetitions }, () =>
        measure(root, expectedHeuristics),
      );
      measurements.push({
        files: size,
        repetitions,
        warmups,
        tracked_path_bytes: pathBytes,
        file_content_bytes_inspected: 0,
        scan_ms: {
          p50: percentile(
            samples.map((item) => item.elapsed_ms),
            0.5,
          ),
          p95: percentile(
            samples.map((item) => item.elapsed_ms),
            0.95,
          ),
        },
        cpu_microseconds: {
          p50_user: percentile(
            samples.map((item) => item.cpu_user_us),
            0.5,
          ),
          p50_system: percentile(
            samples.map((item) => item.cpu_system_us),
            0.5,
          ),
        },
        heuristic_secret_paths: expectedHeuristics,
        false_positives_in_synthetic_labels: 0,
        false_negatives_in_synthetic_labels: 0,
        descriptors: {
          before: samples[0]?.descriptor_start,
          after: samples.at(-1)?.descriptor_end,
        },
        errors: 0,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  const os = await import("node:os");
  process.stdout.write(
    `${JSON.stringify(
      {
        implementation_commit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        os_release: os.release(),
        cpu_model: os.cpus()[0]?.model,
        cpu_count: os.availableParallelism(),
        peak_rss_bytes: process.resourceUsage().maxRSS * 1024,
        fixture:
          "synthetic Git index with exact path labels and one shared empty blob; no file contents",
        classifier:
          "LS005 matches tracked path names only; result is marked heuristic",
        content_fingerprint: createHash("sha256")
          .update("fixture\n")
          .digest("hex"),
        measurements,
      },
      null,
      2,
    )}\n`,
  );
}

void main();
