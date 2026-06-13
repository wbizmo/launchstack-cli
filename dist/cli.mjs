#!/usr/bin/env node

// src/cli.ts
import { Command as Command7 } from "commander";

// src/commands/deploy.ts
import { execSync } from "child_process";
import { existsSync as existsSync2 } from "fs";
import { resolve as resolve2 } from "path";
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

// src/commands/deploy.ts
var deployCommand = new Command("deploy").description("Run the configured LaunchStack deployment workflow").option("--skip-build", "Skip the build command").action((options) => {
  try {
    const config = readConfig();
    console.log("LaunchStack deployment");
    console.log(`App: ${config.appName}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Provider: ${config.provider}`);
    console.log("");
    if (!options.skipBuild) {
      console.log(`Running build: ${config.buildCommand}`);
      execSync(config.buildCommand, {
        stdio: "inherit",
        cwd: process.cwd()
      });
    }
    const outputPath = resolve2(process.cwd(), config.outputDirectory);
    if (!existsSync2(outputPath)) {
      console.log("");
      console.log(`Output directory not found: ${config.outputDirectory}`);
      process.exit(1);
    }
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

// src/commands/init.ts
import { Command as Command3 } from "commander";
var initCommand = new Command3("init").description("Create a LaunchStack config file").option("-n, --name <name>", "Project name").option("-f, --force", "Overwrite existing config file").action((options) => {
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
import { Command as Command4 } from "commander";
var allowedProviders = ["vercel", "netlify", "render", "railway", "docker", "custom"];
var providerCommand = new Command4("provider").description("View or update the LaunchStack deployment provider").argument("[provider]", "vercel, netlify, render, railway, docker, or custom").action((provider) => {
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

// src/commands/status.ts
import { Command as Command5 } from "commander";
var statusCommand = new Command5("status").description("Show LaunchStack project status").action(() => {
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
import { Command as Command6 } from "commander";
var validateCommand = new Command6("validate").description("Validate the LaunchStack config file").action(() => {
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
var program = new Command7();
program.name("launchstack").description("Deployment and release workflow CLI").version("0.1.0");
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);
program.addCommand(validateCommand);
program.addCommand(envCommand);
program.addCommand(providerCommand);
program.parse();
