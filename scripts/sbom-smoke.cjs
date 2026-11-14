const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

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
