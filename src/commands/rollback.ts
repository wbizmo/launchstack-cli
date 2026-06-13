import { Command } from "commander";
import { readHistory } from "../history";

export const rollbackCommand = new Command("rollback")
  .description("Show the latest successful deployment available for rollback")
  .action(() => {
    const records = readHistory();
    const latestSuccess = records.find((record) => record.status === "success");

    if (!latestSuccess) {
      console.log("No successful deployment found for rollback");
      return;
    }

    console.log("Rollback target found");
    console.log(`Deployment: ${latestSuccess.id}`);
    console.log(`App: ${latestSuccess.appName}`);
    console.log(`Environment: ${latestSuccess.environment}`);
    console.log(`Provider: ${latestSuccess.provider}`);
    console.log(`Deploy target: ${latestSuccess.deployTarget}`);
    console.log(`Created: ${latestSuccess.createdAt}`);
  });