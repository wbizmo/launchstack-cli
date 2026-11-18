import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/release-openchain-3.0.7.yml"),
  "utf8",
);

describe("LaunchStack 3.0.7 OpenChain release workflow", () => {
  it("is scoped to the exact one-time release branch and protected main commit", () => {
    expect(workflow).toContain("release/openchain-3.0.7");
    expect(workflow).toContain('MAIN_SHA="$(git rev-parse origin/main)"');
    expect(workflow).toContain('if [ "$GITHUB_SHA" != "$MAIN_SHA" ]; then');
    expect(workflow).toContain('if [ "$VERSION" != "3.0.7" ]; then');
  });

  it("qualifies the release and builds exact evidence for both supplied scopes", () => {
    expect(workflow).toContain("npm run release:check");
    expect(workflow).toContain(
      "node scripts/openchain-evidence.cjs --output openchain-evidence --archive-sources",
    );
    expect(workflow).toContain(
      "node scripts/openchain-template-sbom.cjs --output openchain-evidence/generated-api-template.cdx.json",
    );
    expect(workflow).toContain("launchstack-cli.cdx.json");
    expect(workflow).toContain("generated-api-template.cdx.json");
    const evidenceStep = workflow.split("      - name: Build exact OpenChain release evidence")[1]?.split("      - name: Check whether npm version")[0];
    expect(evidenceStep).toBeDefined();
    expect(evidenceStep.indexOf("node scripts/openchain-evidence.cjs")).toBeLessThan(evidenceStep.indexOf("node scripts/openchain-template-sbom.cjs"));
    expect(evidenceStep.indexOf("node scripts/openchain-template-sbom.cjs")).toBeLessThan(evidenceStep.indexOf("npm audit --omit=dev"));
    expect(evidenceStep.indexOf("npm audit --omit=dev")).toBeLessThan(evidenceStep.indexOf("npm pack --json"));
    expect(workflow).toContain("openchain-dispositions.cjs");
  });

  it("publishes only after evidence and attaches it to the GitHub release", () => {
    expect(workflow).toContain("npm publish --access public --provenance");
    expect(workflow.indexOf("      - name: Build exact OpenChain release evidence")).toBeLessThan(workflow.indexOf("      - name: Publish npm package with provenance"));
    expect(workflow).toContain(
      "gh release upload v3.0.7 launchstack-openchain-evidence-3.0.7.tar.gz --clobber",
    );
  });
});
