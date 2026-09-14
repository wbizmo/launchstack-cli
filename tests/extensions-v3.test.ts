import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { applyExtensionInstall, planExtensionInstall, resolveExtensionOrder } from "../src/extensions/engine";
import { FIRST_PARTY_EXTENSIONS } from "../src/extensions/first-party";
import type { ExtensionManifest } from "../src/extensions/types";
import { createProjectManifest, serializeProjectManifest } from "../src/project/manifest";
import { emptyProjectState } from "../src/project/types";
import { serializeProjectState } from "../src/project/state";
function fixture(): string { const root = mkdtempSync(join(tmpdir(), "launchstack-v3-ext-")); mkdirSync(join(root, ".launchstack"), { recursive: true }); writeFileSync(join(root, "launchstack.json"), serializeProjectManifest(createProjectManifest({ name: "fixture", templateVersion: "3.0.0" }))); writeFileSync(join(root, ".launchstack", "state.json"), serializeProjectState(emptyProjectState("3.0.0", "3.0.0"))); writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0", dependencies: {}, devDependencies: {} }, null, 2) + "\n"); writeFileSync(join(root, ".env.example"), "DATABASE_URL=postgresql://localhost/test\n"); return root; }
describe("v3 extension engine", () => {
  test("resolves dependencies before dependents", () => { expect(resolveExtensionOrder(["queue"], FIRST_PARTY_EXTENSIONS).map((item) => item.id)).toEqual(["redis", "queue"]); });
  test("detects dependency cycles", () => { const a: ExtensionManifest = { schemaVersion: 1, id: "a", version: "1.0.0", kind: "plugin", displayName: "a", supportedLaunchStack: ">=2 <4", dependencies: ["b"] }; const b: ExtensionManifest = { ...a, id: "b", displayName: "b", dependencies: ["a"] }; expect(() => resolveExtensionOrder(["a"], { a, b })).toThrow(/cycle/i); });
  test("is idempotent after installation", () => { const root = fixture(); const first = planExtensionInstall({ projectDirectory: root, requested: ["queue"], registry: FIRST_PARTY_EXTENSIONS }); expect(first.noop).toBe(false); applyExtensionInstall(first); const second = planExtensionInstall({ projectDirectory: root, requested: ["queue"], registry: FIRST_PARTY_EXTENSIONS }); expect(second.noop).toBe(true); expect(second.actions).toEqual([]); });
});
