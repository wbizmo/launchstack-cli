const { spawnSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const node = process.execPath;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const temp = mkdtempSync(join(tmpdir(), "launchstack-template-smoke-"));
const project = join(temp, "smoke-api");
const databaseUrl =
  process.env.LAUNCHSTACK_SMOKE_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/launchstack_smoke";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }
}

try {
  run(node, [
    join(root, "dist", "cli.js"),
    "create",
    "smoke-api",
    "--directory",
    project,
    "--no-install"
  ]);

  run(npm, ["ci", "--no-audit", "--no-fund"], { cwd: project });

  const testEnvironment = {
    ...process.env,
    RUN_DATABASE_TESTS: "1",
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: "launchstack-ci-access-secret-that-is-at-least-32-characters",
    JWT_REFRESH_SECRET: "launchstack-ci-refresh-secret-that-is-at-least-32-characters"
  };

  run(
    npm,
    ["exec", "--", "prisma", "db", "push", "--skip-generate"],
    { cwd: project, env: testEnvironment }
  );
  run(npm, ["run", "check"], {
    cwd: project,
    env: testEnvironment
  });
  run(npm, ["audit", "--omit=dev", "--audit-level=high"], {
    cwd: project,
    env: testEnvironment
  });

  console.log("Generated project smoke tests passed.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
