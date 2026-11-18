const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const MAX_COMPONENTS = 1000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;

function componentNameFromPath(packagePath) {
  const marker = "node_modules/";
  const index = packagePath.lastIndexOf(marker);
  if (index < 0) return null;
  const tail = packagePath.slice(index + marker.length);
  const parts = tail.split("/");
  return parts[0].startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function collectComponents(lock, scope, lockfile) {
  const components = [];
  for (const [packagePath, entry] of Object.entries(lock.packages || {})) {
    if (!packagePath || !packagePath.includes("node_modules/")) continue;
    if (entry.dev === true || entry.link === true) continue;
    const name = componentNameFromPath(packagePath);
    if (
      !name ||
      !entry.version ||
      !entry.license ||
      !entry.resolved ||
      !entry.integrity
    ) {
      throw new Error(
        "Incomplete production component record: " + scope + ":" + packagePath,
      );
    }
    if (!entry.resolved.startsWith("https://registry.npmjs.org/")) {
      throw new Error(
        "Unapproved production package source: " + entry.resolved,
      );
    }
    components.push({
      scope,
      lockfile,
      path: packagePath,
      name,
      version: entry.version,
      license: entry.license,
      resolved: entry.resolved,
      integrity: entry.integrity,
      optional: entry.optional === true,
    });
  }
  if (components.length > MAX_COMPONENTS) {
    throw new Error(
      "Production component limit exceeded: " + components.length,
    );
  }
  return components.sort((a, b) =>
    (a.name + "@" + a.version + "|" + a.scope + "|" + a.path).localeCompare(
      b.name + "@" + b.version + "|" + b.scope + "|" + b.path,
    ),
  );
}

function buildNotice(components, title, scopeText) {
  const unique = new Map();
  for (const component of components) {
    const key = component.name + "@" + component.version;
    if (!unique.has(key)) unique.set(key, component);
  }
  const rows = [...unique.values()].sort((a, b) =>
    (a.name + "@" + a.version).localeCompare(b.name + "@" + b.version),
  );
  const licenses = [...new Set(rows.map((row) => row.license))].sort();
  let output = "# " + title + "\n\n";
  output +=
    "This release-time component register covers " + scopeText + ".\n\n";
  output +=
    "All production dependency license expressions in the reviewed lockfiles are permissive: " +
    licenses.join(", ") +
    ". No strong-copyleft, custom, or unknown production license expression was found.\n\n";
  output +=
    "The guarded release process archives the exact registry source tarballs identified by these lockfiles and verifies their Subresource Integrity values before publication. Third-party code remains governed by its upstream license and copyright notices.\n\n";
  output +=
    "| Package | Version | License | Registry source |\n| --- | --- | --- | --- |\n";
  for (const row of rows) {
    output +=
      "| " +
      row.name +
      " | " +
      row.version +
      " | " +
      row.license +
      " | " +
      row.resolved +
      " |\n";
  }
  output +=
    "\nOpen-source license/compliance inquiries: williams@zivoralabs.xyz.\n";
  return output;
}

function parseIntegrity(integrity) {
  const items = integrity.split(/\s+/);
  for (const item of items) {
    const dash = item.indexOf("-");
    if (dash < 1) continue;
    const algorithm = item.slice(0, dash);
    const expected = item.slice(dash + 1);
    if (
      ["sha512", "sha384", "sha256", "sha1"].includes(algorithm) &&
      expected
    ) {
      return { algorithm, expected };
    }
  }
  throw new Error("Unsupported integrity: " + integrity);
}

function fetchBuffer(url, redirects = 0) {
  if (redirects > 5)
    return Promise.reject(new Error("Too many redirects: " + url));
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 30000 }, (response) => {
      if (
        [301, 302, 303, 307, 308].includes(response.statusCode) &&
        response.headers.location
      ) {
        response.resume();
        const redirected = new URL(response.headers.location, url);
        if (redirected.protocol !== "https:") {
          reject(new Error("Non-HTTPS redirect refused"));
          return;
        }
        fetchBuffer(redirected.toString(), redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(
          new Error("Download failed " + response.statusCode + ": " + url),
        );
        return;
      }
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_FILE_BYTES) {
          request.destroy(
            new Error("Source archive member exceeds byte limit"),
          );
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
    request.on("timeout", () =>
      request.destroy(new Error("Download timeout: " + url)),
    );
    request.on("error", reject);
  });
}

