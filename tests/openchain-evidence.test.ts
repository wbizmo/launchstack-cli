import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const evidence = require("../scripts/openchain-evidence.cjs");

describe("OpenChain evidence generator", () => {
  it("records production dependencies and excludes development-only packages", () => {
    const lock = {
      packages: {
        "": { name: "fixture", version: "1.0.0" },
        "node_modules/runtime": {
          version: "1.2.3",
          license: "MIT",
          resolved: "https://registry.npmjs.org/runtime/-/runtime-1.2.3.tgz",
          integrity: "sha512-YWJj",
        },
        "node_modules/dev-only": {
          version: "4.5.6",
          dev: true,
          license: "MIT",
          resolved: "https://registry.npmjs.org/dev-only/-/dev-only-4.5.6.tgz",
          integrity: "sha512-ZGVm",
        },
      },
    };

    const records = evidence.collectComponents(
      lock,
      "cli",
      "package-lock.json",
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      name: "runtime",
      version: "1.2.3",
      license: "MIT",
    });
  });

  it("derives nested and scoped package names", () => {
    expect(
      evidence.componentNameFromPath("node_modules/foo/node_modules/bar"),
    ).toBe("bar");
    expect(evidence.componentNameFromPath("node_modules/@scope/pkg")).toBe(
      "@scope/pkg",
    );
  });

  it("fails closed on incomplete production metadata", () => {
    const lock = {
      packages: {
        "node_modules/runtime": {
          version: "1.2.3",
          license: "MIT",
          resolved: "https://registry.npmjs.org/runtime/-/runtime-1.2.3.tgz",
        },
      },
    };
    expect(() =>
      evidence.collectComponents(lock, "cli", "package-lock.json"),
    ).toThrow(/Incomplete production component record/);
  });

  it("rejects non-registry production sources", () => {
    const lock = {
      packages: {
        "node_modules/runtime": {
          version: "1.2.3",
          license: "MIT",
          resolved: "https://example.com/runtime.tgz",
          integrity: "sha512-YWJj",
        },
      },
    };
    expect(() =>
      evidence.collectComponents(lock, "cli", "package-lock.json"),
    ).toThrow(/Unapproved production package source/);
  });

  it("builds deterministic notices", () => {
    const output = evidence.buildNotice(
      [
        {
          name: "b",
          version: "2.0.0",
          license: "Apache-2.0",
          resolved: "https://registry.npmjs.org/b/-/b-2.0.0.tgz",
        },
        {
          name: "a",
          version: "1.0.0",
          license: "MIT",
          resolved: "https://registry.npmjs.org/a/-/a-1.0.0.tgz",
        },
      ],
      "Third-party notices",
      "fixture scope",
    );
    expect(output.indexOf("| a |")).toBeLessThan(output.indexOf("| b |"));
    expect(output).toContain("Apache-2.0, MIT");
  });

  it("parses supported integrity metadata", () => {
    expect(evidence.parseIntegrity("sha512-YWJj")).toEqual({
      algorithm: "sha512",
      expected: "YWJj",
    });
  });
});
