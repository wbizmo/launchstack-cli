import { existsSync, writeFileSync } from "node:fs";
import { Command } from "commander";
import { readConfig } from "../config";
import {
  renderDockerfile,
  renderDockerIgnore
} from "../docker-assets";

function writeFileIfAllowed(path: string, content: string, force: boolean) {
  if (existsSync(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }

  writeFileSync(path, content);
  console.log(`Created ${path}`);
}

export const dockerCommand = new Command("docker")
  .description("Generate Docker deployment files");

dockerCommand
  .command("init")
  .description("Create hardened Dockerfile, .dockerignore, and docker-compose.yml")
  .option("-f, --force", "Overwrite existing Docker files")
  .action((options) => {
    const config = readConfig();
    const force = Boolean(options.force);
    const hasLockfile = existsSync("package-lock.json");
    const prisma = existsSync("prisma/schema.prisma");

    const dockerfile = renderDockerfile({
      buildCommand: config.buildCommand,
      outputDirectory: config.outputDirectory,
      hasLockfile,
      prisma
    });

    const compose = `services:
  ${config.appName}:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: ${config.environment}
`;

    writeFileIfAllowed("Dockerfile", dockerfile, force);
    writeFileIfAllowed(".dockerignore", renderDockerIgnore(), force);
    writeFileIfAllowed("docker-compose.yml", compose, force);
  });
