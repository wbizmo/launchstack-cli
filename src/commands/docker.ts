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
  .description("Create hardened Dockerfile, .dockerignore, and docker-compose.yml")
  .option("-f, --force", "Overwrite existing Docker files")
  .action((options) => {
    const config = readConfig();
    const force = Boolean(options.force);

    const dockerfile = `FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM dependencies AS build
COPY . .
RUN ${config.buildCommand}

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \\
  && npm cache clean --force
COPY --from=build /app/${config.outputDirectory} ./${config.outputDirectory}
USER node
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
