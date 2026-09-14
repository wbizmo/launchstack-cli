const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "..", "package.json"), "utf8")
);
const expectedTag = `v${packageJson.version}`;
const actualTag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME;

if (!actualTag) {
  console.error("RELEASE_TAG or GITHUB_REF_NAME is required to verify a release tag.");
  process.exit(1);
}

if (actualTag !== expectedTag) {
  console.error(
    `Release tag ${actualTag} does not match package version ${packageJson.version}. Expected ${expectedTag}.`
  );
  process.exit(1);
}

console.log(`Release tag verified: ${actualTag}`);
