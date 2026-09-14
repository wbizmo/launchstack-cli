import { mkdtempSync, mkdirSync, readdirSync, symlinkSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { createProjectManifest, parseProjectManifest, serializeProjectManifest } from "../src/project/manifest";
import { resolveProjectPath } from "../src/project/paths";
import { emptyProjectState } from "../src/project/types";
import { applyFileMutations } from "../src/project/transaction";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "launchstack-v3-project-"));
  writeFileSync(join(root, "launchstack.json"), serializeProjectManifest(createProjectManifest({ name: "fixture", templateVersion: "3.0.0" })));
  return root;
}

describe("v3 project lifecycle primitives", () => {
  test("rejects unknown managed manifest keys", () => {
    expect(() => parseProjectManifest({ ...createProjectManifest({ name: "fixture", templateVersion: "3.0.0" }), typo: true })).toThrow(/unrecognized|invalid/i);
  });

  test("rejects traversal and symbolic-link mutation targets", () => {
    const root = fixture();
    expect(() => resolveProjectPath(root, "../escape")).toThrow(/unsafe|escape/i);
    const outside = mkdtempSync(join(tmpdir(), "outside-"));
    symlinkSync(outside, join(root, "linked"), "dir");
    expect(() => resolveProjectPath(root, "linked/file.txt")).toThrow(/symbolic-link/i);
  });

  test("applies staged writes atomically and records hashes", () => {
    const root = fixture();
    const state = emptyProjectState("3.0.0", "3.0.0");
    const next = applyFileMutations({ projectDirectory: root, state, mutations: [{ type: "write", path: "src/managed.ts", content: "export const value = 1;\n", owner: "test", version: "1.0.0", expectedSha256: null }] });
    expect(readFileSync(join(root, "src/managed.ts"), "utf8")).toContain("value = 1");
    expect(next.managedFiles["src/managed.ts"]?.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  test("never expires a lock owned by a live process merely because it is old", () => {
    const root = fixture();
    mkdirSync(join(root, ".launchstack"), { recursive: true });
    writeFileSync(join(root, ".launchstack", "mutation.lock"), JSON.stringify({ pid: process.pid, createdAt: 0 }));
    expect(() => applyFileMutations({ projectDirectory: root, state: emptyProjectState("3.0.0", "3.0.0"), mutations: [] })).toThrow(/already running/i);
  });

  test("cleans staging directories when preflight validation fails", () => {
    const root = fixture();
    writeFileSync(join(root, "owned.txt"), "user data\n");
    expect(() => applyFileMutations({
      projectDirectory: root,
      state: emptyProjectState("3.0.0", "3.0.0"),
      mutations: [{ type: "write", path: "owned.txt", content: "replacement\n", owner: "test", version: "1.0.0", expectedSha256: null }]
    })).toThrow(/unmanaged file/i);
    const metadata = join(root, ".launchstack");
    expect(readdirSync(metadata).filter((name) => name.startsWith(".stage-") || name.startsWith(".backup-"))).toEqual([]);
  });
});
