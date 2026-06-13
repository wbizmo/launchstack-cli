import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { readConfig } from "../config";
import { addDeploymentRecord } from "../history";

export const deployCommand = new Command("deploy")
  .description("Run the configured LaunchStack deployment workflow")
  .option("--skip-build", "Skip the build command")
  .action((options) => {
    const createdAt = new Date().toISOString();

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

      const outputPath = resolve(process.cwd(), config.outputDirectory);

      if (!existsSync(outputPath)) {
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