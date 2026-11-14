import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  statfsSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { detectManagedDrift, loadProjectState } from "../src/project/state";
import { emptyProjectState, type ProjectState } from "../src/project/types";

const sizes = (process.env.LAUNCHSTACK_BENCH_SIZES ?? "1000,10000,50000,100000")
  .split(",")
  .map(Number);
const repetitions = Number(process.env.LAUNCHSTACK_BENCH_REPETITIONS ?? 3);
const warmups = Number(process.env.LAUNCHSTACK_BENCH_WARMUPS ?? 1);
const maxFiles = 250_000;
const content = "launchstack drift fixture v1\n";
const bytesPerFile = Buffer.byteLength(content);
function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return Number(
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
    ]?.toFixed(3) ?? 0,
  );
}
function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function driftRun(
  root: string,
  expected: number,
): {
  stateLoadMs: number;
  driftMs: number;
  clean: number;
  modified: number;
  missing: number;
  hashBytes: number;
  cpuUserUs: number;
  cpuSystemUs: number;
} {
  const cpuStart = process.cpuUsage();
  const stateStart = performance.now();
  const state = loadProjectState(root);
  const stateLoadMs = performance.now() - stateStart;
  const driftStart = performance.now();
  const drift = detectManagedDrift(root, state);
  const driftMs = performance.now() - driftStart;
  const clean = drift.filter((item) => item.kind === "clean").length;
  const modified = drift.filter((item) => item.kind === "modified").length;
  const missing = drift.filter((item) => item.kind === "missing").length;
  if (drift.length !== expected || clean + modified + missing !== expected)
    throw new Error("Drift fixture integrity check failed.");
  const cpu = process.cpuUsage(cpuStart);
  return {
    stateLoadMs,
    driftMs,
    clean,
    modified,
    missing,
    hashBytes: (expected - missing) * bytesPerFile,
    cpuUserUs: cpu.user,
    cpuSystemUs: cpu.system,
  };
}
function setupFixture(size: number): {
  root: string;
  paths: string[];
  stateBytes: number;
} {
  const root = mkdtempSync(join(tmpdir(), `launchstack-drift-${size}-`));
  mkdirSync(join(root, ".launchstack"), { recursive: true });
  const state = emptyProjectState("3.0.0", "3.0.4");
  const paths: string[] = [];
  for (let index = 0; index < size; index += 1) {
    const relative = `managed/${String(Math.floor(index / 1000)).padStart(4, "0")}/file-${String(index).padStart(7, "0")}.txt`;
    if (index % 1000 === 0)
      mkdirSync(
        join(
          root,
          "managed",
          String(Math.floor(index / 1000)).padStart(4, "0"),
        ),
        { recursive: true },
      );
    writeFileSync(join(root, relative), content);
    state.managedFiles[relative] = {
      owner: "benchmark",
      sha256: digest(content),
      version: "1.0.0",
    };
    paths.push(relative);
  }
  const stateText = JSON.stringify(state);
  writeFileSync(join(root, ".launchstack", "state.json"), stateText);
  return { root, paths, stateBytes: Buffer.byteLength(stateText) };
}
function setDistribution(
  root: string,
  paths: string[],
  kind: "clean" | "modified" | "missing",
): void {
  for (let index = 0; index < paths.length; index += 100) {
    const path = join(root, paths[index]!);
    if (kind !== "modified") writeFileSync(path, content);
    else writeFileSync(path, "launchstack drift fixture modified\n");
    if (kind === "missing") unlinkSync(path);
  }
}
function ensureCapacity(size: number): void {
  const available = statfsSync(tmpdir()).bavail * statfsSync(tmpdir()).bsize;
  const conservativeNeed = size * 4096 * 2;
  if (available < conservativeNeed + 2 * 1024 * 1024 * 1024)
    throw new Error(
      `Refusing ${size} file fixture: insufficient free space for a safe temporary run.`,
    );
}
async function main(): Promise<void> {
  const startedCpu = process.cpuUsage();
  const startedAt = new Date().toISOString();
  const measurements: Array<Record<string, unknown>> = [];
  for (const size of sizes) {
    if (!Number.isSafeInteger(size) || size < 1 || size > maxFiles)
      throw new Error(`Fixture size must be between 1 and ${maxFiles} files.`);
    ensureCapacity(size);
    const fixture = setupFixture(size);
    try {
      for (const distribution of ["clean", "modified", "missing"] as const) {
        setDistribution(fixture.root, fixture.paths, distribution);
        for (let index = 0; index < warmups; index += 1)
          driftRun(fixture.root, size);
        const samples = Array.from({ length: repetitions }, () =>
          driftRun(fixture.root, size),
        );
        const expected =
          distribution === "clean"
            ? [size, 0, 0]
            : distribution === "modified"
              ? [size - Math.ceil(size / 100), Math.ceil(size / 100), 0]
              : [size - Math.ceil(size / 100), 0, Math.ceil(size / 100)];
        const observed = samples[0]!;
        if (
          observed.clean !== expected[0] ||
          observed.modified !== expected[1] ||
          observed.missing !== expected[2]
        )
          throw new Error(
            `Unexpected ${distribution} drift distribution at ${size} files.`,
          );
        measurements.push({
          files: size,
          state_bytes: fixture.stateBytes,
          distribution,
          modified_or_missing_ratio: distribution === "clean" ? 0 : 0.01,
          repetitions,
          warmups,
          logical_file_bytes_hashed: observed.hashBytes,
          estimated_logical_input_bytes:
            observed.hashBytes + fixture.stateBytes,
          clean_entries: observed.clean,
          modified_entries: observed.modified,
          missing_entries: observed.missing,
          state_load_ms: {
            p50: percentile(
              samples.map((item) => item.stateLoadMs),
              0.5,
            ),
            p95: percentile(
              samples.map((item) => item.stateLoadMs),
              0.95,
            ),
          },
          drift_ms: {
            p50: percentile(
              samples.map((item) => item.driftMs),
              0.5,
            ),
            p95: percentile(
              samples.map((item) => item.driftMs),
              0.95,
            ),
          },
          cpu_microseconds: {
            p50_user: percentile(
              samples.map((item) => item.cpuUserUs),
              0.5,
            ),
            p50_system: percentile(
              samples.map((item) => item.cpuSystemUs),
              0.5,
            ),
          },
          errors: 0,
        });
      }
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }
  const os = await import("node:os");
  process.stdout.write(
    `${JSON.stringify({ measured_at: startedAt, node: process.version, platform: `${process.platform} ${process.arch}`, os_release: os.release(), cpu_model: os.cpus()[0]?.model, cpu_count: os.availableParallelism(), memory_limit_bytes: Number(process.env.LAUNCHSTACK_BENCH_MEMORY_LIMIT ?? 0) || undefined, filesystem: "temporary directory on workspace filesystem; data uncompressed; cleanup in finally", content_bytes_per_file: bytesPerFile, cpu_microseconds: process.cpuUsage(startedCpu), peak_rss_bytes: process.resourceUsage().maxRSS * 1024, measurements }, null, 2)}\n`,
  );
}
void main();
