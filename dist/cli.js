#!/usr/bin/env node
"use strict";

// src/cli.ts
var import_commander14 = require("commander");

// src/commands/create.ts
var import_node_fs4 = require("fs");
var import_node_path5 = require("path");
var import_commander = require("commander");

// src/generator/generate.ts
var import_node_path4 = require("path");

// src/generator/files.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
var RENAMED_TEMPLATE_FILES = {
  "_gitignore": ".gitignore",
  "_dockerignore": ".dockerignore",
  "_npmrc": ".npmrc",
  "_env": ".env",
  "_env.example": ".env.example"
};
function ensureDestinationAvailable(destinationDirectory, overwrite = false) {
  if (!(0, import_node_fs.existsSync)(destinationDirectory)) {
    return;
  }
  const contents = (0, import_node_fs.readdirSync)(destinationDirectory);
  if (contents.length > 0 && !overwrite) {
    throw new Error(
      `Destination is not empty: ${destinationDirectory}. Use --force to overwrite it.`
    );
  }
}
function copyDirectory(sourceDirectory, destinationDirectory) {
  if (!(0, import_node_fs.existsSync)(sourceDirectory)) {
    throw new Error(`Template directory not found: ${sourceDirectory}`);
  }
  (0, import_node_fs.mkdirSync)(destinationDirectory, { recursive: true });
  (0, import_node_fs.cpSync)(sourceDirectory, destinationDirectory, {
    recursive: true,
    force: true
  });
  renameTemplateFiles(destinationDirectory);
}
function renameTemplateFiles(directory) {
  for (const entry of (0, import_node_fs.readdirSync)(directory)) {
    const currentPath = (0, import_node_path.join)(directory, entry);
    const stats = (0, import_node_fs.statSync)(currentPath);
    if (stats.isDirectory()) {
      renameTemplateFiles(currentPath);
      continue;
    }
    const replacementName = RENAMED_TEMPLATE_FILES[(0, import_node_path.basename)(currentPath)];
    if (!replacementName) {
      continue;
    }
    const replacementPath = (0, import_node_path.resolve)((0, import_node_path.dirname)(currentPath), replacementName);
    if ((0, import_node_fs.existsSync)(replacementPath)) {
      const existingContent = (0, import_node_fs.readFileSync)(replacementPath);
      const sourceContent = (0, import_node_fs.readFileSync)(currentPath);
      if (!existingContent.equals(sourceContent)) {
        throw new Error(
          `Cannot rename template file because the destination exists: ${replacementPath}`
        );
      }
      continue;
    }
    (0, import_node_fs.renameSync)(currentPath, replacementPath);
  }
}

