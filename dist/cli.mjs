#!/usr/bin/env node

// src/cli.ts
import { Command as Command4 } from "commander";

// src/commands/deploy.ts
import { Command } from "commander";
var deployCommand = new Command("deploy").description("Deploy application").action(() => {
  console.log("Deployment started");
});

// src/commands/status.ts
import { Command as Command2 } from "commander";
var statusCommand = new Command2("status").description("Show deployment status").action(() => {
  console.log("All systems operational");
});

// src/commands/init.ts
import { Command as Command3 } from "commander";

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

// src/commands/init.ts
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

// src/cli.ts
var program = new Command4();
program.name("launchstack").description("Deployment and release workflow CLI").version("1.0.0");
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);
program.parse();
