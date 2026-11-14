import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const template = resolve(process.cwd(), "src/templates/api/scripts");
function run(script: string, env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [resolve(template, script)], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("generated development database safeguards", () => {
  test("reset requires an explicit confirmation and rejects production", () => {
    const noConfirmation = run("dev-reset.cjs", {
      DATABASE_URL: "postgresql://user:pass@localhost/app",
    });
    expect(noConfirmation.status).not.toBe(0);
    expect(noConfirmation.stderr).toContain("LAUNCHSTACK_CONFIRM_DB_RESET=1");
    const production = run("dev-reset.cjs", {
      NODE_ENV: "production",
      LAUNCHSTACK_CONFIRM_DB_RESET: "1",
      DATABASE_URL: "postgresql://user:pass@localhost/app",
    });
    expect(production.status).not.toBe(0);
    expect(production.stderr).toContain("production");
  });
  test("reset and seed refuse remote databases", () => {
    const reset = run("dev-reset.cjs", {
      LAUNCHSTACK_CONFIRM_DB_RESET: "1",
      DATABASE_URL: "postgresql://user:pass@db.example/app",
    });
    expect(reset.status).not.toBe(0);
    expect(reset.stderr).toContain("non-loopback");
    const seed = run("dev-seed.cjs", {
      DATABASE_URL: "postgresql://user:pass@db.example/app",
      LAUNCHSTACK_SEED_EMAIL: "dev@example.test",
      LAUNCHSTACK_SEED_PASSWORD: "local-only-password",
    });
    expect(seed.status).not.toBe(0);
    expect(seed.stderr).toContain("non-loopback");
  });
  test("development migrations refuse production settings and non-local databases", () => {
    const production = run("dev-migrate.cjs", {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@localhost/app",
    });
    expect(production.status).not.toBe(0);
    expect(production.stderr).toContain("NODE_ENV=production");
    const remote = run("dev-migrate.cjs", {
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://user:pass@db.example/app",
    });
    expect(remote.status).not.toBe(0);
    expect(remote.stderr).toContain("loopback database");
  });
});

test("optional mock server exposes health and an explicit generic stub response", async () => {
  const child = spawn(process.execPath, [resolve(template, "dev-mock.cjs")], {
    env: { ...process.env, LAUNCHSTACK_MOCK_PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const address = await new Promise<string>((resolveAddress, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Mock server did not start.")),
        5000,
      );
      child.stdout.once("data", (chunk: Buffer) => {
        clearTimeout(timer);
        const match = /http:\/\/127\.0\.0\.1:(\d+)/.exec(chunk.toString());
        if (match?.[1]) resolveAddress(`http://127.0.0.1:${match[1]}`);
        else reject(new Error("Mock server did not report its address."));
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    const health = await fetch(`${address}/healthz`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({
      mode: "local-mock",
      status: "ok",
    });
    const response = await fetch(`${address}/mock/storage/upload`, {
      method: "POST",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      mock: true,
      service: "storage",
      note: expect.stringContaining("does not reproduce"),
    });
  } finally {
    child.kill("SIGTERM");
    await new Promise<void>((resolveExit) =>
      child.once("exit", () => resolveExit()),
    );
  }
});
