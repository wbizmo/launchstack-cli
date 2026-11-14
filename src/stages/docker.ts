import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { acquireHostPortLock } from "../dev/orchestrator";
import type { StageProviderAdapter } from "./types";
function run(projectDirectory: string, args: string[], environment: Record<string, string> = {}): string { return execFileSync("docker", args, { cwd: projectDirectory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...environment } }); }
function composeArgs(projectDirectory: string, resourceId: string): string[] { const args = ["compose", "-p", resourceId, "-f", "docker-compose.yml"]; if (existsSync(join(projectDirectory, "docker-compose.launchstack.yml"))) args.push("-f", "docker-compose.launchstack.yml"); return args; }
function portAvailable(port: number): Promise<boolean> { return new Promise((resolve) => { const server = createServer(); server.unref(); server.once("error", () => resolve(false)); server.listen({ host: "127.0.0.1", port }, () => server.close(() => resolve(true))); }); }
async function allocatePort(start: number): Promise<number> { for (let port = start; port < start + 1000 && port < 65536; port += 1) if (await portAvailable(port)) return port; throw new Error(`No free preview port near ${start}.`); }
export const dockerStageAdapter: StageProviderAdapter = {
  id: "docker",
  capabilities: { create: true, inspect: true, update: true, destroy: true },
  async create(input) {
    const releasePortLock = await acquireHostPortLock();
    const seed = createHash("sha256").update(input.resourceId).digest("hex");
    const postgresStart = 20_000 + (Number.parseInt(seed.slice(0, 6), 16) % 10_000);
    const redisStart = 30_000 + (Number.parseInt(seed.slice(6, 12), 16) % 10_000);
    const apiStart = 40_000 + (Number.parseInt(seed.slice(6, 12), 16) % 10_000);
    let buildOverrideDirectory: string | undefined;
    try {
      const postgresPort = Number(input.environment.LAUNCHSTACK_POSTGRES_PORT) || await allocatePort(postgresStart);
      const hasCapabilities = existsSync(join(input.projectDirectory, "docker-compose.launchstack.yml"));
      const redisPort = hasCapabilities ? Number(input.environment.LAUNCHSTACK_REDIS_PORT) || await allocatePort(redisStart) : undefined;
      let apiPort = Number(input.environment.LAUNCHSTACK_API_PORT) || await allocatePort(apiStart);
      while (apiPort === postgresPort || apiPort === redisPort) apiPort = await allocatePort(apiPort + 1);
      const environment = { ...input.environment, LAUNCHSTACK_POSTGRES_PORT: String(postgresPort), ...(redisPort ? { LAUNCHSTACK_REDIS_PORT: String(redisPort) } : {}), LAUNCHSTACK_API_PORT: String(apiPort) };
      const args = composeArgs(input.projectDirectory, input.resourceId);
      const caFile = process.env.NODE_EXTRA_CA_CERTS;
      if (caFile) {
        try {
          if (statSync(caFile).isFile()) {
            buildOverrideDirectory = mkdtempSync(join(tmpdir(), "launchstack-stage-build-"));
            const override = {
              services: { api: { build: { secrets: ["npmca"] } } },
              secrets: { npmca: { file: caFile } }
            };
            writeFileSync(join(buildOverrideDirectory, "compose.yml"), JSON.stringify(override), { mode: 0o600 });
            args.push("-f", join(buildOverrideDirectory, "compose.yml"));
          }
        } catch { /* A missing optional CA file leaves Docker's normal trust store in use. */ }
      }
      args.push("up", "-d", "--build", "--wait", "--wait-timeout", "120");
      run(input.projectDirectory, args, environment);
      return { resourceId: input.resourceId, url: process.env.LAUNCHSTACK_PREVIEW_URL ?? `http://127.0.0.1:${apiPort}` };
    } finally {
      if (buildOverrideDirectory) rmSync(buildOverrideDirectory, { recursive: true, force: true });
      releasePortLock();
    }
  },
  inspect(input) {
    try {
      const output = run(input.projectDirectory, [...composeArgs(input.projectDirectory, input.resourceId), "ps", "--format", "json"]).trim();
      if (!output) return { exists: false };
      const records = output.split(/\r?\n/).flatMap((line) => { try { const value = JSON.parse(line); return Array.isArray(value) ? value : [value]; } catch { return []; } });
      if (!records.length) return { exists: false };
      const healthy = records.every((record) => record && typeof record === "object" && String((record as { State?: unknown }).State).toLowerCase() === "running" && String((record as { Health?: unknown }).Health).toLowerCase() === "healthy");
      return { exists: true, status: healthy ? "healthy" : "degraded" };
    } catch { return { exists: false }; }
  },
  destroy(input) { run(input.projectDirectory, [...composeArgs(input.projectDirectory, input.resourceId), "down", "--remove-orphans", "--volumes"], input.environment); }
};
