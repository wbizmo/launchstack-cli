#!/usr/bin/env node
"use strict";

// src/cli.ts
var import_commander10 = require("commander");

// src/commands/deploy.ts
var import_node_child_process = require("child_process");
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");
var import_commander = require("commander");

// src/config.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
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
  return (0, import_node_path.resolve)(process.cwd(), CONFIG_FILE_NAME);
}
function configExists() {
  return (0, import_node_fs.existsSync)(getConfigPath());
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
  (0, import_node_fs.writeFileSync)(getConfigPath(), JSON.stringify(config, null, 2));
}
function readConfig() {
  const raw = (0, import_node_fs.readFileSync)(getConfigPath(), "utf-8");
  const parsed = JSON.parse(raw);
  return launchStackConfigSchema.parse(parsed);
}

// src/history.ts
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");
var STORE_DIR = ".launchstack";
var HISTORY_FILE = "history.json";
function getStorePath() {
  return (0, import_node_path2.resolve)(process.cwd(), STORE_DIR);
}
function getHistoryPath() {
  return (0, import_node_path2.resolve)(getStorePath(), HISTORY_FILE);
}
function ensureStore() {
  if (!(0, import_node_fs2.existsSync)(getStorePath())) {
    (0, import_node_fs2.mkdirSync)(getStorePath(), { recursive: true });
  }
}
function readHistory() {
  ensureStore();
  if (!(0, import_node_fs2.existsSync)(getHistoryPath())) {
    return [];
  }
  return JSON.parse((0, import_node_fs2.readFileSync)(getHistoryPath(), "utf-8"));
}
function writeHistory(records) {
  ensureStore();
  (0, import_node_fs2.writeFileSync)(getHistoryPath(), JSON.stringify(records, null, 2));
}
function addDeploymentRecord(record) {
  const records = readHistory();
  records.unshift(record);
  writeHistory(records.slice(0, 50));
}

// src/commands/deploy.ts
var deployCommand = new import_commander.Command("deploy").description("Run the configured LaunchStack deployment workflow").option("--skip-build", "Skip the build command").action((options) => {
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const config = readConfig();
    console.log("LaunchStack deployment");
    console.log(`App: ${config.appName}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Provider: ${config.provider}`);
    console.log("");
    if (!options.skipBuild) {
      console.log(`Running build: ${config.buildCommand}`);
      (0, import_node_child_process.execSync)(config.buildCommand, {
        stdio: "inherit",
        cwd: process.cwd()
      });
    }
    const outputPath = (0, import_node_path3.resolve)(process.cwd(), config.outputDirectory);
    if (!(0, import_node_fs3.existsSync)(outputPath)) {
      addDeploymentRecord({
        id: `dep_${Date.now()}`,
        appName: config.appName,
        environment: config.environment,
        provider: config.provider,
        deployTarget: config.deployTarget,
        outputDirectory: config.outputDirectory,
        status: "failed",
        createdAt
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
      createdAt
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

// src/commands/env.ts
var import_commander2 = require("commander");
var allowedEnvironments = ["development", "staging", "production"];
var envCommand = new import_commander2.Command("env").description("View or update the LaunchStack environment").argument("[environment]", "development, staging, or production").action((environment) => {
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

// src/commands/history.ts
var import_commander3 = require("commander");
var historyCommand = new import_commander3.Command("history").description("Show recent LaunchStack deployments").option("-l, --limit <number>", "Number of records to show", "10").action((options) => {
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
    console.log("");
  });
});

// src/commands/init.ts
var import_commander4 = require("commander");
var initCommand = new import_commander4.Command("init").description("Create a LaunchStack config file").option("-n, --name <name>", "Project name").option("-f, --force", "Overwrite existing config file").action((options) => {
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
var import_commander5 = require("commander");
var allowedProviders = ["vercel", "netlify", "render", "railway", "docker", "custom"];
var providerCommand = new import_commander5.Command("provider").description("View or update the LaunchStack deployment provider").argument("[provider]", "vercel, netlify, render, railway, docker, or custom").action((provider) => {
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
var import_commander6 = require("commander");
var rollbackCommand = new import_commander6.Command("rollback").description("Show the latest successful deployment available for rollback").action(() => {
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
var import_node_fs4 = require("fs");
var import_node_path4 = require("path");
var import_commander7 = require("commander");
var STORE_DIR2 = ".launchstack";
var SECRETS_FILE = "secrets.json";
function getStorePath2() {
  return (0, import_node_path4.resolve)(process.cwd(), STORE_DIR2);
}
function getSecretsPath() {
  return (0, import_node_path4.resolve)(getStorePath2(), SECRETS_FILE);
}
function ensureStore2() {
  if (!(0, import_node_fs4.existsSync)(getStorePath2())) {
    (0, import_node_fs4.mkdirSync)(getStorePath2(), { recursive: true });
  }
}
function readSecrets() {
  ensureStore2();
  if (!(0, import_node_fs4.existsSync)(getSecretsPath())) {
    return {};
  }
  return JSON.parse((0, import_node_fs4.readFileSync)(getSecretsPath(), "utf-8"));
}
function writeSecrets(secrets) {
  ensureStore2();
  (0, import_node_fs4.writeFileSync)(getSecretsPath(), JSON.stringify(secrets, null, 2));
}
var secretsCommand = new import_commander7.Command("secrets").description("Manage local LaunchStack secrets");
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
var import_commander8 = require("commander");
var statusCommand = new import_commander8.Command("status").description("Show LaunchStack project status").action(() => {
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
var import_commander9 = require("commander");
var validateCommand = new import_commander9.Command("validate").description("Validate the LaunchStack config file").action(() => {
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
var program = new import_commander10.Command();
program.name("launchstack").description("Deployment and release workflow CLI").version("0.1.0");
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);
program.addCommand(validateCommand);
program.addCommand(envCommand);
program.addCommand(providerCommand);
program.addCommand(secretsCommand);
program.addCommand(historyCommand);
program.addCommand(rollbackCommand);
program.parse();
