import { Command } from "commander";
import { readConfig } from "../config";

export const validateCommand = new Command("validate")
  .description("Validate the LaunchStack config file")
  .action(() => {
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