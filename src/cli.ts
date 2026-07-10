#!/usr/bin/env node

import { Command } from "commander";
import { createCommand } from "./commands/create";
import { deployCommand } from "./commands/deploy";
import { dockerCommand } from "./commands/docker";
import { envCommand } from "./commands/env";
import { githubCommand } from "./commands/github";
import { historyCommand } from "./commands/history";
import { initCommand } from "./commands/init";
import { providerCommand } from "./commands/provider";
import { rollbackCommand } from "./commands/rollback";
import { secretsCommand } from "./commands/secrets";
import { statusCommand } from "./commands/status";
import { validateCommand } from "./commands/validate";

const program = new Command();

program
  .name("launchstack")
  .description(
    "Backend API scaffolding, deployment automation, and developer workflow CLI"
  )
  .version("1.0.0");

program.addCommand(createCommand);
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);
program.addCommand(validateCommand);
program.addCommand(envCommand);
program.addCommand(providerCommand);
program.addCommand(secretsCommand);
program.addCommand(historyCommand);
program.addCommand(rollbackCommand);
program.addCommand(dockerCommand);
program.addCommand(githubCommand);

program.parse();
