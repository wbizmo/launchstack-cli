import { Command } from "commander";

export const deployCommand = new Command("deploy")
  .description("Deploy application")
  .action(() => {
    console.log("Deployment started");
  });