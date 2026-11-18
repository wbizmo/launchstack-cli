const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, resolve } = require("node:path");

const PLACEHOLDER = "{{PROJECT_NAME}}";
const EVIDENCE_PROJECT_NAME = "launchstack-openchain-template-sbom";

function normalizeTemplateManifests(manifest, lock) {
  if (
    manifest.name !== PLACEHOLDER ||
    lock.name !== PLACEHOLDER ||
    lock.packages?.[""]?.name !== PLACEHOLDER ||
    manifest.version !== lock.version ||
    manifest.version !== lock.packages[""].version
  ) {
    throw new Error("Expected an unrendered LaunchStack template with matching lockfile");
  }
  return {
    manifest: { ...manifest, name: EVIDENCE_PROJECT_NAME },
    lock: {
      ...lock,
      name: EVIDENCE_PROJECT_NAME,
      packages: {
        ...lock.packages,
        "": { ...lock.packages[""], name: EVIDENCE_PROJECT_NAME },
      },
    },
  };
}

function command(args, cwd) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 24 * 1024 * 1024,
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      "Failed to build template SBOM: npm " +
        args.join(" ") +
        "\n" +
        (result.stderr || result.error?.message || result.stdout || ""),
    );
  }
  return result.stdout;
}

function generateTemplateSbom(output, root = resolve(__dirname, "..")) {
  if (!output) throw new Error("Specify --output <path> for the template SBOM");
  const template = join(root, "src", "templates", "api");
  const manifest = JSON.parse(readFileSync(join(template, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(join(template, "package-lock.json"), "utf8"));
  const normalized = normalizeTemplateManifests(manifest, lock);
  const temp = mkdtempSync(join(tmpdir(), "launchstack-openchain-template-"));
  try {
    writeFileSync(join(temp, "package.json"), JSON.stringify(normalized.manifest, null, 2) + "\n");
    writeFileSync(join(temp, "package-lock.json"), JSON.stringify(normalized.lock, null, 2) + "\n");
    command(["ci", "--ignore-scripts", "--no-audit", "--no-fund"], temp);
    const raw = command(["sbom", "--omit=dev", "--sbom-format=cyclonedx"], temp);
    const sbom = JSON.parse(raw);
    assert.equal(sbom.bomFormat, "CycloneDX");
    assert.ok(Array.isArray(sbom.components) && sbom.components.length > 0);
    const path = resolve(output);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, raw);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--output") {
    console.error("Usage: node scripts/openchain-template-sbom.cjs --output FILE");
    process.exitCode = 2;
  } else {
    generateTemplateSbom(args[1]);
  }
}

module.exports = { normalizeTemplateManifests, generateTemplateSbom };
