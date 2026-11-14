import { Command } from "commander";
import { createDevPlan, DevOrchestrator, selectDevPlan, type DevStatus } from "../dev/orchestrator";
export const devCommand = new Command("dev").description("Start LaunchStack-managed local development services").option("-d, --directory <path>").option("--service <id>", "Start one service plus its dependencies").option("--no-migrate", "Skip the development migration process").option("--plan", "Print the resolved service plan and exit").option("--json", "Emit structured service status events").option("--readiness-timeout <ms>", "Readiness timeout", "30000").action(async (options: { directory?: string; service?: string; migrate: boolean; plan?: boolean; json?: boolean; readinessTimeout: string }) => {
  try {
    const plan = selectDevPlan(createDevPlan(options.directory ?? process.cwd()), { service: options.service, noMigrate: options.migrate === false });
    if (options.plan) { if (options.json) console.log(JSON.stringify(plan, null, 2)); else for (const service of plan.services) console.log(`${service.id}\t${service.kind}\t${service.dependencies.join(",") || "-"}`); return; }
    const timeoutMs = Number.parseInt(options.readinessTimeout, 10);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300_000) throw new Error("--readiness-timeout must be between 1000 and 300000 milliseconds.");
    const report = (service: string, status: DevStatus, detail?: string) => {
      const event = { timestamp: new Date().toISOString(), service, status, ...(detail ? { detail } : {}) };
      if (options.json) console.log(JSON.stringify(event));
      else console.log(`${status.toUpperCase()} ${service}${detail ? `: ${detail}` : ""}`);
    };
    const orchestrator = new DevOrchestrator(plan, undefined, report);
    let stopping = false;
    const stop = async (code: number) => { if (stopping) return; stopping = true; await orchestrator.stop(); process.exitCode = code; };
    process.once("SIGINT", () => void stop(130));
    process.once("SIGTERM", () => void stop(143));
    await orchestrator.start({ readinessTimeoutMs: timeoutMs });
    report("environment", "ready", "Use SIGINT or SIGTERM to stop LaunchStack-owned processes and the namespaced Compose project.");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (options.json) console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: "environment", status: "failed", detail }));
    else console.error(detail);
    process.exitCode = 1;
  }
});
