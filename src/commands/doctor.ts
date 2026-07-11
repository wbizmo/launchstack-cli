import { Command } from "commander";
import { runDoctor } from "../release/doctor";

type DoctorOptions = {
  directory?: string;
  json?: boolean;
};

export const doctorCommand = new Command("doctor")
  .description(
    "Inspect a generated LaunchStack project for missing production files and configuration"
  )
  .option(
    "-d, --directory <path>",
    "Project directory to inspect"
  )
  .option(
    "--json",
    "Print the doctor report as JSON"
  )
  .action((options: DoctorOptions) => {
    const report = runDoctor(
      options.directory ?? process.cwd()
    );

    if (options.json) {
      console.log(
        JSON.stringify(report, null, 2)
      );

      process.exitCode =
        report.healthy ? 0 : 1;

      return;
    }

    console.log(
      `LaunchStack doctor: ${report.projectDirectory}`
    );

    console.log("");

    for (const check of report.checks) {
      const marker = check.passed
        ? "PASS"
        : "FAIL";

      console.log(
        `${marker}  ${check.name}: ${check.detail}`
      );
    }

    console.log("");

    if (report.healthy) {
      console.log(
        "Project health check passed."
      );
    } else {
      console.error(
        "Project health check failed."
      );

      process.exitCode = 1;
    }
  });
