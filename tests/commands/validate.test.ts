import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "../../src/config";
import {
  createProjectManifest,
  serializeProjectManifest,
} from "../../src/project/manifest";
import { validateProject } from "../../src/commands/validate";

describe("validate command project formats", () => {
  it("validates a generated v3 manifest", () => {
    const directory = mkdtempSync(join(tmpdir(), "launchstack-validate-v3-"));
    writeFileSync(
      join(directory, "launchstack.json"),
      serializeProjectManifest(
        createProjectManifest({ name: "fixture", templateVersion: "3.0.5" }),
      ),
    );

    expect(validateProject(directory)).toEqual({
      kind: "manifest",
      name: "fixture",
      templateVersion: "3.0.5",
      provider: "docker",
    });
  });

  it("continues to validate legacy configuration files", () => {
    const directory = mkdtempSync(join(tmpdir(), "launchstack-validate-v1-"));
    writeFileSync(
      join(directory, "launchstack.config.json"),
      JSON.stringify(createDefaultConfig("legacy-app")),
    );

    expect(validateProject(directory)).toEqual({
      kind: "config",
      appName: "legacy-app",
      provider: "custom",
      environment: "production",
    });
  });
});
