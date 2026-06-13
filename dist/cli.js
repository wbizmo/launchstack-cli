#!/usr/bin/env node
"use strict";

// src/cli.ts
var import_commander5 = require("commander");

// src/commands/deploy.ts
var import_node_child_process = require("child_process");
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");
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

// src/commands/deploy.ts
var deployCommand = new import_commander.Command("deploy").description("Run the configured LaunchStack deployment workflow").option("--skip-build", "Skip the build command").action((options) => {
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
    const outputPath = (0, import_node_path2.resolve)(process.cwd(), config.outputDirectory);
    if (!(0, import_node_fs2.existsSync)(outputPath)) {
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

// src/commands/init.ts
var import_commander2 = require("commander");
var initCommand = new import_commander2.Command("init").description("Create a LaunchStack config file").option("-n, --name <name>", "Project name").option("-f, --force", "Overwrite existing config file").action((options) => {
  if (configExists() && !options.force) {
    console.log("launchstack.config.json already exists. Use --force to overwrite.");
    return;
  }
  const appName = options.name || "my-app";
  const config = createDefaultConfig(appName);
  writeConfig(config);
  console.log("Created launchstack.config.json");
});

// src/commands/status.ts
var import_commander3 = require("commander");
var statusCommand = new import_commander3.Command("status").description("Show LaunchStack project status").action(() => {
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
var import_commander4 = require("commander");
var validateCommand = new import_commander4.Command("validate").description("Validate the LaunchStack config file").action(() => {
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
var program = new import_commander5.Command();
program.name("launchstack").description("Deployment and release workflow CLI").version("0.1.0");
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);
program.addCommand(validateCommand);
program.parse();
