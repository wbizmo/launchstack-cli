import { describe, expect, test } from "vitest";
import { parsePluginManifest } from "../src/extensions/plugins";
const base = { schemaVersion: 1 as const, id: "@vendor/example", version: "1.0.0", kind: "plugin" as const, displayName: "Example", supportedLaunchStack: ">=2 <4" };
describe("v3 plugin trust boundary", () => {
  test("rejects undeclared executable hooks unless explicitly acknowledged", () => { const manifest = { ...base, hooks: [{ name: "postinstall", command: "node hook.js" }] }; expect(() => parsePluginManifest(manifest)).toThrow(/executable hooks/i); expect(parsePluginManifest(manifest, true).hooks).toHaveLength(1); });
  test("rejects unknown manifest keys", () => { expect(() => parsePluginManifest({ ...base, surprise: true })).toThrow(/invalid/i); });
});
