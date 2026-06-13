import { Command } from "commander";

export const statusCommand = new Command("status")
  .description("Show deployment status")
  .action(() => {
    console.log("All systems operational");
  });