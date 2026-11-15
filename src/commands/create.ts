import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { Command } from "commander";
import { generateProject } from "../generator/generate";
import { installDependencies } from "../generator/install";

type CreateCommandOptions = {
  directory?: string;
  force?: boolean;
  install: boolean;
  verbose?: boolean;
};

export function resolveCreateDestination(
  projectName: string,
  directory?: string,
  workingDirectory = process.cwd(),
): string {
  return directory
    ? resolve(workingDirectory, directory, projectName)
    : resolve(workingDirectory, projectName);
}

export const createCommand = new Command("create")
  .description("Create a new backend API project")
  .argument("<project-name>", "Name of the project to create")
  .option(
    "-d, --directory <path>",
    "Parent directory where <project-name> should be created",
  )
  .option("--verbose", "Show project generation progress")
  .option(
    "-f, --force",
    "Allow replacing a non-empty destination after staging succeeds",
  )
  .option("--no-install", "Skip dependency installation")
  .action((projectName: string, options: CreateCommandOptions) => {
    try {
      const destinationDirectory = resolveCreateDestination(
        projectName,
        options.directory,
      );

      const destinationAlreadyExists = existsSync(destinationDirectory);

      console.log(`Creating ${projectName}...`);

      const generatedDirectory = generateProject({
        projectName,
        destinationDirectory,
        template: "api",
        overwrite: options.force ?? false,
        onProgress: options.verbose
          ? (message) => console.log(`  ${message}...`)
          : undefined,
      });

      console.log(`Project files created in ${generatedDirectory}`);

      if (options.install) {
        console.log("Installing dependencies...");
        installDependencies(generatedDirectory);
        console.log("Dependencies installed");
      }

      console.log("");
      console.log("Project created successfully");
      console.log("");
      console.log("Next steps:");

      if (!destinationAlreadyExists || destinationDirectory !== process.cwd()) {
        const relativeDestination =
          relative(process.cwd(), destinationDirectory) || ".";
        console.log(`  cd ${relativeDestination}`);
      }

      if (!options.install) {
        console.log("  npm install");
      }

      console.log("  npm run dev");
    } catch (error) {
      console.error("Project creation failed");

      if (error instanceof Error) {
        console.error(error.message);
      }

      process.exitCode = 1;
    }
  });
