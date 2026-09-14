#!/usr/bin/env node
import {
  generateProject,
  installDependencies
} from "./chunk-TSEGMBRD.mjs";

// src/cli.ts
import { Command as Command14 } from "commander";

// src/commands/create.ts
import { existsSync } from "fs";
import { relative, resolve } from "path";
import { Command } from "commander";
var createCommand = new Command("create").description("Create a new backend API project").argument("<project-name>", "Name of the project to create").option(
  "-d, --directory <path>",
  "Directory where the project should be created"
).option("-f, --force", "Allow replacing a non-empty destination after staging succeeds").option("--no-install", "Skip dependency installation").action((projectName, options) => {
  try {
    const destinationDirectory = options.directory ? resolve(options.directory) : resolve(process.cwd(), projectName);
    const destinationAlreadyExists = existsSync(destinationDirectory);
    console.log(`Creating ${projectName}...`);
    const generatedDirectory = generateProject({
      projectName,
      destinationDirectory,
      template: "api",
      overwrite: options.force ?? false
    });
    console.log(`Project files created in ${generatedDirectory}`);
    if (options.install) {
      console.log("Installing dependencies...");
      installDependencies(generatedDirectory);
      console.log("Dependencies installed");
    }
    console.log("");
    console.log("Project created successfully");
    console.log("");
    console.log("Next steps:");
    if (!destinationAlreadyExists || destinationDirectory !== process.cwd()) {
      const relativeDestination = relative(process.cwd(), destinationDirectory) || ".";
      console.log(`  cd ${relativeDestination}`);
    }
    if (!options.install) {
      console.log("  npm install");
    }
    console.log("  npm run dev");
  } catch (error) {
    console.error("Project creation failed");
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exitCode = 1;
  }
});

// src/commands/doctor.ts
import { Command as Command2 } from "commander";

// src/release/doctor.ts
import {
  existsSync as existsSync2,
  readFileSync
} from "fs";
import { resolve as resolve2 } from "path";
function checkFile(projectDirectory, file, label) {
  const path = resolve2(projectDirectory, file);
  const passed = existsSync2(path);
  return {
    name: label,
    passed,
    detail: passed ? `${file} found` : `${file} is missing`
  };
}
function checkPackageScripts(projectDirectory) {
  const packagePath = resolve2(
    projectDirectory,
    "package.json"
  );
  if (!existsSync2(packagePath)) {
    return {
      name: "Package scripts",
      passed: false,
      detail: "package.json is missing"
    };
  }
  const packageJson = JSON.parse(
    readFileSync(packagePath, "utf8")
  );
  const requiredScripts = [
    "dev",
    "build",
    "start",
    "test",
    "typecheck",
    "prisma:generate",
    "prisma:migrate",
    "prisma:deploy"
  ];
  const missingScripts = requiredScripts.filter(
    (script) => !packageJson.scripts?.[script]
  );
  return {
    name: "Package scripts",
    passed: missingScripts.length === 0,
    detail: missingScripts.length === 0 ? "Required scripts are present" : `Missing scripts: ${missingScripts.join(", ")}`
  };
}
function checkEnvironmentExample(projectDirectory) {
  const path = resolve2(
    projectDirectory,
    ".env.example"
  );
  if (!existsSync2(path)) {
    return {
      name: "Environment example",
      passed: false,
      detail: ".env.example is missing"
    };
  }
  const content = readFileSync(path, "utf8");
  const requiredVariables = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET"
  ];
  const missingVariables = requiredVariables.filter(
    (variable) => !content.includes(`${variable}=`)
  );
  return {
    name: "Environment example",
    passed: missingVariables.length === 0,
    detail: missingVariables.length === 0 ? "Required environment variables are documented" : `Missing variables: ${missingVariables.join(", ")}`
  };
}
function runDoctor(projectDirectory = process.cwd()) {
  const checks = [
    checkFile(
      projectDirectory,
      "package.json",
      "Package manifest"
    ),
    checkFile(
      projectDirectory,
      "tsconfig.json",
      "TypeScript configuration"
    ),
    checkFile(
      projectDirectory,
      "prisma/schema.prisma",
      "Prisma schema"
    ),
    checkFile(
      projectDirectory,
      "src/app.ts",
      "Fastify application"
    ),
    checkFile(
      projectDirectory,
      "src/server.ts",
      "Server entrypoint"
    ),
    checkFile(
      projectDirectory,
      "Dockerfile",
      "Dockerfile"
    ),
    checkFile(
      projectDirectory,
      "docker-compose.yml",
      "Docker Compose"
    ),
    checkFile(
      projectDirectory,
      ".github/workflows/ci.yml",
      "CI workflow"
    ),
    checkPackageScripts(projectDirectory),
    checkEnvironmentExample(projectDirectory)
  ];
  return {
    healthy: checks.every((check) => check.passed),
    projectDirectory: resolve2(projectDirectory),
    checks
  };
}

