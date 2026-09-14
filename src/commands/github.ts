import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Command } from "commander";
import { readConfig } from "../config";
import { atomicWriteText } from "../storage";

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
  atomicWriteText(path, content);

  console.log(`Created ${path}`);
}

export const githubCommand = new Command("github")
  .description("Generate GitHub Actions workflows");

githubCommand
  .command("init")
  .description("Create a lockfile-first CI workflow")
  .option("-f, --force", "Overwrite existing workflow")
  .action((options) => {
    const config = readConfig();

    const workflow = `name: CI

on:
  push:
    branches:
      - main
  pull_request:

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run project checks when available
        run: npm run check --if-present

      - name: Build project
        run: ${config.buildCommand}
`;

    writeWorkflowFile(
      ".github/workflows/ci.yml",
      workflow,
      Boolean(options.force)
    );
  });
