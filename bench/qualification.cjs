const { spawnSync } = require("node:child_process");
const { resolve, join } = require("node:path");
const os = require("node:os");

const root = resolve(__dirname, "..");
const node = process.execPath;
const environment = {
  ...process.env,
  NPM_CONFIG_CACHE: "/workspace/.npm-cache",
};
const suites = [
  {
    name: "cli_and_template",
    script: "bench/cli.ts",
    env: { LAUNCHSTACK_BENCH_REPETITIONS: "5" },
  },
  {
    name: "drift_scans",
    script: "bench/drift.ts",
    env: {
      LAUNCHSTACK_BENCH_SIZES: "1000,10000,50000,100000,250000",
      LAUNCHSTACK_BENCH_REPETITIONS: "3",
      LAUNCHSTACK_BENCH_WARMUPS: "1",
    },
  },
  { name: "extension_graphs", script: "bench/capabilities.ts", env: {} },
  { name: "complexity_and_hashing", script: "bench/complexity.ts", env: {} },
  {
    name: "mutations",
    script: "bench/mutations.ts",
    env: {
      LAUNCHSTACK_BENCH_SIZES: "100,1000,10000",
      LAUNCHSTACK_BENCH_WORKER_COUNT: "3",
    },
  },
  { name: "rollback_recovery", script: "bench/recovery.ts", env: {} },
  {
    name: "upgrade_planning",
    script: "bench/upgrades.ts",
    env: {
      LAUNCHSTACK_BENCH_SIZES: "100,1000,10000",
      LAUNCHSTACK_BENCH_WORKER_COUNT: "3",
      LAUNCHSTACK_BENCH_WARMUP_COUNT: "1",
    },
  },
  {
    name: "generated_api",
    script: "bench/generated-api.cjs",
    env: {
      LAUNCHSTACK_API_REQUESTS: "1000",
      LAUNCHSTACK_API_AUTH_CYCLES: "10",
    },
  },
];
function runSuite(suite) {
  const isJavaScript = suite.script.endsWith(".cjs");
  const args = isJavaScript
    ? [join(root, suite.script)]
    : ["--import", "tsx", join(root, suite.script)];
  const result = spawnSync(node, args, {
    cwd: root,
    env: { ...environment, ...suite.env },
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const detail = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.replace(
      /postgres(?:ql)?:\/\/[^\s]+/gi,
      "<database-url>",
    );
    throw new Error(
      `Benchmark suite ${suite.name} failed with exit ${result.status ?? "unknown"}: ${detail.slice(-3000)}`,
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`Benchmark suite ${suite.name} returned invalid JSON.`);
  }
}
function runBaseline(script, extraEnv) {
  const isJavaScript = script.endsWith(".cjs");
  const args = isJavaScript
    ? [join(root, script)]
    : ["--import", "tsx", join(root, script)];
  const result = spawnSync(node, args, {
    cwd: root,
    env: {
      ...environment,
      LAUNCHSTACK_BENCH_REPO: process.env.LAUNCHSTACK_BENCH_BASELINE_REPO,
      ...extraEnv,
    },
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `Baseline benchmark ${script} failed with exit ${result.status ?? "unknown"}.`,
    );
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`Baseline benchmark ${script} returned invalid JSON.`);
  }
}
try {
  const results = {};
  for (const suite of suites) results[suite.name] = runSuite(suite);
  let baselineComparison;
  if (process.env.LAUNCHSTACK_BENCH_BASELINE_REPO) {
    baselineComparison = {
      cli_and_template: runBaseline("bench/cli.ts", {
        LAUNCHSTACK_BENCH_REPETITIONS: "5",
      }),
      generated_api: runBaseline("bench/generated-api.cjs", {
        LAUNCHSTACK_API_REQUESTS: "1000",
        LAUNCHSTACK_API_AUTH_CYCLES: "10",
      }),
    };
  }
  const cpu = os.cpus()[0];
  process.stdout.write(
    `${JSON.stringify({ issue: 38, measured_at: new Date().toISOString(), implementation_commit: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(), baseline_comparison: baselineComparison, node: process.version, os: `${os.type()} ${os.release()} ${process.arch}`, cpu: cpu?.model, cpu_count: os.availableParallelism(), total_memory_bytes: os.totalmem(), npm_config_cache: environment.NPM_CONFIG_CACHE, suites: results }, null, 2)}\n`,
  );
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Release benchmark failed."}\n`,
  );
  process.exitCode = 1;
}
