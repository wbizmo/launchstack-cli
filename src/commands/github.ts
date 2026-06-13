import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Command } from "commander";
import { readConfig } from "../config";

function writeWorkflowFile(
  path: string,
  content: string,
  force: boolean
) {
  if (existsSync(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);

  console.log(`Created ${path}`);
}

export const githubCommand = new Command("github")
  .description("Generate GitHub Actions workflows");

githubCommand
  .command("init")
  .description("Create a deployment workflow")
  .option("-f, --force", "Overwrite existing workflow")
  .action((options) => {
    const config = readConfig();

    const workflow = `name: Deploy

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Dependencies
        run: npm install

      - name: Build Project
        run: ${config.buildCommand}
`;

    writeWorkflowFile(
      ".github/workflows/deploy.yml",
      workflow,
      Boolean(options.force)
    );
  });