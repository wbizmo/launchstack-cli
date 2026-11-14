const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const worker = resolve(__dirname, "security-fuzz-worker.ts");
const tsx = require.resolve("tsx/cli");
const timeoutMs = 15_000;
const heapMiB = 128;
const result = spawnSync(
  process.execPath,
  [`--max-old-space-size=${heapMiB}`, tsx, worker],
  {
    cwd: root,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: "" },
  },
);

if (result.error || result.status !== 0) {
  throw new Error(
    `Bounded security fuzz run failed${result.error ? `: ${result.error.message}` : ` with exit code ${result.status}`}.\n${result.stdout ?? ""}${result.stderr ?? ""}`,
  );
}

process.stdout.write(result.stdout);
