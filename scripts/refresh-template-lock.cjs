const { spawnSync } = require("node:child_process");
const {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const template = join(root, "src", "templates", "api");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const tempRoot = mkdtempSync(join(tmpdir(), "launchstack-template-lock-"));
const tempTemplate = join(tempRoot, "api");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe"
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed.\n${result.stdout || ""}\n${result.stderr || ""}`
    );
  }
}

try {
  cpSync(template, tempTemplate, { recursive: true });
  const packagePath = join(tempTemplate, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  packageJson.name = "launchstack-template-lock";
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  run(
    npm,
    ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"],
    tempTemplate
  );

  const lock = JSON.parse(
    readFileSync(join(tempTemplate, "package-lock.json"), "utf8")
  );
  lock.name = "{{PROJECT_NAME}}";
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].name = "{{PROJECT_NAME}}";
  }

  writeFileSync(
    join(template, "package-lock.json"),
    `${JSON.stringify(lock, null, 2)}\n`
  );
  console.log("Generated src/templates/api/package-lock.json");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
