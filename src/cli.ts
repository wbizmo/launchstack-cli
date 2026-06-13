#!/usr/bin/env node

import { Command } from "commander";
import { deployCommand } from "./commands/deploy";
import { envCommand } from "./commands/env";
import { initCommand } from "./commands/init";
import { statusCommand } from "./commands/status";
import { validateCommand } from "./commands/validate";

const program = new Command();

program
  .name("launchstack")
  .description("Deployment and release workflow CLI")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);
program.addCommand(validateCommand);
program.addCommand(envCommand);

program.parse();