import { existsSync, writeFileSync } from "node:fs";
import { Command } from "commander";
import { readConfig } from "../config";

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
  .description("Create Dockerfile, .dockerignore, and docker-compose.yml")
  .option("-f, --force", "Overwrite existing Docker files")
  .action((options) => {
    const config = readConfig();
    const force = Boolean(options.force);

    const dockerfile = `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN ${config.buildCommand}

EXPOSE 3000

CMD ["npm", "start"]
`;

    const dockerignore = `node_modules
dist
.git
.env
.launchstack
npm-debug.log
`;

    const compose = `services:
  ${config.appName}:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: ${config.environment}
`;

    writeFileIfAllowed("Dockerfile", dockerfile, force);
    writeFileIfAllowed(".dockerignore", dockerignore, force);
    writeFileIfAllowed("docker-compose.yml", compose, force);
  });