#!/usr/bin/env node

import { Command } from "commander";
import { deployCommand } from "./commands/deploy";
import { statusCommand } from "./commands/status";
import { initCommand } from "./commands/init";

const program = new Command();

program
  .name("launchstack")
  .description("Deployment and release workflow CLI")
  .version("1.0.0");

program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);

program.parse();