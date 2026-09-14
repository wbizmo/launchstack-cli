const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const {
  mkdtempSync,
  readFileSync,
  rmSync
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const node = process.execPath;
const temp = mkdtempSync(join(tmpdir(), "launchstack-pack-smoke-"));
let tarball;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.stdio ?? "pipe"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed.\n${output}`);
  }

  return result;
}

try {
  const packageJson = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8")
  );
  const packed = run(npm, ["pack", "--json", "--silent"]);
  const packResult = JSON.parse(packed.stdout);
  tarball = join(root, packResult[0].filename);

  run(npm, ["init", "-y"], { cwd: temp });
  run(npm, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    tarball
  ], { cwd: temp });

  const cliPath = join(
    temp,
    "node_modules",
    "launchstack-cli",
    "dist",
    "cli.js"
  );
  const version = run(node, [cliPath, "--version"], { cwd: temp }).stdout.trim();
  assert.equal(version, packageJson.version, "packed CLI version must match package.json");

  const securitySmoke = `
const assert = require("node:assert/strict");
const { LaunchStackClient } = require("launchstack-cli");

assert.throws(
  () => new LaunchStackClient({ apiKey: "test", baseUrl: "http://api.example.com/v1" }),
  /HTTPS/
);
assert.throws(
  () => new LaunchStackClient({ apiKey: "test", baseUrl: "https://user:pass@api.example.com/v1" }),
  /embedded credentials/
);
assert.doesNotThrow(
  () => new LaunchStackClient({ apiKey: "test", baseUrl: "http://127.0.0.1:3000/v1" })
);

global.fetch = async () => ({
  status: 302,
  ok: false,
  json: async () => null
});

(async () => {
  const client = new LaunchStackClient({
    apiKey: "test",
    baseUrl: "https://api.example.com/v1"
  });
  await assert.rejects(client.listLaunches(), /redirects are refused/);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;

  run(node, ["-e", securitySmoke], { cwd: temp });
  console.log("Packed artifact smoke tests passed.");
} finally {
  if (tarball) {
    rmSync(tarball, { force: true });
  }
  rmSync(temp, { recursive: true, force: true });
}
