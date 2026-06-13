#!/usr/bin/env node
"use strict";

// src/cli.ts
var import_commander4 = require("commander");

// src/commands/deploy.ts
var import_commander = require("commander");
var deployCommand = new import_commander.Command("deploy").description("Deploy application").action(() => {
  console.log("Deployment started");
});

// src/commands/status.ts
var import_commander2 = require("commander");
var statusCommand = new import_commander2.Command("status").description("Show deployment status").action(() => {
  console.log("All systems operational");
});

// src/commands/init.ts
var import_commander3 = require("commander");

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

// src/commands/init.ts
var initCommand = new import_commander3.Command("init").description("Create a LaunchStack config file").option("-n, --name <name>", "Project name").option("-f, --force", "Overwrite existing config file").action((options) => {
  if (configExists() && !options.force) {
    console.log("launchstack.config.json already exists. Use --force to overwrite.");
    return;
  }
  const appName = options.name || "my-app";
  const config = createDefaultConfig(appName);
  writeConfig(config);
  console.log("Created launchstack.config.json");
});

// src/cli.ts
var program = new import_commander4.Command();
program.name("launchstack").description("Deployment and release workflow CLI").version("1.0.0");
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);
program.parse();
