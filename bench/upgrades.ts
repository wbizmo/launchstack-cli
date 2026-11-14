import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const repository = resolve(process.env.LAUNCHSTACK_BENCH_REPO ?? process.cwd());
const repetitions = Number(process.env.LAUNCHSTACK_BENCH_WORKER_COUNT ?? 3);
const warmup = Number(process.env.LAUNCHSTACK_BENCH_WARMUP_COUNT ?? 1);
const sizes = (process.env.LAUNCHSTACK_BENCH_SIZES ?? "100,1000,10000")
  .split(",")
  .map(Number);
const worker = process.env.LAUNCHSTACK_UPGRADE_BENCH_WORKER === "1";

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function runWorker(size: number): Promise<void> {
  const { planUpgrade } = await import(
    pathToFileURL(join(repository, "src/project/upgrade.ts")).href
  );
  const { detectManagedDrift, loadProjectState } = await import(
    pathToFileURL(join(repository, "src/project/state.ts")).href
  );
  const project = mkdtempSync(join(tmpdir(), "launchstack-upgrade-bench-"));
  const managedFiles: Record<
    string,
    { owner: string; sha256: string; version: string }
  > = {};
  mkdirSync(join(project, "src", "routes"), { recursive: true });
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({ name: "bench-api", version: "2.1.3" }),
  );
  writeFileSync(
    join(project, "launchstack.json"),
    JSON.stringify(
      {
        $schema: "https://launchstack.dev/schemas/project-v1.json",
        schemaVersion: 1,
        project: { name: "bench-api", templateVersion: "2.0.0" },
        capabilities: {},
        provider: { id: "docker" },
        stages: {},
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    join(project, "src", "routes", "index.ts"),
    'import { readinessRoutes } from "./readiness";\nexport async function registerRoutes(app: any) { await app.register(readinessRoutes); }\n',
  );
  writeFileSync(
    join(project, "src", "app.ts"),
    'import { registerPlugins } from "./plugins";\n\nexport async function buildApp() {\n  await registerPlugins(app);\n}\n',
  );
  mkdirSync(join(project, ".launchstack"), { recursive: true });
  for (let index = 0; index < size; index += 1) {
    const path = `src/generated/file-${index.toString().padStart(6, "0")}.ts`;
    const content = `export const fixture${index} = ${index};\n`;
    const absolute = join(project, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
    managedFiles[path] = {
      owner: "benchmark-extension",
      sha256: digest(content),
      version: "1.0.0",
    };
  }
  const state = {
    stateVersion: 1,
    templateVersion: "2.0.0",
    cliVersion: "2.1.3",
    managedFiles,
    extensions: {},
    stages: {},
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  writeFileSync(
    join(project, ".launchstack", "state.json"),
    JSON.stringify(state),
  );
  const stateBytes = readFileSync(
    join(project, ".launchstack", "state.json"),
  ).byteLength;
  const loadedState = loadProjectState(project);
  process.stdout.write(
    `READY ${JSON.stringify({ files: size, state_bytes: stateBytes })}\n`,
  );
  await new Promise((resolveReady) => setTimeout(resolveReady, 25));
  const driftStarted = performance.now();
  const drift = detectManagedDrift(project, loadedState);
  const driftElapsed = performance.now() - driftStarted;
  const started = performance.now();
  try {
    const plan = planUpgrade(project);
    const diffs = Array.isArray(plan.diffs)
      ? plan.diffs.length
      : Array.isArray(plan.mutations)
        ? plan.mutations.length
        : plan.actions.length;
    process.stdout.write(
      `${JSON.stringify({ elapsed_ms: performance.now() - started, drift_elapsed_ms: driftElapsed, drift_entries: drift.length, diffs, conflicts: plan.conflicts.length, conflict_messages: plan.conflicts })}\n`,
    );
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}

function rssKilobytes(pid: number): number {
  try {
    return Number(
      /^VmRSS:\s+(\d+)\s+kB/m.exec(
        readFileSync(`/proc/${pid}/status`, "utf8"),
      )?.[1] ?? 0,
    );
  } catch {
    return 0;
  }
}

async function sampleRun(size: number): Promise<{
  elapsed_ms: number;
  drift_elapsed_ms: number;
  drift_entries: number;
  plan_diffs: number;
  conflicts: number;
  conflict_messages: string[];
  sampled_peak_rss_kb: number;
  state_bytes: number;
}> {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", __filename, "--worker", String(size)],
    {
      env: {
        ...process.env,
        LAUNCHSTACK_BENCH_REPO: repository,
        LAUNCHSTACK_UPGRADE_BENCH_WORKER: "1",
      },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  let output = "";
  let ready = false;
  let peak = 0;
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    output += chunk;
    if (!ready && output.includes("READY ")) ready = true;
  });
  const sampler = setInterval(() => {
    if (ready && child.pid) peak = Math.max(peak, rssKilobytes(child.pid));
  }, 5);
  const exitCode = await new Promise<number>(
    (resolvePromise, rejectPromise) => {
      child.once("error", rejectPromise);
      child.once("exit", (code) =>
        code === null
          ? rejectPromise(new Error("upgrade benchmark worker was terminated"))
          : resolvePromise(code),
      );
    },
  ).finally(() => clearInterval(sampler));
  if (exitCode !== 0)
    throw new Error(`Upgrade benchmark worker exited with ${exitCode}.`);
  const lines = output.trim().split(/\r?\n/);
  const readyData = JSON.parse(lines[0]?.replace(/^READY /, "") ?? "{}") as {
    state_bytes: number;
  };
  const result = JSON.parse(lines[1] ?? "{}") as {
    elapsed_ms: number;
    drift_elapsed_ms: number;
    drift_entries: number;
    diffs: number;
    conflicts: number;
    conflict_messages?: string[];
  };
  return {
    elapsed_ms: result.elapsed_ms,
    drift_elapsed_ms: result.drift_elapsed_ms,
    drift_entries: result.drift_entries,
    plan_diffs: result.diffs,
    conflicts: result.conflicts,
    conflict_messages: result.conflict_messages ?? [],
    sampled_peak_rss_kb: peak,
    state_bytes: readyData.state_bytes,
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

async function runSuite(): Promise<void> {
  const results = [];
  for (const size of sizes) {
    if (!Number.isSafeInteger(size) || size <= 0 || size > 250_000)
      throw new Error(
        "Upgrade benchmark sizes must be between 1 and 250,000 managed files.",
      );
    const samples = [];
    for (let index = 0; index < warmup; index += 1) await sampleRun(size);
    for (let index = 0; index < repetitions; index += 1)
      samples.push(await sampleRun(size));
    results.push({
      files: size,
      state_bytes: samples[0]?.state_bytes ?? 0,
      repetitions: samples.length,
      drift_scan_ms: {
        p50: percentile(
          samples.map((item) => item.drift_elapsed_ms),
          0.5,
        ),
        p95: percentile(
          samples.map((item) => item.drift_elapsed_ms),
          0.95,
        ),
      },
      drift_entries: samples[0]?.drift_entries ?? 0,
      plan_latency_ms: {
        p50: percentile(
          samples.map((item) => item.elapsed_ms),
          0.5,
        ),
        p95: percentile(
          samples.map((item) => item.elapsed_ms),
          0.95,
        ),
      },
      sampled_peak_rss_kb: Math.max(
        ...samples.map((item) => item.sampled_peak_rss_kb),
      ),
      planned_diffs: samples[0]?.plan_diffs ?? 0,
      conflicts: samples.reduce((sum, item) => sum + item.conflicts, 0),
      conflict_messages: samples[0]?.conflict_messages ?? [],
    });
  }
  process.stdout.write(
    `${JSON.stringify({ implementation_commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), repository, node: process.version, platform: `${process.platform} ${process.arch}`, repetitions, warmup, fixture: "v2.0.0 manifest with real tracked fixture files; drift scan and plan only, no apply", measurement: "full managed-file SHA-256 drift scan and plan wall time; parent /proc VmRSS sampled every 5ms after fixture setup", results }, null, 2)}\n`,
  );
}

async function main(): Promise<void> {
  if (worker)
    await runWorker(Number(process.argv[process.argv.indexOf("--worker") + 1]));
  else await runSuite();
}

void main();
