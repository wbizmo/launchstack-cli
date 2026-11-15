import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const repository = resolve(process.env.LAUNCHSTACK_BENCH_REPO ?? process.cwd());
const workerCount = Number(process.env.LAUNCHSTACK_BENCH_WORKER_COUNT ?? 3);
const sizes = (process.env.LAUNCHSTACK_BENCH_SIZES ?? "100,1000,10000")
  .split(",")
  .map(Number);
const worker = process.env.LAUNCHSTACK_BENCH_WORKER === "1";

async function runWorker(size: number): Promise<void> {
  const [{ applyFileMutations }, { emptyProjectState }] = await Promise.all([
    import(pathToFileURL(join(repository, "src/project/transaction.ts")).href),
    import(pathToFileURL(join(repository, "src/project/types.ts")).href),
  ]);
  const projectDirectory = mkdtempSync(
    join(tmpdir(), "launchstack-mutation-bench-"),
  );
  const mutations = Array.from({ length: size }, (_, index) => ({
    type: "write" as const,
    path: `managed/file-${index.toString().padStart(6, "0")}.txt`,
    content: `fixture-${index}\n`,
    owner: "benchmark",
    version: "1",
    expectedSha256: null,
  }));
  const started = performance.now();
  try {
    applyFileMutations({
      projectDirectory,
      mutations,
      state: emptyProjectState("3.0.0", "3.0.6"),
    });
    const elapsed_ms = performance.now() - started;
    for (const mutation of mutations)
      if (
        readFileSync(join(projectDirectory, mutation.path), "utf8") !==
        mutation.content
      )
        throw new Error(`Content check failed for ${mutation.path}.`);
    process.stdout.write(
      JSON.stringify({
        elapsed_ms,
        files: size,
        bytes: mutations.reduce(
          (sum, mutation) => sum + Buffer.byteLength(mutation.content),
          0,
        ),
        content_checks: "passed",
      }),
    );
  } finally {
    rmSync(projectDirectory, { recursive: true, force: true });
  }
}

function rssKilobytes(pid: number): number {
  try {
    const status = readFileSync(`/proc/${pid}/status`, "utf8");
    return Number(/^VmRSS:\s+(\d+)\s+kB/m.exec(status)?.[1] ?? 0);
  } catch {
    return 0;
  }
}

async function sampleRun(size: number): Promise<{
  elapsed_ms: number;
  peak_rss_kb: number;
  files: number;
  bytes: number;
  content_checks: "passed";
}> {
  const script = __filename;
  const child = spawn(
    process.execPath,
    ["--import", "tsx", script, "--worker", String(size)],
    {
      env: {
        ...process.env,
        LAUNCHSTACK_BENCH_REPO: repository,
        LAUNCHSTACK_BENCH_WORKER: "1",
      },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  let output = "";
  let peak = 0;
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    output += chunk;
  });
  const sampler = setInterval(() => {
    if (child.pid) peak = Math.max(peak, rssKilobytes(child.pid));
  }, 5);
  const exitCode = await new Promise<number>(
    (resolvePromise, rejectPromise) => {
      child.once("error", rejectPromise);
      child.once("exit", (code) =>
        code === null
          ? rejectPromise(new Error("benchmark worker was terminated"))
          : resolvePromise(code),
      );
    },
  ).finally(() => clearInterval(sampler));
  if (exitCode !== 0)
    throw new Error(`Mutation benchmark worker exited with ${exitCode}.`);
  return {
    ...(JSON.parse(output) as {
      elapsed_ms: number;
      files: number;
      bytes: number;
      content_checks: "passed";
    }),
    peak_rss_kb: peak,
  };
}

function percentile(samples: number[], fraction: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return Number(
    sorted[
      Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)
    ]?.toFixed(3) ?? 0,
  );
}

function sourceSha256(): string {
  const hash = createHash("sha256");
  hash.update(readFileSync(join(repository, "src/project/transaction.ts")));
  hash.update(readFileSync(__filename));
  return hash.digest("hex");
}

async function runSuite(): Promise<void> {
  const results = [];
  for (const size of sizes) {
    if (!Number.isSafeInteger(size) || size <= 0 || size > 10_000)
      throw new Error("Benchmark sizes must be between 1 and 10,000 files.");
    const samples = [];
    for (let index = 0; index < workerCount; index += 1)
      samples.push(await sampleRun(size));
    results.push({
      files: size,
      bytes: samples[0]?.bytes ?? 0,
      repetitions: samples.length,
      latency_ms: {
        p50: percentile(
          samples.map((item) => item.elapsed_ms),
          0.5,
        ),
        p95: percentile(
          samples.map((item) => item.elapsed_ms),
          0.95,
        ),
      },
      latency_samples_ms: samples.map((item) =>
        Number(item.elapsed_ms.toFixed(3)),
      ),
      sampled_peak_rss_kb: Math.max(...samples.map((item) => item.peak_rss_kb)),
      errors: 0,
      content_checks: samples.every((item) => item.content_checks === "passed"),
    });
  }
  process.stdout.write(
    `${JSON.stringify({ repository, node: process.version, platform: `${process.platform} ${process.arch}`, source_sha256: sourceSha256(), source_identity_files: ["src/project/transaction.ts", "bench/mutations.ts"], worker_count: workerCount, warmup: 0, isolation: "one fresh process and temporary project per repetition", measurements: "parent-observed wall time; /proc VmRSS sampled every 5ms", results }, null, 2)}\n`,
  );
}

async function main(): Promise<void> {
  if (worker)
    await runWorker(Number(process.argv[process.argv.indexOf("--worker") + 1]));
  else await runSuite();
}

void main();
