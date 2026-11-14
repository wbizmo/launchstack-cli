import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { applyExtensionInstall, planExtensionInstall, resolveExtensionOrder } from "../src/extensions/engine";
import { FIRST_PARTY_EXTENSIONS } from "../src/extensions/first-party";
import type { ExtensionManifest } from "../src/extensions/types";
import { createProjectManifest, serializeProjectManifest } from "../src/project/manifest";
import { emptyProjectState } from "../src/project/types";
import { loadProjectState, serializeProjectState } from "../src/project/state";
import { applyReconciliation, planReconciliation } from "../src/project/reconcile";
import { applyExtensionRemoval, planExtensionRemoval } from "../src/extensions/remove";
import { createDevPlan } from "../src/dev/orchestrator";
function fixture(): string { const root = mkdtempSync(join(tmpdir(), "launchstack-v3-ext-")); mkdirSync(join(root, ".launchstack"), { recursive: true }); writeFileSync(join(root, "launchstack.json"), serializeProjectManifest(createProjectManifest({ name: "fixture", templateVersion: "3.0.0" }))); writeFileSync(join(root, ".launchstack", "state.json"), serializeProjectState(emptyProjectState("3.0.0", "3.0.0"))); writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0", dependencies: {}, devDependencies: {} }, null, 2) + "\n"); writeFileSync(join(root, ".env.example"), "DATABASE_URL=postgresql://localhost/test\n"); return root; }
describe("v3 extension engine", () => {
  test("resolves dependencies before dependents", () => { expect(resolveExtensionOrder(["queue"], FIRST_PARTY_EXTENSIONS).map((item) => item.id)).toEqual(["redis", "queue"]); });
  test("detects dependency cycles", () => { const a: ExtensionManifest = { schemaVersion: 1, id: "a", version: "1.0.0", kind: "plugin", displayName: "a", supportedLaunchStack: ">=2 <4", dependencies: ["b"] }; const b: ExtensionManifest = { ...a, id: "b", displayName: "b", dependencies: ["a"] }; expect(() => resolveExtensionOrder(["a"], { a, b })).toThrow(/cycle/i); });
  test("is idempotent after installation and writes a lockfile in the same plan", () => { const root = fixture(); const first = planExtensionInstall({ projectDirectory: root, requested: ["queue"], registry: FIRST_PARTY_EXTENSIONS }); expect(first.noop).toBe(false); expect(first.mutations.map((item) => item.path)).toContain("package-lock.json"); applyExtensionInstall(first); expect(existsSync(join(root, "package-lock.json"))).toBe(true); expect(existsSync(join(root, "src/worker.ts"))).toBe(true); expect(readFileSync(join(root, "docker-compose.launchstack.yml"), "utf8")).toContain("redis:"); expect(readFileSync(join(root, "docker-compose.launchstack.yml"), "utf8")).toContain("${LAUNCHSTACK_REDIS_PORT:-6379}"); const plan = createDevPlan(root); expect(plan.services.find((item) => item.id === "redis")?.args).toContain("docker-compose.launchstack.yml"); const second = planExtensionInstall({ projectDirectory: root, requested: ["queue"], registry: FIRST_PARTY_EXTENSIONS }); expect(second.noop).toBe(true); expect(second.actions).toEqual([]); }, 15000);
  test("reconciles several desired capabilities in one package and state transaction", () => {
    const root = fixture();
    const manifest = createProjectManifest({ name: "fixture", templateVersion: "3.0.0" });
    manifest.capabilities.redis = { version: "1.0.0" };
    manifest.capabilities.queue = { version: "1.0.0" };
    writeFileSync(join(root, "launchstack.json"), serializeProjectManifest(manifest));
    expect(planReconciliation(root).installCapabilities).toEqual(["queue", "redis"]);

    const result = applyReconciliation({ projectDirectory: root });
    const state = loadProjectState(root);
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies: Record<string, string> };
    expect(result.installCapabilities).toEqual([]);
    expect(state.extensions.queue?.id).toBe("queue");
    expect(state.extensions.redis?.id).toBe("redis");
    expect(packageJson.dependencies.ioredis).toBeDefined();
    expect(packageJson.dependencies.bullmq).toBeDefined();
    expect(existsSync(join(root, "package-lock.json"))).toBe(true);
  });
  test("blocks dependency removal and removes generated scripts/files safely", () => {
    const root = fixture();
    applyExtensionInstall(planExtensionInstall({ projectDirectory: root, requested: ["queue"], registry: FIRST_PARTY_EXTENSIONS }));
    expect(() => planExtensionRemoval({ projectDirectory: root, extension: FIRST_PARTY_EXTENSIONS.redis!, registry: FIRST_PARTY_EXTENSIONS })).toThrow(/queue/);
    applyExtensionRemoval(planExtensionRemoval({ projectDirectory: root, extension: FIRST_PARTY_EXTENSIONS.queue!, registry: FIRST_PARTY_EXTENSIONS }));
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(packageJson.scripts.worker).toBeUndefined();
    expect(existsSync(join(root, "src/worker.ts"))).toBe(false);
    expect(readFileSync(join(root, "docker-compose.launchstack.yml"), "utf8")).toContain("redis:");
  });
  test("rejects a capability service that conflicts with the base Compose project", () => {
    const root = fixture();
    writeFileSync(join(root, "docker-compose.yml"), "services:\n  redis:\n    image: redis:7-alpine\n");
    const capability: ExtensionManifest = { schemaVersion: 1, id: "redis-custom", version: "1.0.0", kind: "capability", displayName: "conflicting redis", supportedLaunchStack: ">=3 <4", composeServices: { redis: { image: "redis:8-alpine" } } };
    expect(() => planExtensionInstall({ projectDirectory: root, requested: [capability.id], registry: { [capability.id]: capability } })).toThrow(/conflicts with docker-compose.yml/);
  });
});
