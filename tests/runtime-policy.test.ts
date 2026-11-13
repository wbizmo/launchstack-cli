import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("supported Node runtime policy", () => {
  it("keeps package manifests and lockfiles on the tested 24/26 lines", () => {
    const policy = ">=24.22.3 <25 || >=26.13.1 <27";
    for (const path of ["package.json", "src/templates/api/package.json"]) {
      expect(JSON.parse(read(path)).engines.node).toBe(policy);
    }
    for (const path of ["package-lock.json", "src/templates/api/package-lock.json"]) {
      expect(JSON.parse(read(path)).packages[""].engines.node).toBe(policy);
    }
  });

  it("tests both supported Node lines and removes Node 20 from active builds", () => {
    for (const path of [".github/workflows/ci.yml", "src/templates/api/.github/workflows/ci.yml"]) {
      const workflow = read(path);
      expect(workflow).toContain("24.22.3");
      expect(workflow).toContain("26.13.1");
      expect(workflow).not.toMatch(/node-version:\s*20\b/);
    }

    const docker = ["Dockerfile", "src/templates/api/Dockerfile", "src/docker-assets.ts"]
      .map(read)
      .join("\n");
    expect(docker).toContain("node:24.22.3-alpine@sha256:");
    expect(docker).not.toContain("node:20-alpine");
    expect(docker).toContain("scripts/healthcheck.cjs");
  });
});
