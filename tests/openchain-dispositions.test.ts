import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { buildDispositions } = require("../scripts/openchain-dispositions.cjs");

describe("OpenChain vulnerability dispositions", () => {
  it("records no-action evidence for components absent from a clean audit", () => {
    const result = buildDispositions(
      {
        components: [
          {
            scope: "launchstack-cli",
            name: "runtime",
            version: "1.0.0",
            license: "MIT"
          }
        ]
      },
      {
        "launchstack-cli": { vulnerabilities: {} }
      }
    );

    expect(result.findingCount).toBe(0);
    expect(result.dispositions[0].disposition).toBe(
      "no-action-required-at-release-validation"
    );
  });

  it("blocks components reported by the audit", () => {
    const result = buildDispositions(
      {
        components: [
          {
            scope: "launchstack-cli",
            name: "runtime",
            version: "1.0.0",
            license: "MIT"
          }
        ]
      },
      {
        "launchstack-cli": {
          vulnerabilities: {
            runtime: {
              severity: "high",
              via: [
                {
                  source: 123,
                  name: "runtime",
                  title: "fixture advisory",
                  severity: "high",
                  range: "<=1.0.0"
                }
              ]
            }
          }
        }
      }
    );

    expect(result.findingCount).toBe(1);
    expect(result.dispositions[0].disposition).toBe(
      "release-blocked-pending-remediation-or-reviewed-mitigation"
    );
  });
});
