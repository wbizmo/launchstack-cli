import { Command } from "commander";
import { runDoctor } from "../release/doctor";
import { applyUpgrade, planUpgrade } from "../project/upgrade";

type DoctorOptions = { directory?: string; json?: boolean; fix?: boolean };
export const doctorCommand = new Command("doctor")
  .description("Inspect a generated LaunchStack project for missing production files and configuration")
  .option("-d, --directory <path>", "Project directory to inspect")
  .option("--json", "Print the doctor report as JSON")
  .option("--fix", "Apply deterministic LaunchStack metadata/ownership repairs when safe")
  .action((options: DoctorOptions) => {
    const directory = options.directory ?? process.cwd();
    try {
      let fixes: string[] = [];
      if (options.fix) {
        const plan = planUpgrade(directory);
        if (plan.conflicts.length) throw new Error(`doctor --fix found ambiguous project edits: ${plan.conflicts.join("; ")}`);
        if (plan.actions.length) { applyUpgrade(plan); fixes = plan.actions.map((action) => `${action.kind}:${action.target}`); }
      }
      const report = runDoctor(directory);
      if (options.json) { console.log(JSON.stringify({ ...report, fixes }, null, 2)); process.exitCode = report.healthy ? 0 : 1; return; }
      console.log(`LaunchStack doctor: ${report.projectDirectory}`); console.log(""); for (const check of report.checks) console.log(`${check.passed ? "PASS" : "FAIL"}  ${check.name}: ${check.detail}`); if (fixes.length) { console.log(""); for (const fix of fixes) console.log(`FIXED ${fix}`); } console.log(""); if (report.healthy) console.log("Project health check passed."); else { console.error("Project health check failed."); process.exitCode = 1; }
    } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
  });
