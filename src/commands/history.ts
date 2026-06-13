import { Command } from "commander";
import { readHistory } from "../history";

export const historyCommand = new Command("history")
  .description("Show recent LaunchStack deployments")
  .option("-l, --limit <number>", "Number of records to show", "10")
  .action((options) => {
    const records = readHistory();
    const limit = Number(options.limit);

    if (records.length === 0) {
      console.log("No deployment history found");
      return;
    }

    records.slice(0, limit).forEach((record) => {
      console.log(`${record.id}`);
      console.log(`App: ${record.appName}`);
      console.log(`Environment: ${record.environment}`);
      console.log(`Provider: ${record.provider}`);
      console.log(`Status: ${record.status}`);
      console.log(`Created: ${record.createdAt}`);
      console.log("");
    });
  });