import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { normalizeTemplateManifests } = require("../scripts/openchain-template-sbom.cjs");

const makeTemplate = () => ({
  manifest: {
    name: "{{PROJECT_NAME}}",
    version: "3.0.7",
    dependencies: { fastify: "^5.6.1" },
    scripts: { "docker:build": "docker build -t {{PROJECT_NAME}} ." },
  },
  lock: {
    name: "{{PROJECT_NAME}}",
    version: "3.0.7",
    packages: {
      "": { name: "{{PROJECT_NAME}}", version: "3.0.7" },
      "node_modules/fastify": {
        version: "5.6.1",
        license: "MIT",
        integrity: "sha512-abc",
      },
    },
  },
});

describe("OpenChain generated-template SBOM manifest normalization", () => {
  it("replaces only the unrendered package identity, keeping dependency and template source unchanged", () => {
    const original = makeTemplate();
    const normalized = normalizeTemplateManifests(original.manifest, original.lock);
    expect(normalized.manifest.name).toBe("launchstack-openchain-template-sbom");
    expect(normalized.lock.name).toBe("launchstack-openchain-template-sbom");
    expect(normalized.lock.packages[""].name).toBe("launchstack-openchain-template-sbom");
    expect(normalized.manifest.dependencies).toEqual(original.manifest.dependencies);
    expect(normalized.manifest.scripts["docker:build"]).toContain("{{PROJECT_NAME}}");
    expect(normalized.lock.packages["node_modules/fastify"]).toEqual(
      original.lock.packages["node_modules/fastify"],
    );
    expect(original.manifest.name).toBe("{{PROJECT_NAME}}");
    expect(original.lock.name).toBe("{{PROJECT_NAME}}");
  });

  it("rejects already-rendered or mismatched manifests rather than generating a misleading SBOM", () => {
    const original = makeTemplate();
    original.lock.packages[""].version = "9.9.9";
    expect(() =>
      normalizeTemplateManifests(original.manifest, original.lock),
    ).toThrow(/matching lockfile/);
    const mismatched = makeTemplate();
    mismatched.manifest.name = "not-the-placeholder";
    expect(() =>
      normalizeTemplateManifests(mismatched.manifest, mismatched.lock),
    ).toThrow(/unrendered LaunchStack template/);
  });
});
