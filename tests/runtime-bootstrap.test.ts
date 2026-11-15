import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const launcher = resolve(root, "bin", "launchstack.cjs");

function runWithUnsupportedRuntime(args: string[]) {
  const directory = mkdtempSync(join(tmpdir(), "launchstack-runtime-"));
  const preload = join(directory, "unsupported-node.cjs");
  writeFileSync(
    preload,
    'Object.defineProperty(process, "version", { value: "v20.18.0" });\n',
  );
  const result = spawnSync(
    process.execPath,
    ["--require", preload, launcher, ...args],
    { cwd: directory, encoding: "utf8" },
  );
  return { directory, result };
}

describe("published runtime bootstrap", () => {
  it("keeps exact version and help requests usable on unsupported Node", () => {
    const version = runWithUnsupportedRuntime(["--version"]);
    expect(version.result.status).toBe(0);
    expect(version.result.stdout.trim()).toBe(
      JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version,
    );
    rmSync(version.directory, { recursive: true, force: true });

    const help = runWithUnsupportedRuntime(["--help"]);
    expect(help.result.status).toBe(0);
    expect(help.result.stdout).toContain("Usage: launchstack <command>");
    rmSync(help.directory, { recursive: true, force: true });
  });

  it("blocks command arguments even when --help is consumed as an option value", () => {
    const run = runWithUnsupportedRuntime([
      "create",
      "my-api",
      "--directory",
      "--help",
      "--no-install",
    ]);
    expect(run.result.status).toBe(1);
    expect(run.result.stderr).toContain("requires Node.js");
    expect(run.result.stderr).toContain("Current runtime: v20.18.0");
    expect(() => readFileSync(join(run.directory, "--help"))).toThrow();
    rmSync(run.directory, { recursive: true, force: true });
  });
});
