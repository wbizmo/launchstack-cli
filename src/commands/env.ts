import { Command } from "commander";
import { readConfig, writeConfig } from "../config";

const allowedEnvironments = ["development", "staging", "production"] as const;

export const envCommand = new Command("env")
  .description("View or update the LaunchStack environment")
  .argument("[environment]", "development, staging, or production")
  .action((environment?: string) => {
    try {
      const config = readConfig();

      if (!environment) {
        console.log(`Current environment: ${config.environment}`);
        return;
      }

      if (!allowedEnvironments.includes(environment as typeof allowedEnvironments[number])) {
        console.log("Invalid environment. Use development, staging, or production.");
        process.exit(1);
      }

      config.environment = environment as typeof allowedEnvironments[number];
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