import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { unsupportedRuntimeMessage } from "../src/runtime-policy";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("supported Node runtime policy", () => {
  it("rejects unsupported runtime commands with an actionable message", () => {
    expect(unsupportedRuntimeMessage("v20.19.0", ["create", "my-api"])).toMatch(
      /requires Node\.js.*Current runtime: v20\.19\.0.*Install a supported/,
    );
    expect(
      unsupportedRuntimeMessage("v20.19.0", ["--version"]),
    ).toBeUndefined();
    expect(unsupportedRuntimeMessage("v20.19.0", ["--help"])).toBeUndefined();
    expect(
      unsupportedRuntimeMessage("v20.19.0", [
        "create",
        "my-api",
        "--directory",
        "--help",
        "--no-install",
      ]),
    ).toMatch(/requires Node\.js/);
    expect(unsupportedRuntimeMessage("v20.19.0", ["create", "--help"])).toMatch(
      /requires Node\.js/,
    );
    expect(
      unsupportedRuntimeMessage("v24.22.1", ["create", "my-api"]),
    ).toBeUndefined();
    expect(
      unsupportedRuntimeMessage("v26.13.1", ["create", "my-api"]),
    ).toBeUndefined();
    expect(unsupportedRuntimeMessage("v24.21.9", ["create"])).toMatch(
      /requires Node\.js/,
    );
    expect(unsupportedRuntimeMessage("v26.12.9", ["create"])).toMatch(
      /requires Node\.js/,
    );
    expect(unsupportedRuntimeMessage("v24.22.0-alpha.1", ["create"])).toMatch(
      /requires Node\.js/,
    );
  });

  it("keeps package manifests and lockfiles on the tested 24/26 lines", () => {
    const policy = ">=24.22.0 <25 || >=26.13.0 <27";
    for (const path of ["package.json", "src/templates/api/package.json"]) {
      expect(JSON.parse(read(path)).engines.node).toBe(policy);
    }
    for (const path of [
      "package-lock.json",
      "src/templates/api/package-lock.json",
    ]) {
      expect(JSON.parse(read(path)).packages[""].engines.node).toBe(policy);
    }
  });

  it("tests both supported Node lines and removes Node 20 from active builds", () => {
    for (const path of [
      ".github/workflows/ci.yml",
      "src/templates/api/.github/workflows/ci.yml",
    ]) {
      const workflow = read(path);
      expect(workflow).toContain("24.22.3");
      expect(workflow).toContain("26.13.1");
      expect(workflow).not.toMatch(/node-version:\s*20\b/);
    }

    const docker = [
      "Dockerfile",
      "src/templates/api/Dockerfile",
      "src/docker-assets.ts",
    ]
      .map(read)
      .join("\n");
    expect(docker).toContain("node:24.22.3-alpine@sha256:");
    expect(docker).not.toContain("node:20-alpine");
    expect(docker).toContain("scripts/healthcheck.cjs");
  });
});
