import { createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, existsSync, lstatSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { loadProjectManifest } from "../project/manifest";

export type DevStatus = "started" | "ready" | "degraded" | "failed" | "stopped";
export type DevService = {
  id: string;
  kind: "infrastructure" | "migration" | "process";
  dependencies: string[];
  command: string;
  args: string[];
  port?: number;
  portEnvironment?: string;
  readiness?: "http" | "compose" | "exit";
  healthPath?: string;
  environment?: Record<string, string>;
  required: boolean;
};
export type DevPlan = { projectDirectory: string; namespace: string; services: DevService[] };
export type DevProcess = Pick<ChildProcess, "pid" | "kill" | "once">;
export type PortLease = { port: number; release: () => Promise<void> };
export type DevAdapters = {
  spawn: (command: string, args: string[], options: { cwd: string; stdio: "inherit"; env: NodeJS.ProcessEnv }) => DevProcess;
  reservePort: (port: number) => Promise<PortLease | undefined>;
  acquirePortLock: () => Promise<() => void>;
  probeHttp: (url: string, timeoutMs: number) => Promise<boolean>;
  signal: (child: DevProcess, signal: NodeJS.Signals) => void;
  sleep: (ms: number) => Promise<void>;
};
export async function acquireHostPortLock(): Promise<() => void> {
  const path = join(tmpdir(), "launchstack-dev-port-allocation.lock"); const token = `${process.pid}:${createHash("sha256").update(`${Date.now()}:${Math.random()}`).digest("hex")}`; const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    try { const descriptor = openSync(path, "wx", 0o600); try { writeFileSync(descriptor, token, "utf8"); } finally { closeSync(descriptor); } return () => { try { if (readFileSync(path, "utf8") === token) unlinkSync(path); } catch { /* Lock is already gone. */ } }; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const stat = lstatSync(path);
        if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("Development port allocation lock is not a regular file.");
        const ownerContents = readFileSync(path, "utf8");
        if (!ownerContents.trim()) { await new Promise((done) => setTimeout(done, 50)); continue; }
        const ownerPid = Number(ownerContents.split(":", 1)[0]);
        if (!Number.isSafeInteger(ownerPid) || ownerPid < 1) throw new Error("Development port allocation lock has an invalid owner.");
        let alive = true; try { process.kill(ownerPid, 0); } catch (probeError) { if ((probeError as NodeJS.ErrnoException).code === "ESRCH") alive = false; }
        if (!alive) { const current = statSync(path); if (current.ino === stat.ino) unlinkSync(path); continue; }
      } catch (readError) { if ((readError as NodeJS.ErrnoException).code === "ENOENT") continue; throw readError; }
      await new Promise((done) => setTimeout(done, 50));
    }
  }
  throw new Error("Timed out waiting for the host port allocation lock.");
}
const defaultAdapters: DevAdapters = {
  spawn(command, args, options) { return spawn(command, args, { ...options, shell: false, detached: process.platform !== "win32" }); },
  reservePort(port) { return new Promise((done) => { const server = createServer(); server.unref(); server.once("error", () => done(undefined)); server.listen({ host: "127.0.0.1", port }, () => done({ port, release: () => new Promise((resolve) => server.close(() => resolve())) })); }); },
  acquirePortLock: acquireHostPortLock,
  async probeHttp(url, timeoutMs) { try { const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) }); return response.ok; } catch { return false; } },
  signal(child, signal) { if (child.pid && process.platform !== "win32") { try { process.kill(-child.pid, signal); return; } catch { /* Process already exited or is not a group leader. */ } } try { child.kill(signal); } catch { /* Process already exited. */ } },
  sleep(ms) { return new Promise((done) => setTimeout(done, ms)); }
};
function safeProjectNamespace(name: string, directory: string): string {
  const normalized = name.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^[^a-z0-9]+/, "").slice(0, 24) || "project";
  const suffix = createHash("sha256").update(resolve(directory)).digest("hex").slice(0, 10);
  return `ls-${normalized}-${suffix}`;
}
function readDotEnv(projectDirectory: string): Record<string, string> {
  const path = resolve(projectDirectory, ".env");
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, "utf8").split(/\r?\n/).flatMap((line) => {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) return [];
    const value = match[2]!.replace(/^(['"])(.*)\1$/, "$2");
    return [[match[1]!, value]];
  }));
}
function loopbackDatabaseUrl(value: string | undefined, port: number): string {
  if (!value) throw new Error("DATABASE_URL is missing; set it in .env before running development migrations.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("DATABASE_URL is invalid; refusing to run development migrations."); }
  const host = url.hostname.toLowerCase();
  if (!(["localhost", "127.0.0.1", "::1"].includes(host)) || /(^|[_-])prod(uction)?($|[_-])/i.test(url.pathname)) throw new Error("Refusing automatic development migrations against a non-loopback or production-looking database URL.");
  url.hostname = "127.0.0.1";
  url.port = String(port);
  return url.toString();
}
export function topologicalServices(services: DevService[]): DevService[] {
  const byId = new Map(services.map((item) => [item.id, item])); const indegree = new Map<string, number>(); const dependents = new Map<string, string[]>();
  for (const item of services) { indegree.set(item.id, item.dependencies.length); for (const dep of item.dependencies) { if (!byId.has(dep)) throw new Error(`Unknown dev service dependency ${dep} for ${item.id}`); const list = dependents.get(dep) ?? []; list.push(item.id); dependents.set(dep, list); } }
  const queue = services.filter((item) => (indegree.get(item.id) ?? 0) === 0).sort((a, b) => a.id.localeCompare(b.id)); const ordered: DevService[] = [];
  while (queue.length) { const item = queue.shift(); if (!item) break; ordered.push(item); for (const id of (dependents.get(item.id) ?? []).sort()) { const next = (indegree.get(id) ?? 0) - 1; indegree.set(id, next); if (next === 0) { const dependent = byId.get(id); if (dependent) { queue.push(dependent); queue.sort((a, b) => a.id.localeCompare(b.id)); } } } }
  if (ordered.length !== services.length) throw new Error("Development service dependency cycle detected."); return ordered;
}
export function createDevPlan(projectDirectoryInput: string): DevPlan {
  const projectDirectory = resolve(projectDirectoryInput); const manifest = loadProjectManifest(projectDirectory); const capabilities = new Set(Object.keys(manifest.capabilities)); const namespace = safeProjectNamespace(manifest.project.name, projectDirectory);
  const composeArgs = ["compose", "-p", namespace, "-f", "docker-compose.yml"];
  if (existsSync(resolve(projectDirectory, "docker-compose.launchstack.yml"))) composeArgs.push("-f", "docker-compose.launchstack.yml");
  const services: DevService[] = [{ id: "postgres", kind: "infrastructure", dependencies: [], command: "docker", args: [...composeArgs, "up", "-d", "--wait", "postgres"], port: 5432, portEnvironment: "LAUNCHSTACK_POSTGRES_PORT", readiness: "compose", required: true }];
  if (capabilities.has("redis") || capabilities.has("queue")) services.push({ id: "redis", kind: "infrastructure", dependencies: [], command: "docker", args: [...composeArgs, "up", "-d", "--wait", "redis"], port: 6379, portEnvironment: "LAUNCHSTACK_REDIS_PORT", readiness: "compose", required: true });
  services.push({ id: "migrations", kind: "migration", dependencies: ["postgres"], command: "npm", args: ["run", "dev:migrate"], required: true });
  services.push({ id: "api", kind: "process", dependencies: ["postgres", ...(capabilities.has("redis") || capabilities.has("queue") ? ["redis"] : []), "migrations"], command: "npm", args: ["run", "dev"], port: 3000, portEnvironment: "PORT", readiness: "http", healthPath: "/ready", required: true });
  if (capabilities.has("queue")) services.push({ id: "worker", kind: "process", dependencies: ["redis", "migrations"], command: "npm", args: ["run", "worker"], port: 3101, portEnvironment: "LAUNCHSTACK_WORKER_HEALTH_PORT", readiness: "http", healthPath: "/healthz", required: true });
  if (capabilities.has("cron")) services.push({ id: "scheduler", kind: "process", dependencies: ["migrations"], command: "npm", args: ["run", "scheduler"], port: 3102, portEnvironment: "LAUNCHSTACK_SCHEDULER_HEALTH_PORT", readiness: "http", healthPath: "/healthz", required: false });
  return { projectDirectory, namespace, services: topologicalServices(services) };
}
export function selectDevPlan(plan: DevPlan, options: { service?: string; noMigrate?: boolean }): DevPlan {
  let services = plan.services;
  if (options.noMigrate) services = services.filter((item) => item.id !== "migrations").map((item) => ({ ...item, dependencies: item.dependencies.filter((dep) => dep !== "migrations") }));
  if (options.service) { const byId = new Map(services.map((item) => [item.id, item])); if (!byId.has(options.service)) throw new Error(`Unknown dev service: ${options.service}`); const selected = new Set<string>(); const visit = (id: string) => { if (selected.has(id)) return; const item = byId.get(id); if (!item) throw new Error(`Missing selected dependency: ${id}`); selected.add(id); for (const dep of item.dependencies) visit(dep); }; visit(options.service); services = services.filter((item) => selected.has(item.id)); }
  return { ...plan, services: topologicalServices(services) };
}
function waitForExit(child: DevProcess, timeoutMs: number): Promise<number | null> { return new Promise((done, reject) => { let settled = false; const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error(`Process ${child.pid ?? "unknown"} did not exit within ${timeoutMs}ms`)); } }, timeoutMs); child.once("exit", (code: number | null) => { if (settled) return; settled = true; clearTimeout(timer); done(code); }); child.once("error", (error: Error) => { if (settled) return; settled = true; clearTimeout(timer); reject(error); }); }); }
async function waitUntilReady(service: DevService, port: number, adapters: DevAdapters, timeoutMs: number, child: DevProcess): Promise<void> {
  if (service.readiness === "exit" || service.readiness === "compose") return;
  if (service.readiness !== "http") throw new Error(`Service ${service.id} has no readiness probe configured.`);
  const deadline = Date.now() + timeoutMs; let lastStatus = "no response"; let exited = false;
  child.once("exit", (code: number | null) => { exited = true; lastStatus = `process exited with code ${String(code)}`; });
  while (Date.now() < deadline) {
    if (exited) throw new Error(`Service ${service.id} exited before its readiness probe passed: ${lastStatus}.`);
    const ready = await adapters.probeHttp(`http://127.0.0.1:${port}${service.healthPath ?? "/health"}`, Math.min(1000, timeoutMs));
    if (ready) return;
    lastStatus = "HTTP readiness endpoint did not return a successful response";
    await adapters.sleep(100);
  }
  throw new Error(`Timed out waiting for ${service.id} readiness at 127.0.0.1:${port}${service.healthPath ?? "/health"}: ${lastStatus}.`);
}
export class DevOrchestrator {
  private readonly children = new Set<DevProcess>(); private readonly processGroups = new Set<DevProcess>(); private stopped = false; private stopPromise: Promise<void> | null = null; private composeStarted = false;
  private readonly ports = new Map<string, number>(); private readonly environment: Record<string, string>;
  private readonly portLeases = new Map<string, PortLease>();
  private releasePortLock: (() => void) | null = null;
  constructor(private readonly plan: DevPlan, private readonly adapters: DevAdapters = defaultAdapters, private readonly report: (service: string, status: DevStatus, detail?: string) => void = () => {}) { this.environment = readDotEnv(plan.projectDirectory); }
  private async allocatePort(service: DevService): Promise<PortLease | undefined> {
    if (service.port === undefined) return undefined;
    for (let candidate = service.port; candidate <= Math.min(service.port + 1000, 65535); candidate += 1) { const lease = await this.adapters.reservePort(candidate); if (lease) return lease; }
    throw new Error(`No available port found for ${service.id} near ${service.port}.`);
  }
  private async reservePorts(): Promise<void> {
    for (const service of this.plan.services) {
      if (service.port === undefined) continue;
      const lease = await this.allocatePort(service);
      if (!lease) continue;
      this.portLeases.set(service.id, lease); this.ports.set(service.id, lease.port);
      if (service.portEnvironment) this.environment[service.portEnvironment] = String(lease.port);
    }
  }
  private serviceEnvironment(service: DevService): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env, ...this.environment, ...service.environment };
    if (service.id === "migrations") env.DATABASE_URL = loopbackDatabaseUrl(this.environment.DATABASE_URL ?? process.env.DATABASE_URL, this.ports.get("postgres") ?? 5432);
    if (["api", "worker"].includes(service.id) && this.ports.has("redis")) env.REDIS_URL = `redis://127.0.0.1:${this.ports.get("redis")}`;
    if (["api", "worker"].includes(service.id) && this.ports.has("postgres")) env.DATABASE_URL = loopbackDatabaseUrl(this.environment.DATABASE_URL ?? process.env.DATABASE_URL, this.ports.get("postgres")!);
    return env;
  }
  async start(options: { readinessTimeoutMs?: number } = {}): Promise<void> {
    const timeoutMs = options.readinessTimeoutMs ?? 30_000;
    try {
      this.releasePortLock = await this.adapters.acquirePortLock();
      await this.reservePorts();
      const pendingInfrastructure = new Set(this.plan.services.filter((service) => service.kind === "infrastructure").map((service) => service.id));
      for (const service of this.plan.services) {
        if (this.releasePortLock && pendingInfrastructure.size === 0 && service.kind !== "infrastructure") { this.releasePortLock(); this.releasePortLock = null; }
        if (service.kind === "migration") {
          const databaseUrl = this.environment.DATABASE_URL ?? process.env.DATABASE_URL;
          if (this.environment.NODE_ENV === "production" || process.env.NODE_ENV === "production") throw new Error("Refusing to run automatic development migrations when NODE_ENV is production.");
          loopbackDatabaseUrl(databaseUrl, this.ports.get("postgres") ?? 5432);
        }
        if (service.kind === "infrastructure") this.composeStarted = true;
        const lease = this.portLeases.get(service.id);
        this.report(service.id, "started", lease ? `loopback port ${lease.port}` : undefined);
        if (lease) { await lease.release(); this.portLeases.delete(service.id); }
        const child = this.adapters.spawn(service.command, service.args, { cwd: this.plan.projectDirectory, stdio: "inherit", env: this.serviceEnvironment(service) });
        this.children.add(child);
        this.processGroups.add(child);
        child.once("exit", (code: number | null) => {
          this.children.delete(child);
          if (service.kind === "infrastructure" && code === 0) this.composeStarted = true;
          if (!this.stopped && service.kind === "process") {
            const detail = `process exited unexpectedly with code ${String(code)}`;
            this.report(service.id, service.required ? "failed" : "degraded", detail);
            if (service.required) void this.stop();
          }
        });
        child.once("error", (error: Error) => {
          this.children.delete(child);
          if (!this.stopped && service.kind === "process") {
            const detail = `process failed to spawn: ${error.message}`;
            this.report(service.id, service.required ? "failed" : "degraded", detail);
            if (service.required) void this.stop();
          }
        });
        if (service.kind !== "process") {
          const code = await waitForExit(child, timeoutMs);
          this.children.delete(child);
          if (code !== 0 && service.required) throw new Error(`${service.id} failed with exit code ${String(code)}.`);
          if (service.kind === "infrastructure" && code === 0) this.composeStarted = true;
        }
        if (service.readiness === "http") {
          const port = this.ports.get(service.id);
          if (!port) throw new Error(`${service.id} has no allocated readiness port.`);
          await waitUntilReady(service, port, this.adapters, timeoutMs, child);
        }
        this.report(service.id, "ready");
        if (service.kind === "infrastructure") {
          pendingInfrastructure.delete(service.id);
          if (pendingInfrastructure.size === 0 && this.releasePortLock) { this.releasePortLock(); this.releasePortLock = null; }
        }
      }
      if (this.releasePortLock) { this.releasePortLock(); this.releasePortLock = null; }
    } catch (error) {
      this.report("environment", "failed", error instanceof Error ? error.message : String(error));
      await this.stop();
      throw error;
    }
  }
  async stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    this.stopped = true;
    this.stopPromise = (async () => {
      await Promise.all([...this.portLeases.values()].map((lease) => lease.release()));
      this.portLeases.clear();
      if (this.releasePortLock) { this.releasePortLock(); this.releasePortLock = null; }
      const children = [...this.children];
      const exitWaits = children.map((child) => waitForExit(child, 5_000));
      for (const child of this.processGroups) this.adapters.signal(child, "SIGTERM");
      await Promise.race([Promise.allSettled(exitWaits), this.adapters.sleep(5_100)]);
      for (const child of this.processGroups) this.adapters.signal(child, "SIGKILL");
      this.children.clear();
      this.processGroups.clear();
      if (this.composeStarted) {
        const args = ["compose", "-p", this.plan.namespace, "-f", "docker-compose.yml"];
        if (existsSync(resolve(this.plan.projectDirectory, "docker-compose.launchstack.yml"))) args.push("-f", "docker-compose.launchstack.yml");
        const child = this.adapters.spawn("docker", [...args, "down", "--remove-orphans"], { cwd: this.plan.projectDirectory, stdio: "inherit", env: { ...process.env, ...this.environment } });
        const code = await waitForExit(child, 30_000).catch(() => { this.adapters.signal(child, "SIGTERM"); return null; });
        if (code !== 0) this.report("compose", "degraded", "owned Compose project could not be fully stopped; its named project is preserved for inspection");
      }
      this.report("environment", "stopped");
    })();
    return this.stopPromise;
  }
}