// src/generator/names.ts
var PROJECT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function validateProjectName(projectName) {
  if (!projectName.trim()) {
    throw new Error("Project name is required.");
  }
  if (!PROJECT_NAME_PATTERN.test(projectName)) {
    throw new Error(
      "Project name must use lowercase letters, numbers, and hyphens only."
    );
  }
}
function toDisplayName(projectName) {
  return projectName.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

// src/generator/paths.ts
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");
function getRuntimeDirectory() {
  if (typeof __dirname === "string") {
    return __dirname;
  }
  return process.cwd();
}
function getPackageRoot() {
  const runtimeDirectory = getRuntimeDirectory();
  const candidates = [
    process.cwd(),
    runtimeDirectory,
    (0, import_node_path2.resolve)(runtimeDirectory, ".."),
    (0, import_node_path2.resolve)(runtimeDirectory, "../.."),
    (0, import_node_path2.resolve)(process.cwd(), ".."),
    (0, import_node_path2.resolve)(process.cwd(), "../..")
  ];
  for (const candidate of candidates) {
    if ((0, import_node_fs2.existsSync)((0, import_node_path2.resolve)(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error("Could not locate the LaunchStack package root.");
}
function getTemplateDirectory(templateName) {
  const runtimeDirectory = getRuntimeDirectory();
  const packageRoot = getPackageRoot();
  const candidates = [
    (0, import_node_path2.resolve)(runtimeDirectory, "templates", templateName),
    (0, import_node_path2.resolve)(packageRoot, "dist", "templates", templateName),
    (0, import_node_path2.resolve)(packageRoot, "src", "templates", templateName),
    (0, import_node_path2.resolve)(packageRoot, "templates", templateName)
  ];
  const templateDirectory = candidates.find(
    (candidate) => (0, import_node_fs2.existsSync)(candidate)
  );
  if (!templateDirectory) {
    throw new Error(
      `Template "${templateName}" could not be found in the LaunchStack installation.`
    );
  }
  return templateDirectory;
}

// src/generator/template.ts
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");
function renderTemplate(content, variables) {
  return Object.entries(variables).reduce(
    (rendered, [key, value]) => rendered.split(`{{${key}}}`).join(value),
    content
  );
}
function renderDirectory(directory, variables) {
  if (!(0, import_node_fs3.existsSync)(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }
  for (const entry of (0, import_node_fs3.readdirSync)(directory)) {
    const path = (0, import_node_path3.join)(directory, entry);
    const stats = (0, import_node_fs3.statSync)(path);
    if (stats.isDirectory()) {
      renderDirectory(path, variables);
      continue;
    }
    const content = (0, import_node_fs3.readFileSync)(path, "utf8");
    const rendered = renderTemplate(content, variables);
    if (rendered !== content) {
      (0, import_node_fs3.writeFileSync)(path, rendered);
    }
  }
}

// src/generator/generate.ts
function generateProject(options) {
  validateProjectName(options.projectName);
  const destinationDirectory = (0, import_node_path4.resolve)(options.destinationDirectory);
  ensureDestinationAvailable(
    destinationDirectory,
    options.overwrite ?? false
  );
  const templateDirectory = getTemplateDirectory(options.template);
  copyDirectory(templateDirectory, destinationDirectory);
  renderDirectory(destinationDirectory, {
    PROJECT_NAME: options.projectName,
    PROJECT_DISPLAY_NAME: toDisplayName(options.projectName)
  });
  return destinationDirectory;
}

// src/generator/install.ts
var import_node_child_process = require("child_process");
function installDependencies(projectDirectory) {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  (0, import_node_child_process.execFileSync)(npmExecutable, ["install"], {
    cwd: projectDirectory,
    stdio: "inherit"
  });
}

// src/commands/create.ts
var createCommand = new import_commander.Command("create").description("Create a new backend API project").argument("<project-name>", "Name of the project to create").option(
  "-d, --directory <path>",
  "Directory where the project should be created"
).option("-f, --force", "Allow writing into a non-empty directory").option("--no-install", "Skip dependency installation").action((projectName, options) => {
  try {
    const destinationDirectory = options.directory ? (0, import_node_path5.resolve)(options.directory) : (0, import_node_path5.resolve)(process.cwd(), projectName);
    const destinationAlreadyExists = (0, import_node_fs4.existsSync)(destinationDirectory);
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
      console.log(`  cd ${projectName}`);
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
var import_commander2 = require("commander");

// src/release/doctor.ts
var import_node_fs5 = require("fs");
var import_node_path6 = require("path");
function checkFile(projectDirectory, file, label) {
  const path = (0, import_node_path6.resolve)(projectDirectory, file);
  const passed = (0, import_node_fs5.existsSync)(path);
  return {
    name: label,
    passed,
    detail: passed ? `${file} found` : `${file} is missing`
  };
}
function checkPackageScripts(projectDirectory) {
  const packagePath = (0, import_node_path6.resolve)(
    projectDirectory,
    "package.json"
  );
  if (!(0, import_node_fs5.existsSync)(packagePath)) {
    return {
      name: "Package scripts",
      passed: false,
      detail: "package.json is missing"
    };
  }
  const packageJson = JSON.parse(
    (0, import_node_fs5.readFileSync)(packagePath, "utf8")
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
  const path = (0, import_node_path6.resolve)(
    projectDirectory,
    ".env.example"
  );
  if (!(0, import_node_fs5.existsSync)(path)) {
    return {
      name: "Environment example",
      passed: false,
      detail: ".env.example is missing"
    };
  }
  const content = (0, import_node_fs5.readFileSync)(path, "utf8");
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
    projectDirectory: (0, import_node_path6.resolve)(projectDirectory),
    checks
  };
}

// src/commands/doctor.ts
var doctorCommand = new import_commander2.Command("doctor").description(
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
var import_node_child_process3 = require("child_process");
var import_node_fs8 = require("fs");
var import_node_path9 = require("path");
var import_commander3 = require("commander");

// src/config.ts
var import_node_fs6 = require("fs");
var import_node_path7 = require("path");
var import_zod = require("zod");
var CONFIG_FILE_NAME = "launchstack.config.json";
var launchStackConfigSchema = import_zod.z.object({
  appName: import_zod.z.string().min(1),
  environment: import_zod.z.enum(["development", "staging", "production"]),
  provider: import_zod.z.enum(["vercel", "netlify", "render", "railway", "docker", "custom"]),
  buildCommand: import_zod.z.string().min(1),
  outputDirectory: import_zod.z.string().min(1),
  deployTarget: import_zod.z.string().min(1)
});
function getConfigPath() {
  return (0, import_node_path7.resolve)(process.cwd(), CONFIG_FILE_NAME);
}
function configExists() {
  return (0, import_node_fs6.existsSync)(getConfigPath());
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
  (0, import_node_fs6.writeFileSync)(getConfigPath(), JSON.stringify(config, null, 2));
}
function readConfig() {
  const raw = (0, import_node_fs6.readFileSync)(getConfigPath(), "utf-8");
  const parsed = JSON.parse(raw);
  return launchStackConfigSchema.parse(parsed);
}

// src/git.ts
var import_node_child_process2 = require("child_process");
function run(command) {
  return (0, import_node_child_process2.execSync)(command, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "ignore"]
  }).trim();
}
function getGitMetadata() {
  try {
    const branch = run("git rev-parse --abbrev-ref HEAD");
    const commitHash = run("git rev-parse HEAD");
    const commitMessage = run("git log -1 --pretty=%B");
    const dirty = run("git status --porcelain").length > 0;
    return {
      branch,
      commitHash,
      commitMessage,
      dirty
    };
  } catch {
    return null;
  }
}

// src/history.ts
var import_node_fs7 = require("fs");
var import_node_path8 = require("path");
var STORE_DIR = ".launchstack";
var HISTORY_FILE = "history.json";
function getStorePath() {
  return (0, import_node_path8.resolve)(process.cwd(), STORE_DIR);
}
function getHistoryPath() {
  return (0, import_node_path8.resolve)(getStorePath(), HISTORY_FILE);
}
function ensureStore() {
  if (!(0, import_node_fs7.existsSync)(getStorePath())) {
    (0, import_node_fs7.mkdirSync)(getStorePath(), { recursive: true });
  }
}
function readHistory() {
  ensureStore();
  if (!(0, import_node_fs7.existsSync)(getHistoryPath())) {
    return [];
  }
  return JSON.parse((0, import_node_fs7.readFileSync)(getHistoryPath(), "utf-8"));
}
function writeHistory(records) {
  ensureStore();
  (0, import_node_fs7.writeFileSync)(getHistoryPath(), JSON.stringify(records, null, 2));
}
function addDeploymentRecord(record) {
  const records = readHistory();
  records.unshift(record);
  writeHistory(records.slice(0, 50));
}

// src/commands/deploy.ts
var deployCommand = new import_commander3.Command("deploy").description("Run the configured LaunchStack deployment workflow").option("--skip-build", "Skip the build command").action((options) => {
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const config = readConfig();
    const git = getGitMetadata();
    console.log("LaunchStack deployment");
    console.log(`App: ${config.appName}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Provider: ${config.provider}`);
    if (git) {
      console.log(`Branch: ${git.branch}`);
      console.log(`Commit: ${git.commitHash.slice(0, 7)}`);
      if (git.dirty) {
        console.log("Working tree has uncommitted changes");
      }
    }
    console.log("");
    if (!options.skipBuild) {
      console.log(`Running build: ${config.buildCommand}`);
      (0, import_node_child_process3.execSync)(config.buildCommand, {
        stdio: "inherit",
        cwd: process.cwd()
      });
    }
    const outputPath = (0, import_node_path9.resolve)(process.cwd(), config.outputDirectory);
    if (!(0, import_node_fs8.existsSync)(outputPath)) {
      addDeploymentRecord({
        id: `dep_${Date.now()}`,
        appName: config.appName,
        environment: config.environment,
        provider: config.provider,
        deployTarget: config.deployTarget,
        outputDirectory: config.outputDirectory,
        status: "failed",
        createdAt,
        git
      });
      console.log("");
      console.log(`Output directory not found: ${config.outputDirectory}`);
      process.exit(1);
    }
    addDeploymentRecord({
      id: `dep_${Date.now()}`,
      appName: config.appName,
      environment: config.environment,
      provider: config.provider,
      deployTarget: config.deployTarget,
      outputDirectory: config.outputDirectory,
      status: "success",
      createdAt,
      git
    });
    console.log("");
    console.log("Build output verified");
    console.log(`Deploy target: ${config.deployTarget}`);
    console.log("");
    console.log("Deployment workflow completed");
  } catch (error) {
    console.log("Deployment failed");
    console.log(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});

// src/commands/docker.ts
var import_node_fs9 = require("fs");
var import_commander4 = require("commander");
function writeFileIfAllowed(path, content, force) {
  if ((0, import_node_fs9.existsSync)(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }
  (0, import_node_fs9.writeFileSync)(path, content);
  console.log(`Created ${path}`);
}
var dockerCommand = new import_commander4.Command("docker").description("Generate Docker deployment files");
dockerCommand.command("init").description("Create Dockerfile, .dockerignore, and docker-compose.yml").option("-f, --force", "Overwrite existing Docker files").action((options) => {
  const config = readConfig();
  const force = Boolean(options.force);
  const dockerfile = `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN ${config.buildCommand}

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
var import_commander5 = require("commander");
var allowedEnvironments = ["development", "staging", "production"];
var envCommand = new import_commander5.Command("env").description("View or update the LaunchStack environment").argument("[environment]", "development, staging, or production").action((environment) => {
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
var import_node_fs10 = require("fs");
var import_node_path10 = require("path");
var import_commander6 = require("commander");
function writeWorkflowFile(path, content, force) {
  if ((0, import_node_fs10.existsSync)(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }
  (0, import_node_fs10.mkdirSync)((0, import_node_path10.dirname)(path), { recursive: true });
  (0, import_node_fs10.writeFileSync)(path, content);
  console.log(`Created ${path}`);
}
var githubCommand = new import_commander6.Command("github").description("Generate GitHub Actions workflows");
githubCommand.command("init").description("Create a deployment workflow").option("-f, --force", "Overwrite existing workflow").action((options) => {
  const config = readConfig();
  const workflow = `name: Deploy

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Dependencies
        run: npm install

      - name: Build Project
        run: ${config.buildCommand}
`;
  writeWorkflowFile(
    ".github/workflows/deploy.yml",
    workflow,
    Boolean(options.force)
  );
});

// src/commands/history.ts
var import_commander7 = require("commander");
var historyCommand = new import_commander7.Command("history").description("Show recent LaunchStack deployments").option("-l, --limit <number>", "Number of records to show", "10").action((options) => {
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
var import_commander8 = require("commander");
var initCommand = new import_commander8.Command("init").description("Create a LaunchStack config file").option("-n, --name <name>", "Project name").option("-f, --force", "Overwrite existing config file").action((options) => {
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
var import_commander9 = require("commander");
var allowedProviders = ["vercel", "netlify", "render", "railway", "docker", "custom"];
var providerCommand = new import_commander9.Command("provider").description("View or update the LaunchStack deployment provider").argument("[provider]", "vercel, netlify, render, railway, docker, or custom").action((provider) => {
  try {
    const config = readConfig();
    if (!provider) {
      console.log(`Current provider: ${config.provider}`);
      return;
    }
    if (!allowedProviders.includes(provider)) {
      console.log("Invalid provider. Use vercel, netlify, render, railway, docker, or custom.");
      process.exit(1);
    }
    config.provider = provider;
    writeConfig(config);
    console.log(`Provider updated to ${config.provider}`);
  } catch (error) {
    console.log("Could not update provider");
    if (error instanceof Error) {
      console.log(error.message);
    }
    process.exit(1);
  }
});

// src/commands/rollback.ts
var import_commander10 = require("commander");
var rollbackCommand = new import_commander10.Command("rollback").description("Show the latest successful deployment available for rollback").action(() => {
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
var import_node_fs11 = require("fs");
var import_node_path11 = require("path");
var import_commander11 = require("commander");
var STORE_DIR2 = ".launchstack";
var SECRETS_FILE = "secrets.json";
function getStorePath2() {
  return (0, import_node_path11.resolve)(process.cwd(), STORE_DIR2);
}
function getSecretsPath() {
  return (0, import_node_path11.resolve)(getStorePath2(), SECRETS_FILE);
}
function ensureStore2() {
  if (!(0, import_node_fs11.existsSync)(getStorePath2())) {
    (0, import_node_fs11.mkdirSync)(getStorePath2(), { recursive: true });
  }
}
function readSecrets() {
  ensureStore2();
  if (!(0, import_node_fs11.existsSync)(getSecretsPath())) {
    return {};
  }
  return JSON.parse((0, import_node_fs11.readFileSync)(getSecretsPath(), "utf-8"));
}
function writeSecrets(secrets) {
  ensureStore2();
  (0, import_node_fs11.writeFileSync)(getSecretsPath(), JSON.stringify(secrets, null, 2));
}
var secretsCommand = new import_commander11.Command("secrets").description("Manage local LaunchStack secrets");
secretsCommand.command("add").description("Add or update a local secret").argument("<key>", "Secret key").argument("<value>", "Secret value").action((key, value) => {
  const secrets = readSecrets();
  secrets[key] = value;
  writeSecrets(secrets);
  console.log(`Secret saved: ${key}`);
});
secretsCommand.command("list").description("List local secret keys").action(() => {
  const secrets = readSecrets();
  const keys = Object.keys(secrets);
  if (keys.length === 0) {
    console.log("No secrets found");
    return;
  }
  keys.forEach((key) => {
    console.log(`${key}=********`);
  });
});
secretsCommand.command("remove").description("Remove a local secret").argument("<key>", "Secret key").action((key) => {
  const secrets = readSecrets();
  if (!secrets[key]) {
    console.log(`Secret not found: ${key}`);
    return;
  }
  delete secrets[key];
  writeSecrets(secrets);
  console.log(`Secret removed: ${key}`);
});

// src/commands/status.ts
var import_commander12 = require("commander");
var statusCommand = new import_commander12.Command("status").description("Show LaunchStack project status").action(() => {
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
var import_commander13 = require("commander");
var validateCommand = new import_commander13.Command("validate").description("Validate the LaunchStack config file").action(() => {
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
var program = new import_commander14.Command();
program.name("launchstack").description(
  "Backend API scaffolding, deployment automation, and developer workflow CLI"
).version("2.0.0");
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
