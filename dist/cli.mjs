#!/usr/bin/env node

// src/cli.ts
import { Command as Command10 } from "commander";

// src/commands/deploy.ts
import { execSync as execSync2 } from "child_process";
import { existsSync as existsSync3 } from "fs";
import { resolve as resolve3 } from "path";
import { Command } from "commander";

// src/config.ts
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { z } from "zod";
var CONFIG_FILE_NAME = "launchstack.config.json";
var launchStackConfigSchema = z.object({
  appName: z.string().min(1),
  environment: z.enum(["development", "staging", "production"]),
  provider: z.enum(["vercel", "netlify", "render", "railway", "docker", "custom"]),
  buildCommand: z.string().min(1),
  outputDirectory: z.string().min(1),
  deployTarget: z.string().min(1)
});
function getConfigPath() {
  return resolve(process.cwd(), CONFIG_FILE_NAME);
}
function configExists() {
  return existsSync(getConfigPath());
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
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}
function readConfig() {
  const raw = readFileSync(getConfigPath(), "utf-8");
  const parsed = JSON.parse(raw);
  return launchStackConfigSchema.parse(parsed);
}

// src/git.ts
import { execSync } from "child_process";
function run(command) {
  return execSync(command, {
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
import { existsSync as existsSync2, mkdirSync, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "fs";
import { resolve as resolve2 } from "path";
var STORE_DIR = ".launchstack";
var HISTORY_FILE = "history.json";
function getStorePath() {
  return resolve2(process.cwd(), STORE_DIR);
}
function getHistoryPath() {
  return resolve2(getStorePath(), HISTORY_FILE);
}
function ensureStore() {
  if (!existsSync2(getStorePath())) {
    mkdirSync(getStorePath(), { recursive: true });
  }
}
function readHistory() {
  ensureStore();
  if (!existsSync2(getHistoryPath())) {
    return [];
  }
  return JSON.parse(readFileSync2(getHistoryPath(), "utf-8"));
}
function writeHistory(records) {
  ensureStore();
  writeFileSync2(getHistoryPath(), JSON.stringify(records, null, 2));
}
function addDeploymentRecord(record) {
  const records = readHistory();
  records.unshift(record);
  writeHistory(records.slice(0, 50));
}

// src/commands/deploy.ts
var deployCommand = new Command("deploy").description("Run the configured LaunchStack deployment workflow").option("--skip-build", "Skip the build command").action((options) => {
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
      execSync2(config.buildCommand, {
        stdio: "inherit",
        cwd: process.cwd()
      });
    }
    const outputPath = resolve3(process.cwd(), config.outputDirectory);
    if (!existsSync3(outputPath)) {
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

// src/commands/env.ts
import { Command as Command2 } from "commander";
var allowedEnvironments = ["development", "staging", "production"];
var envCommand = new Command2("env").description("View or update the LaunchStack environment").argument("[environment]", "development, staging, or production").action((environment) => {
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
import { Command as Command3 } from "commander";
var historyCommand = new Command3("history").description("Show recent LaunchStack deployments").option("-l, --limit <number>", "Number of records to show", "10").action((options) => {
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
import { Command as Command4 } from "commander";
var initCommand = new Command4("init").description("Create a LaunchStack config file").option("-n, --name <name>", "Project name").option("-f, --force", "Overwrite existing config file").action((options) => {
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
import { Command as Command5 } from "commander";
var allowedProviders = ["vercel", "netlify", "render", "railway", "docker", "custom"];
var providerCommand = new Command5("provider").description("View or update the LaunchStack deployment provider").argument("[provider]", "vercel, netlify, render, railway, docker, or custom").action((provider) => {
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
import { Command as Command6 } from "commander";
var rollbackCommand = new Command6("rollback").description("Show the latest successful deployment available for rollback").action(() => {
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
import { existsSync as existsSync4, mkdirSync as mkdirSync2, readFileSync as readFileSync3, writeFileSync as writeFileSync3 } from "fs";
import { resolve as resolve4 } from "path";
import { Command as Command7 } from "commander";
var STORE_DIR2 = ".launchstack";
var SECRETS_FILE = "secrets.json";
function getStorePath2() {
  return resolve4(process.cwd(), STORE_DIR2);
}
function getSecretsPath() {
  return resolve4(getStorePath2(), SECRETS_FILE);
}
function ensureStore2() {
  if (!existsSync4(getStorePath2())) {
    mkdirSync2(getStorePath2(), { recursive: true });
  }
}
function readSecrets() {
  ensureStore2();
  if (!existsSync4(getSecretsPath())) {
    return {};
  }
  return JSON.parse(readFileSync3(getSecretsPath(), "utf-8"));
}
function writeSecrets(secrets) {
  ensureStore2();
  writeFileSync3(getSecretsPath(), JSON.stringify(secrets, null, 2));
}
var secretsCommand = new Command7("secrets").description("Manage local LaunchStack secrets");
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
import { Command as Command8 } from "commander";
var statusCommand = new Command8("status").description("Show LaunchStack project status").action(() => {
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
import { Command as Command9 } from "commander";
var validateCommand = new Command9("validate").description("Validate the LaunchStack config file").action(() => {
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
var program = new Command10();
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
