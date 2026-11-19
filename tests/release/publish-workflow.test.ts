import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/publish.yml"),
  "utf8",
);

describe("npm publish workflow authorization", () => {
  it("runs only on a manually authorized dispatch from main", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("authorize_publication:");
    expect(workflow).toContain(
      "inputs.authorize_publication == true && github.ref == 'refs/heads/main'",
    );
    expect(workflow).not.toMatch(/^  push:/m);
    expect(workflow).not.toMatch(/^  release:/m);
    expect(workflow).toContain("environment: npm-publish");
  });

  it("validates a stable package version and its matching release notes", () => {
    expect(workflow).toContain(
      '[[ ! "$VERSION" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]',
    );
    expect(workflow).toContain('NOTES="RELEASE_NOTES_${VERSION}.md"');
    expect(workflow).not.toContain('VERSION" != "3.0.5"');
    expect(workflow).toContain("npm run release:check");
    expect(workflow).toContain("npm publish --access public --provenance");
    expect(workflow).toContain(
      'before.files = before.files.filter(path => path !== "docs/openchain")',
    );
    expect(workflow).toContain(
      "Package metadata changed beyond removal of obsolete documentation inclusion",
    );
  });

  it("generates a normalized template SBOM before the two audits and publication", () => {
    const evidenceStep = workflow
      .split("      - name: Build release evidence")[1]
      ?.split("      - name: Verify npm publish token")[0];
    expect(evidenceStep).toContain(
      "node scripts/openchain-template-sbom.cjs --output openchain-evidence/generated-api-template.cdx.json",
    );
    expect(workflow).not.toContain("docs/openchain/");
    expect(workflow).not.toContain("CONFORMANCE-DECLARATION");
    expect(
      evidenceStep.indexOf("node scripts/openchain-template-sbom.cjs"),
    ).toBeLessThan(evidenceStep.indexOf("npm audit --omit=dev"));
    expect(
      workflow.indexOf("      - name: Build release evidence"),
    ).toBeLessThan(workflow.indexOf("      - name: Publish package to npm"));
  });

  it("checks each NUL-delimited path changed after an existing tag", () => {
    expect(workflow).toContain("while IFS= read -r -d '' changed_path; do");
    expect(workflow).toContain(
      'git diff --no-renames --name-only -z "$TAG_SHA"',
    );
  });

  it("allows post-tag docs cleanup but rejects runtime changes", () => {
    const allowedPatterns = workflow
      .match(/case "\$changed_path" in\s*([^\n]+)\)/)?.[1]
      ?.trim()
      .split("|");

    expect(allowedPatterns).toBeDefined();
    for (const path of [
      "CODE_OF_CONDUCT.md",
      "CONTRIBUTING.md",
      "GOVERNANCE.md",
      "SECURITY.md",
      "tests/release/publish-workflow.test.ts",
    ]) {
      expect(allowedPatterns).toContain(path);
    }
    expect(allowedPatterns).not.toContain("src/*");
    expect(allowedPatterns).not.toContain("scripts/*");
    expect(workflow).toContain(
      'Change after ${RELEASE_TAG} is outside release documentation',
    );
  });
});
