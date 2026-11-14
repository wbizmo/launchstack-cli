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

  it("pins this authorization workflow to the reviewed package version", () => {
    expect(workflow).toContain('if [ "$VERSION" != "3.0.4" ]');
    expect(workflow).toContain("npm run release:check");
    expect(workflow).toContain("npm publish --access public --provenance");
  });
});
