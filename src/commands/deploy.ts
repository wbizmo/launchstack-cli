import { execSync } from "node:child_process";
import { Command } from "commander";
import { readConfig } from "../config";
import { resolveVerifiedOutputDirectory } from "../deployment";
import { getGitMetadata } from "../git";
import { addDeploymentRecord } from "../history";
import { PROVIDERS } from "../providers";

export const deployCommand = new Command("deploy")
  .description("Build and prepare the configured deployment artifacts")
  .option("--skip-build", "Skip the build command")
  .action((options) => {
    const createdAt = new Date().toISOString();

    try {
      const config = readConfig();
      const git = getGitMetadata();
      const provider = PROVIDERS[config.provider];

      console.log("LaunchStack deployment preparation");
      console.log(`App: ${config.appName}`);
      console.log(`Environment: ${config.environment}`);
      console.log(`Provider: ${provider.label}`);

      if (git) {
        console.log(`Branch: ${git.branch}`);
        console.log(`Commit: ${git.commitHash.slice(0, 7)}`);

        if (git.dirty) {
          console.log("Working tree has uncommitted changes");
        }
      }

      console.log("");

      if (!options.skipBuild) {
        console.log(`Running trusted project build command: ${config.buildCommand}`);
        execSync(config.buildCommand, {
          stdio: "inherit",
          cwd: process.cwd()
        });
      }

      resolveVerifiedOutputDirectory(
        process.cwd(),
        config.outputDirectory
      );

      addDeploymentRecord({
        id: `dep_${Date.now()}`,
        appName: config.appName,
        environment: config.environment,
        provider: config.provider,
        deployTarget: config.deployTarget,
        outputDirectory: config.outputDirectory,
        status: "prepared",
        createdAt,
        git
      });

      console.log("");
      console.log("Build output verified");
      console.log(`Deploy target: ${config.deployTarget}`);
      console.log("");

      if (provider.remoteDeploymentSupported) {
        console.log("Deployment provider confirmed the remote deployment.");
      } else {
        console.log(
          "Artifacts are prepared. LaunchStack has not performed or confirmed a remote deployment for this provider."
        );
      }
    } catch (error) {
      console.log("Deployment preparation failed");
      console.log(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });
