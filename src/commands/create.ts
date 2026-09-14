import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { Command } from "commander";
import { generateProject } from "../generator/generate";
import { installDependencies } from "../generator/install";

type CreateCommandOptions = {
  directory?: string;
  force?: boolean;
  install: boolean;
};

export const createCommand = new Command("create")
  .description("Create a new backend API project")
  .argument("<project-name>", "Name of the project to create")
  .option(
    "-d, --directory <path>",
    "Directory where the project should be created"
  )
  .option("-f, --force", "Allow replacing a non-empty destination after staging succeeds")
  .option("--no-install", "Skip dependency installation")
  .action((projectName: string, options: CreateCommandOptions) => {
    try {
      const destinationDirectory = options.directory
        ? resolve(options.directory)
        : resolve(process.cwd(), projectName);

      const destinationAlreadyExists = existsSync(destinationDirectory);

      console.log(`Creating ${projectName}...`);

      const generatedDirectory = generateProject({
        projectName,
        destinationDirectory,
        template: "api",
        overwrite: options.force ?? false
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
        const relativeDestination = relative(process.cwd(), destinationDirectory) || ".";
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