// src/commands/doctor.ts
var doctorCommand = new Command2("doctor").description(
  "Inspect a generated LaunchStack project for missing production files and configuration"
).option(
  "-d, --directory <path>",
  "Project directory to inspect"
).option(
  "--json",
  "Print the doctor report as JSON"
).action((options) => {
  const report = runDoctor(
    options.directory ?? process.cwd()
  );
  if (options.json) {
    console.log(
      JSON.stringify(report, null, 2)
    );
    process.exitCode = report.healthy ? 0 : 1;
    return;
  }
  console.log(
    `LaunchStack doctor: ${report.projectDirectory}`
  );
  console.log("");
  for (const check of report.checks) {
    const marker = check.passed ? "PASS" : "FAIL";
    console.log(
      `${marker}  ${check.name}: ${check.detail}`
    );
  }
  console.log("");
  if (report.healthy) {
    console.log(
      "Project health check passed."
    );
  } else {
    console.error(
      "Project health check failed."
    );
    process.exitCode = 1;
  }
});

// src/commands/deploy.ts
import { execSync } from "child_process";
import { Command as Command3 } from "commander";

// src/config.ts
import { existsSync as existsSync4, readFileSync as readFileSync3 } from "fs";
import { resolve as resolve3 } from "path";
import { z } from "zod";

