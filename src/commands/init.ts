import { Command } from "commander";
import {
  configExists,
  createDefaultConfig,
  writeConfig
} from "../config";

export const initCommand = new Command("init")
  .description("Create a LaunchStack config file")
  .option("-n, --name <name>", "Project name")
  .option("-f, --force", "Overwrite existing config file")
  .action((options) => {
    if (configExists() && !options.force) {
      console.log("launchstack.config.json already exists. Use --force to overwrite.");
      return;
    }

    const appName = options.name || "my-app";
    const config = createDefaultConfig(appName);

    writeConfig(config);

    console.log("Created launchstack.config.json");
  });