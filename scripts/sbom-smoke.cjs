const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { generateTemplateSbom } = require("./openchain-template-sbom.cjs");

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(
  npm,
  ["sbom", "--omit=dev", "--sbom-format=cyclonedx"],
  { encoding: "utf8", env: process.env, maxBuffer: 8 * 1024 * 1024 },
);

if (result.error || result.status !== 0) {
  throw new Error(
    "npm sbom failed to generate the production dependency SBOM.",
  );
}

const sbom = JSON.parse(result.stdout);
assert.equal(sbom.bomFormat, "CycloneDX");
assert.ok(Array.isArray(sbom.components));
assert.ok(
  sbom.components.length > 0,
  "production dependency SBOM must contain components",
);

console.log(
  `Production CycloneDX SBOM validated (${sbom.components.length} components).`,
);

const temp = mkdtempSync(join(tmpdir(), "launchstack-template-sbom-check-"));
try {
  const output = join(temp, "generated-api-template.cdx.json");
  generateTemplateSbom(output);
  const templateSbom = JSON.parse(readFileSync(output, "utf8"));
  assert.equal(templateSbom.bomFormat, "CycloneDX");
  assert.ok(
    Array.isArray(templateSbom.components) &&
      templateSbom.components.length > 0,
    "generated API template must produce a nonempty CycloneDX SBOM",
  );
  console.log(
    `Generated API template CycloneDX SBOM validated (${templateSbom.components.length} components).`,
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