async function archiveSources(components, outputDirectory) {
  const sourceDirectory = path.join(outputDirectory, "sources");
  fs.mkdirSync(sourceDirectory, { recursive: true });
  const unique = new Map();
  for (const component of components) {
    const key = component.name + "@" + component.version;
    if (!unique.has(key)) unique.set(key, component);
  }
  let totalBytes = 0;
  const manifest = [];
  const ordered = [...unique.values()].sort((a, b) =>
    (a.name + "@" + a.version).localeCompare(b.name + "@" + b.version),
  );
  for (const component of ordered) {
    const buffer = await fetchBuffer(component.resolved);
    totalBytes += buffer.length;
    if (totalBytes > MAX_TOTAL_BYTES)
      throw new Error("Source archive total byte limit exceeded");
    const parsed = parseIntegrity(component.integrity);
    const actual = crypto
      .createHash(parsed.algorithm)
      .update(buffer)
      .digest("base64");
    if (actual !== parsed.expected) {
      throw new Error(
        "Integrity mismatch for " + component.name + "@" + component.version,
      );
    }
    const filename =
      component.name.replace(/[^a-zA-Z0-9._-]+/g, "_") +
      "__" +
      component.version +
      ".tgz";
    fs.writeFileSync(path.join(sourceDirectory, filename), buffer, {
      mode: 0o644,
    });
    manifest.push({
      name: component.name,
      version: component.version,
      license: component.license,
      resolved: component.resolved,
      integrity: component.integrity,
      archivedFile: "sources/" + filename,
      size: buffer.length,
    });
  }
  fs.writeFileSync(
    path.join(outputDirectory, "source-archive-manifest.json"),
    JSON.stringify(
      { schemaVersion: 1, totalBytes, packages: manifest },
      null,
      2,
    ) + "\n",
  );
}

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    output: null,
    check: false,
    archiveSources: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") args.root = path.resolve(argv[++i]);
    else if (arg === "--output") args.output = path.resolve(argv[++i]);
    else if (arg === "--check") args.check = true;
    else if (arg === "--archive-sources") args.archiveSources = true;
    else throw new Error("Unknown argument: " + arg);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootLock = JSON.parse(
    fs.readFileSync(path.join(args.root, "package-lock.json"), "utf8"),
  );
  const templateLock = JSON.parse(
    fs.readFileSync(
      path.join(args.root, "src", "templates", "api", "package-lock.json"),
      "utf8",
    ),
  );
  const root = collectComponents(
    rootLock,
    "launchstack-cli",
    "package-lock.json",
  );
  const template = collectComponents(
    templateLock,
    "generated-api-template",
    "src/templates/api/package-lock.json",
  );
  const all = [...root, ...template];
  const rootNotice = buildNotice(
    all,
    "Third-party notices — LaunchStack CLI 3.0.7",
    "the CLI and generated API template production dependency graphs",
  );
  const templateNotice = buildNotice(
    template,
    "Third-party notices — generated API template 3.0.7",
    "the generated API template production dependency graph",
  );

  if (args.check) {
    const expectedRoot = fs.readFileSync(
      path.join(args.root, "THIRD_PARTY_NOTICES.md"),
      "utf8",
    );
    const expectedTemplate = fs.readFileSync(
      path.join(args.root, "src", "templates", "api", "THIRD_PARTY_NOTICES.md"),
      "utf8",
    );
    if (rootNotice !== expectedRoot)
      throw new Error("Root THIRD_PARTY_NOTICES.md is stale");
    if (templateNotice !== expectedTemplate)
      throw new Error("Template THIRD_PARTY_NOTICES.md is stale");
    console.log(
      "OpenChain component records validated: " + all.length + " records.",
    );
    return;
  }

  if (!args.output)
    throw new Error("--output is required unless --check is used");
  fs.mkdirSync(args.output, { recursive: true });
  const licenses = {};
  for (const component of all) {
    licenses[component.license] = (licenses[component.license] || 0) + 1;
  }
  fs.writeFileSync(
    path.join(args.output, "component-records.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedFor: "launchstack-cli@3.0.7",
        generatedAt: new Date().toISOString(),
        recordCount: all.length,
        licenseDistribution: licenses,
        components: all,
      },
      null,
      2,
    ) + "\n",
  );
  fs.writeFileSync(
    path.join(args.output, "THIRD_PARTY_NOTICES.md"),
    rootNotice,
  );
  fs.writeFileSync(
    path.join(args.output, "GENERATED_API_THIRD_PARTY_NOTICES.md"),
    templateNotice,
  );
  if (args.archiveSources) await archiveSources(all, args.output);
  console.log(
    "OpenChain evidence generated: " + all.length + " component records.",
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

module.exports = {
  archiveSources,
  buildNotice,
  collectComponents,
  componentNameFromPath,
  parseIntegrity,
};
