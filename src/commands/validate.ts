import { Command } from "commander";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { CONFIG_FILE_NAME, readConfig } from "../config";
import { loadProjectManifest, MANIFEST_FILENAME } from "../project/manifest";

export function validateProject(directory = process.cwd()):
  | {
      kind: "manifest";
      name: string;
      templateVersion: string;
      provider: string;
    }
  | { kind: "config"; appName: string; provider: string; environment: string } {
  const root = resolve(directory);
  if (existsSync(join(root, MANIFEST_FILENAME))) {
    const manifest = loadProjectManifest(root);
    return {
      kind: "manifest",
      name: manifest.project.name,
      templateVersion: manifest.project.templateVersion,
      provider: manifest.provider?.id ?? "none",
    };
  }
  const config = readConfig(join(root, CONFIG_FILE_NAME));
  return {
    kind: "config",
    appName: config.appName,
    provider: config.provider,
    environment: config.environment,
  };
}

export const validateCommand = new Command("validate")
  .description("Validate the LaunchStack project manifest or config file")
  .action(() => {
    try {
      const project = validateProject();
      if (project.kind === "manifest") {
        console.log("LaunchStack project manifest is valid");
        console.log(`Project: ${project.name}`);
        console.log(`Template: ${project.templateVersion}`);
        console.log(`Provider: ${project.provider}`);
      } else {
        console.log("LaunchStack config is valid");
        console.log(`App: ${project.appName}`);
        console.log(`Provider: ${project.provider}`);
        console.log(`Environment: ${project.environment}`);
      }
    } catch (error) {
      console.log("LaunchStack project is invalid");

      if (error instanceof Error) {
        console.log(error.message);
      }

      process.exit(1);
    }
  });
