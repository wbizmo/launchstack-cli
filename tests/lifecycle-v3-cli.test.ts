import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";

const tsxCli = resolve(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const sourceCli = resolve(process.cwd(), "src", "cli.ts");

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, [tsxCli, sourceCli, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", LAUNCHSTACK_VERSION_OVERRIDE: "3.0.0" }
  });
}

function tempProject(): string {
  const directory = mkdtempSync(join(tmpdir(), "launchstack-v3-cli-"));
  writeFileSync(
    join(directory, "launchstack.json"),
    JSON.stringify(
      {
        $schema: "https://launchstack.dev/schemas/project-v1.json",
        schemaVersion: 1,
        project: { name: "fixture", templateVersion: "3.0.0" },
        capabilities: {},
        provider: { id: "docker" },
        stages: {}
      },
      null,
      2
    ) + "\n"
  );
  return directory;
}

describe("LaunchStack v3 CLI contract", () => {
  test("lists first-party capabilities", () => {
    const result = run(["add", "--list"], tempProject());
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("redis");
    expect(result.stdout).toContain("queue");
    expect(result.stdout).toContain("webhooks");
  });

  test("lists installed plugins as machine-readable JSON", () => {
    const result = run(["plugin", "list", "--json"], tempProject());
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([]);
  });

  test("plans manifest reconciliation without mutation", () => {
    const directory = tempProject();
    const before = readFileSync(join(directory, "launchstack.json"), "utf8");
    const result = run(["plan", "--json"], directory);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toHaveProperty("actions");
    expect(readFileSync(join(directory, "launchstack.json"), "utf8")).toBe(before);
  });

  test("emits a JSON production audit report", () => {
    const result = run(["audit", "--json"], tempProject());
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toHaveProperty("findings");
    expect(report).toHaveProperty("summary");
  });

  test("generates a deterministic TypeScript client from OpenAPI JSON", () => {
    const directory = tempProject();
    const schemaPath = join(directory, "openapi.json");
    const outputPath = join(directory, "sdk.ts");
    writeFileSync(schemaPath, JSON.stringify({ openapi: "3.1.0", info: { title: "Fixture", version: "1" }, paths: { "/health": { get: { operationId: "health", responses: { "200": { description: "ok" } } } } } }));
    const result = run(["client", "generate", "--schema", schemaPath, "--output", outputPath], directory);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readFileSync(outputPath, "utf8")).toContain("class LaunchStackClient");
  });

  test("dry-runs module generation without writing files", () => {
    const directory = tempProject();
    const result = run(["generate", "module", "billing", "--dry-run", "--json"], directory);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan.files.some((path: string) => path.includes("billing"))).toBe(true);
  });

  test("accepts stage-aware status", () => {
    const result = run(["status", "--stage", "pr-142", "--json"], tempProject());
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const status = JSON.parse(result.stdout);
    expect(status.stage).toBe("pr-142");
  });
});
