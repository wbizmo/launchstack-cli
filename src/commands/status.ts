import { Command } from "commander";
import { readConfig } from "../config";

export const statusCommand = new Command("status")
  .description("Show LaunchStack project status")
  .action(() => {
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