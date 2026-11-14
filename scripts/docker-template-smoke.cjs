const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { createServer } = require("node:net");
const {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const node = process.execPath;
const docker = process.platform === "win32" ? "docker.exe" : "docker";
const temp = mkdtempSync(join(tmpdir(), "launchstack-docker-smoke-"));
const project = join(temp, "api");
const cliImage = `launchstack-cli-smoke:${randomUUID()}`;
const compose = [
  "compose",
  "-f",
  join(project, "docker-compose.yml"),
  "-f",
  join(project, "docker-compose.production.yml"),
];
const env = {
  ...process.env,
  CORS_ORIGIN: "https://smoke.example",
  JWT_ACCESS_SECRET: "launchstack-docker-smoke-access-secret-32-characters",
  JWT_REFRESH_SECRET: "launchstack-docker-smoke-refresh-secret-32-characters",
};
let phase = "initialization";

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
  return address.port;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: options.env ?? env,
    stdio: options.stdio ?? "pipe",
    timeout: options.timeoutMs ?? 600_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n")
      .replaceAll(env.JWT_ACCESS_SECRET, "[redacted]")
      .replaceAll(env.JWT_REFRESH_SECRET, "[redacted]");
    throw new Error(
      `${command} ${args.join(" ")} failed${result.error ? `: ${result.error.message}` : "."}\n${output}`,
    );
  }
  return result;
}

async function main() {
  try {
    phase = "create generated project";
    const port = await freePort();
    env.LAUNCHSTACK_API_PORT = String(port);
    run(node, [
      join(root, "dist", "cli.js"),
      "create",
      "docker-smoke",
      "--directory",
      project,
      "--no-install",
    ]);
    phase = "check Docker daemon";
    run(docker, ["info"], { stdio: "pipe", timeoutMs: 5_000 });
    phase = "build root CLI image";
    const caFile = process.env.NODE_EXTRA_CA_CERTS;
    const cliBuildArgs = ["build", "--tag", cliImage];
    if (caFile && existsSync(caFile))
      cliBuildArgs.push("--secret", `id=npmca,src=${caFile}`);
    cliBuildArgs.push(root);
    run(docker, cliBuildArgs, { cwd: root });
    phase = "check root CLI image";
    const expectedVersion = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ).version;
    const actualVersion = run(docker, [
      "run",
      "--rm",
      cliImage,
      "--version",
    ]).stdout.trim();
    assert.equal(actualVersion, expectedVersion);
    if (caFile && existsSync(caFile)) {
      const override = join(project, "docker-compose.smoke.yml");
      writeFileSync(
        override,
        [
          "services:",
          "  api:",
          "    build:",
          "      secrets:",
          "        - npmca",
          "secrets:",
          "  npmca:",
          `    file: ${JSON.stringify(caFile)}`,
          "",
        ].join("\n"),
      );
      compose.push("-f", override);
    }
    phase = "build and start generated production image";
    run(docker, [...compose, "up", "--detach", "--build", "--wait"], {
      cwd: project,
    });

    phase = "check generated API health";
    const health = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(
      health.status,
      200,
      "production image health endpoint must respond",
    );
    phase = "check PostgreSQL readiness";
    const ready = await fetch(`http://127.0.0.1:${port}/ready`, {
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(
      ready.status,
      200,
      "generated API must reach database readiness",
    );
    const readiness = await ready.json();
    assert.equal(readiness.database, "connected");
    console.log(
      "Generated production Docker image passed health and PostgreSQL readiness checks.",
    );
  } finally {
    try {
      run(docker, ["image", "rm", "--force", cliImage], {
        stdio: "pipe",
        timeoutMs: 30_000,
      });
    } catch {
      // Preserve the primary smoke failure when Docker image cleanup fails.
    }
    try {
      run(docker, [...compose, "down", "--volumes", "--remove-orphans"], {
        cwd: project,
        stdio: "pipe",
        timeoutMs: 5_000,
      });
    } catch {
      // Cleanup can fail when Docker itself is unavailable; the primary error is retained.
    }
    rmSync(temp, { recursive: true, force: true });
  }
}

main().catch(() => {
  // Child-process errors may include values inherited from the environment.
  console.error(
    `Docker smoke failed during ${phase}; details are suppressed to protect secrets.`,
  );
  process.exitCode = 1;
});