// src/providers.ts
var PROVIDER_IDS = [
  "vercel",
  "netlify",
  "render",
  "railway",
  "fly",
  "docker",
  "custom"
];
var PROVIDERS = {
  vercel: {
    id: "vercel",
    label: "Vercel",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  },
  netlify: {
    id: "netlify",
    label: "Netlify",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  },
  render: {
    id: "render",
    label: "Render",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  railway: {
    id: "railway",
    label: "Railway",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  fly: {
    id: "fly",
    label: "Fly.io",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  docker: {
    id: "docker",
    label: "Docker",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  custom: {
    id: "custom",
    label: "Custom",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  }
};
function isProviderId(value) {
  return PROVIDER_IDS.includes(value);
}
function providerHelpText() {
  return PROVIDER_IDS.join(", ");
}

// src/storage.ts
import {
  chmodSync,
  existsSync as existsSync3,
  mkdirSync,
  readFileSync as readFileSync2,
  renameSync,
  rmSync,
  writeFileSync
} from "fs";
import { basename, dirname, join } from "path";
import { randomUUID } from "crypto";
function atomicWriteText(path, content, mode) {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true });
  const temporaryPath = join(
    directory,
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`
  );
  try {
    writeFileSync(temporaryPath, content, {
      encoding: "utf8",
      flag: "wx",
      ...mode === void 0 ? {} : { mode }
    });
    if (mode !== void 0) {
      chmodSync(temporaryPath, mode);
    }
    renameSync(temporaryPath, path);
    if (mode !== void 0) {
      chmodSync(path, mode);
    }
  } finally {
    if (existsSync3(temporaryPath)) {
      rmSync(temporaryPath, { force: true });
    }
  }
}
function readJsonFile(path, fallback) {
  if (!existsSync3(path)) {
    return fallback;
  }
  try {
    return JSON.parse(readFileSync2(path, "utf8"));
  } catch {
    throw new Error(`Invalid JSON in ${basename(path)}.`);
  }
}

// src/config.ts
var CONFIG_FILE_NAME = "launchstack.config.json";
var launchStackConfigSchema = z.object({
  appName: z.string().min(1),
  environment: z.enum(["development", "staging", "production"]),
  provider: z.enum(PROVIDER_IDS),
  buildCommand: z.string().min(1),
  outputDirectory: z.string().min(1),
  deployTarget: z.string().min(1)
});
function getConfigPath() {
  return resolve3(process.cwd(), CONFIG_FILE_NAME);
}
function configExists() {
  return existsSync4(getConfigPath());
}
function createDefaultConfig(appName) {
  return {
    appName,
    environment: "production",
    provider: "custom",
    buildCommand: "npm run build",
    outputDirectory: "dist",
    deployTarget: "https://example.com"
  };
}
function writeConfig(config) {
  const validated = launchStackConfigSchema.parse(config);
  atomicWriteText(
    getConfigPath(),
    `${JSON.stringify(validated, null, 2)}
`
  );
}
function readConfig() {
  const raw = readFileSync3(getConfigPath(), "utf-8");
  const parsed = JSON.parse(raw);
  return launchStackConfigSchema.parse(parsed);
}

// src/deployment.ts
import {
  existsSync as existsSync5,
  statSync
} from "fs";
import {
  isAbsolute,
  relative as relative2,
  resolve as resolve4
} from "path";
function resolveVerifiedOutputDirectory(projectDirectory, configuredOutputDirectory) {
  const projectRoot = resolve4(projectDirectory);
  const outputPath = resolve4(projectRoot, configuredOutputDirectory);
  const relativePath = relative2(projectRoot, outputPath);
  if (relativePath === ".." || relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(relativePath)) {
    throw new Error(
      "Configured output directory must stay inside the project directory."
    );
  }
  if (!existsSync5(outputPath)) {
    throw new Error(
      `Output directory not found: ${configuredOutputDirectory}`
    );
  }
  if (!statSync(outputPath).isDirectory()) {
    throw new Error(
      `Configured output path is not a directory: ${configuredOutputDirectory}`
    );
  }
  return outputPath;
}

// src/git.ts
import { execFileSync } from "child_process";
function run(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}
function getGitMetadata(cwd = process.cwd()) {
  try {
    const status = run(
      ["status", "--porcelain=v2", "--branch"],
      cwd
    );
    const lines = status.split("\n").filter(Boolean);
    const branch = lines.find((line) => line.startsWith("# branch.head "))?.slice("# branch.head ".length);
    const commitHash = lines.find((line) => line.startsWith("# branch.oid "))?.slice("# branch.oid ".length);
    if (!commitHash || commitHash === "(initial)") {
      return null;
    }
    const commitMessage = run(
      ["log", "-1", "--pretty=%B"],
      cwd
    );
    return {
      branch: !branch || branch === "(detached)" ? "HEAD" : branch,
      commitHash,
      commitMessage,
      dirty: lines.some((line) => !line.startsWith("# "))
    };
  } catch {
    return null;
  }
}

// src/history.ts
import { resolve as resolve5 } from "path";
var STORE_DIR = ".launchstack";
var HISTORY_FILE = "history.json";
function getHistoryPath(projectDirectory = process.cwd()) {
  return resolve5(
    projectDirectory,
    STORE_DIR,
    HISTORY_FILE
  );
}
function readHistory(projectDirectory = process.cwd()) {
  const records = readJsonFile(
    getHistoryPath(projectDirectory),
    []
  );
  if (!Array.isArray(records)) {
    throw new Error("history.json must contain a JSON array.");
  }
  return records;
}
function writeHistory(records, projectDirectory = process.cwd()) {
  atomicWriteText(
    getHistoryPath(projectDirectory),
    `${JSON.stringify(records, null, 2)}
`
  );
}
function addDeploymentRecord(record, projectDirectory = process.cwd()) {
  const records = readHistory(projectDirectory);
  records.unshift(record);
  writeHistory(records.slice(0, 50), projectDirectory);
}

// src/commands/deploy.ts
var deployCommand = new Command3("deploy").description("Build and prepare the configured deployment artifacts").option("--skip-build", "Skip the build command").action((options) => {
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const config = readConfig();
    const git = getGitMetadata();
    const provider = PROVIDERS[config.provider];
    console.log("LaunchStack deployment preparation");
    console.log(`App: ${config.appName}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Provider: ${provider.label}`);
    if (git) {
      console.log(`Branch: ${git.branch}`);
      console.log(`Commit: ${git.commitHash.slice(0, 7)}`);
      if (git.dirty) {
        console.log("Working tree has uncommitted changes");
      }
    }
    console.log("");
    if (!options.skipBuild) {
      console.log(`Running trusted project build command: ${config.buildCommand}`);
      execSync(config.buildCommand, {
        stdio: "inherit",
        cwd: process.cwd()
      });
    }
    resolveVerifiedOutputDirectory(
      process.cwd(),
      config.outputDirectory
    );
    addDeploymentRecord({
      id: `dep_${Date.now()}`,
      appName: config.appName,
      environment: config.environment,
      provider: config.provider,
      deployTarget: config.deployTarget,
      outputDirectory: config.outputDirectory,
      status: "prepared",
      createdAt,
      git
    });
    console.log("");
    console.log("Build output verified");
    console.log(`Deploy target: ${config.deployTarget}`);
    console.log("");
    if (provider.remoteDeploymentSupported) {
      console.log("Deployment provider confirmed the remote deployment.");
    } else {
      console.log(
        "Artifacts are prepared. LaunchStack has not performed or confirmed a remote deployment for this provider."
      );
    }
  } catch (error) {
    console.log("Deployment preparation failed");
    console.log(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
});

// src/commands/docker.ts
import { existsSync as existsSync6, writeFileSync as writeFileSync2 } from "fs";
import { Command as Command4 } from "commander";
function writeFileIfAllowed(path, content, force) {
  if (existsSync6(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }
  writeFileSync2(path, content);
  console.log(`Created ${path}`);
}
var dockerCommand = new Command4("docker").description("Generate Docker deployment files");
dockerCommand.command("init").description("Create hardened Dockerfile, .dockerignore, and docker-compose.yml").option("-f, --force", "Overwrite existing Docker files").action((options) => {
  const config = readConfig();
  const force = Boolean(options.force);
  const dockerfile = `FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM dependencies AS build
COPY . .
RUN ${config.buildCommand}

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \\
  && npm cache clean --force
COPY --from=build /app/${config.outputDirectory} ./${config.outputDirectory}
USER node
EXPOSE 3000
CMD ["npm", "start"]
`;
  const dockerignore = `node_modules
dist
.git
.env
.launchstack
npm-debug.log
`;
  const compose = `services:
  ${config.appName}:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: ${config.environment}
`;
  writeFileIfAllowed("Dockerfile", dockerfile, force);
  writeFileIfAllowed(".dockerignore", dockerignore, force);
  writeFileIfAllowed("docker-compose.yml", compose, force);
});

// src/commands/env.ts
import { Command as Command5 } from "commander";
var allowedEnvironments = ["development", "staging", "production"];
var envCommand = new Command5("env").description("View or update the LaunchStack environment").argument("[environment]", "development, staging, or production").action((environment) => {
  try {
    const config = readConfig();
    if (!environment) {
      console.log(`Current environment: ${config.environment}`);
      return;
    }
    if (!allowedEnvironments.includes(environment)) {
      console.log("Invalid environment. Use development, staging, or production.");
      process.exit(1);
    }
    config.environment = environment;
    writeConfig(config);
    console.log(`Environment updated to ${config.environment}`);
  } catch (error) {
    console.log("Could not update environment");
    if (error instanceof Error) {
      console.log(error.message);
    }
    process.exit(1);
  }
});

// src/commands/github.ts
import { existsSync as existsSync7, mkdirSync as mkdirSync2 } from "fs";
import { dirname as dirname2 } from "path";
import { Command as Command6 } from "commander";
function writeWorkflowFile(path, content, force) {
  if (existsSync7(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }
  mkdirSync2(dirname2(path), { recursive: true });
  atomicWriteText(path, content);
  console.log(`Created ${path}`);
}
var githubCommand = new Command6("github").description("Generate GitHub Actions workflows");
githubCommand.command("init").description("Create a lockfile-first CI workflow").option("-f, --force", "Overwrite existing workflow").action((options) => {
  const config = readConfig();
  const workflow = `name: CI

on:
  push:
    branches:
      - main
  pull_request:

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run project checks when available
        run: npm run check --if-present

      - name: Build project
        run: ${config.buildCommand}
`;
  writeWorkflowFile(
    ".github/workflows/ci.yml",
    workflow,
    Boolean(options.force)
  );
});

// src/commands/history.ts
import { Command as Command7 } from "commander";
var historyCommand = new Command7("history").description("Show recent LaunchStack deployments").option("-l, --limit <number>", "Number of records to show", "10").action((options) => {
  const records = readHistory();
  const limit = Number(options.limit);
  if (records.length === 0) {
    console.log("No deployment history found");
    return;
  }
  records.slice(0, limit).forEach((record) => {
    console.log(`${record.id}`);
    console.log(`App: ${record.appName}`);
    console.log(`Environment: ${record.environment}`);
    console.log(`Provider: ${record.provider}`);
    console.log(`Status: ${record.status}`);
    console.log(`Created: ${record.createdAt}`);
    if (record.git) {
      console.log(`Branch: ${record.git.branch}`);
      console.log(`Commit: ${record.git.commitHash.slice(0, 7)}`);
      console.log(`Dirty: ${record.git.dirty ? "yes" : "no"}`);
    }
    console.log("");
  });
});

// src/commands/init.ts
import { Command as Command8 } from "commander";
var initCommand = new Command8("init").description("Create a LaunchStack config file").option("-n, --name <name>", "Project name").option("-f, --force", "Overwrite existing config file").action((options) => {
  if (configExists() && !options.force) {
    console.log("launchstack.config.json already exists. Use --force to overwrite.");
    return;
  }
  const appName = options.name || "my-app";
  const config = createDefaultConfig(appName);
  writeConfig(config);
  console.log("Created launchstack.config.json");
});

// src/commands/provider.ts
import { Command as Command9 } from "commander";
var providerCommand = new Command9("provider").description("View or update the LaunchStack deployment provider").argument("[provider]", providerHelpText()).action((provider) => {
  try {
    const config = readConfig();
    if (!provider) {
      const definition = PROVIDERS[config.provider];
      console.log(`Current provider: ${definition.label} (${definition.id})`);
      console.log(
        definition.remoteDeploymentSupported ? "Remote deployment is supported by LaunchStack." : "LaunchStack currently prepares artifacts/presets for this provider; it does not perform the remote deployment."
      );
      return;
    }
    if (!isProviderId(provider)) {
      console.log(`Invalid provider. Use ${providerHelpText()}.`);
      process.exitCode = 1;
      return;
    }
    config.provider = provider;
    writeConfig(config);
    console.log(`Provider updated to ${PROVIDERS[provider].label}`);
  } catch (error) {
    console.log("Could not update provider");
    if (error instanceof Error) {
      console.log(error.message);
    }
    process.exitCode = 1;
  }
});

// src/commands/rollback.ts
import { Command as Command10 } from "commander";
var rollbackCommand = new Command10("rollback").description("Show the latest successful deployment available for rollback").action(() => {
  const records = readHistory();
  const latestSuccess = records.find((record) => record.status === "success");
  if (!latestSuccess) {
    console.log("No successful deployment found for rollback");
    return;
  }
  console.log("Rollback target found");
  console.log(`Deployment: ${latestSuccess.id}`);
  console.log(`App: ${latestSuccess.appName}`);
  console.log(`Environment: ${latestSuccess.environment}`);
  console.log(`Provider: ${latestSuccess.provider}`);
  console.log(`Deploy target: ${latestSuccess.deployTarget}`);
  console.log(`Created: ${latestSuccess.createdAt}`);
});

// src/commands/secrets.ts
import { Command as Command11 } from "commander";

// src/secrets-store.ts
import { existsSync as existsSync8, mkdirSync as mkdirSync3 } from "fs";
import { resolve as resolve6 } from "path";
var STORE_DIR2 = ".launchstack";
var SECRETS_FILE = "secrets.json";
var SECRET_MODE = 384;
var RESERVED_KEYS = /* @__PURE__ */ new Set([
  "__proto__",
  "constructor",
  "prototype"
]);
function getSecretsPath(projectDirectory = process.cwd()) {
  return resolve6(
    projectDirectory,
    STORE_DIR2,
    SECRETS_FILE
  );
}
function validateSecretKey(key) {
  const normalized = key.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(normalized) || RESERVED_KEYS.has(normalized)) {
    throw new Error(
      "Secret keys must start with a letter or underscore, contain only letters, numbers, underscores, dots, or hyphens, and must not use reserved object keys."
    );
  }
  return normalized;
}
function readSecrets(projectDirectory = process.cwd()) {
  const path = getSecretsPath(projectDirectory);
  const parsed = readJsonFile(path, {});
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("secrets.json must contain a JSON object.");
  }
  const secrets = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of Object.entries(parsed)) {
    validateSecretKey(key);
    if (typeof value !== "string") {
      throw new Error("secrets.json contains a non-string secret value.");
    }
    secrets[key] = value;
  }
  return secrets;
}
function writeSecrets(secrets, projectDirectory = process.cwd()) {
  const storeDirectory = resolve6(projectDirectory, STORE_DIR2);
  mkdirSync3(storeDirectory, { recursive: true });
  atomicWriteText(
    getSecretsPath(projectDirectory),
    `${JSON.stringify(secrets, null, 2)}
`,
    SECRET_MODE
  );
}
function setSecret(key, value, projectDirectory = process.cwd()) {
  const normalizedKey = validateSecretKey(key);
  if (value.length === 0) {
    throw new Error("Secret value must not be empty.");
  }
  const secrets = readSecrets(projectDirectory);
  secrets[normalizedKey] = value;
  writeSecrets(secrets, projectDirectory);
}
function removeSecret(key, projectDirectory = process.cwd()) {
  const normalizedKey = validateSecretKey(key);
  const secrets = readSecrets(projectDirectory);
  if (!(normalizedKey in secrets)) {
    return false;
  }
  delete secrets[normalizedKey];
  writeSecrets(secrets, projectDirectory);
  return true;
}

// src/commands/secrets.ts
async function readSecretFromStdin() {
  let value = "";
  for await (const chunk of process.stdin) {
    value += String(chunk);
  }
  return value.replace(/\r?\n$/, "");
}
async function promptHiddenSecret() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error(
      "Interactive secret entry requires a TTY. Pipe the value and use --stdin instead."
    );
  }
  return new Promise((resolve7, reject) => {
    let value = "";
    const input = process.stdin;
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };
    const onData = (chunk) => {
      const text = String(chunk);
      for (const character of text) {
        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve7(value);
          return;
        }
        if (character === "") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Secret entry cancelled."));
          return;
        }
        if (character === "\x7F" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    process.stdout.write("Secret value: ");
    input.setEncoding("utf8");
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}
var secretsCommand = new Command11("secrets").description("Manage local LaunchStack secrets");
secretsCommand.command("add").description("Add or update a local secret without exposing it in process arguments").argument("<key>", "Secret key").option("--stdin", "Read the secret value from standard input").action(async (key, options) => {
  try {
    validateSecretKey(key);
    const value = options.stdin ? await readSecretFromStdin() : await promptHiddenSecret();
    setSecret(key, value);
    console.log(`Secret saved: ${key}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not save secret.");
    process.exitCode = 1;
  }
});
secretsCommand.command("list").description("List local secret keys").action(() => {
  try {
    const keys = Object.keys(readSecrets());
    if (keys.length === 0) {
      console.log("No secrets found");
      return;
    }
    keys.forEach((key) => {
      console.log(`${key}=********`);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not read secrets.");
    process.exitCode = 1;
  }
});
secretsCommand.command("remove").description("Remove a local secret").argument("<key>", "Secret key").action((key) => {
  try {
    if (!removeSecret(key)) {
      console.log(`Secret not found: ${key}`);
      return;
    }
    console.log(`Secret removed: ${key}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not remove secret.");
    process.exitCode = 1;
  }
});

// src/commands/status.ts
import { Command as Command12 } from "commander";
var statusCommand = new Command12("status").description("Show LaunchStack project status").action(() => {
  try {
    const config = readConfig();
    console.log("LaunchStack project status");
    console.log("");
    console.log(`App: ${config.appName}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Provider: ${config.provider}`);
    console.log(`Build command: ${config.buildCommand}`);
    console.log(`Output directory: ${config.outputDirectory}`);
    console.log(`Deploy target: ${config.deployTarget}`);
    console.log("");
    console.log("Config: valid");
  } catch {
    console.log("Config: missing or invalid");
    console.log("Run: launchstack init --name your-app");
  }
});

// src/commands/validate.ts
import { Command as Command13 } from "commander";
var validateCommand = new Command13("validate").description("Validate the LaunchStack config file").action(() => {
  try {
    const config = readConfig();
    console.log("LaunchStack config is valid");
    console.log(`App: ${config.appName}`);
    console.log(`Provider: ${config.provider}`);
    console.log(`Environment: ${config.environment}`);
  } catch (error) {
    console.log("LaunchStack config is invalid");
    if (error instanceof Error) {
      console.log(error.message);
    }
    process.exit(1);
  }
});

// src/cli.ts
var program = new Command14();
program.name("launchstack").description(
  "Backend API scaffolding, deployment preparation, and developer workflow CLI"
).version("2.1.0");
program.addCommand(createCommand);
program.addCommand(doctorCommand);
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);
program.addCommand(validateCommand);
program.addCommand(envCommand);
program.addCommand(providerCommand);
program.addCommand(secretsCommand);
program.addCommand(historyCommand);
program.addCommand(rollbackCommand);
program.addCommand(dockerCommand);
program.addCommand(githubCommand);
program.parse();
//# sourceMappingURL=cli.mjs.map