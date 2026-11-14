import { EventEmitter } from "node:events";
import { describe, expect, test } from "vitest";
import { DevOrchestrator, selectDevPlan, topologicalServices, type DevAdapters, type DevPlan, type DevProcess, type DevService } from "../src/dev/orchestrator";
describe("v3 dev orchestration", () => {
  test("orders dependencies before dependents", () => { const services: DevService[] = [{ id: "api", kind: "process", dependencies: ["db"], command: "npm", args: [], required: true }, { id: "db", kind: "infrastructure", dependencies: [], command: "docker", args: [], required: true }]; expect(topologicalServices(services).map((item) => item.id)).toEqual(["db", "api"]); });
  test("selects one service with dependencies and can omit migrations", () => { const plan: DevPlan = { projectDirectory: "/tmp/x", namespace: "ls-test", services: [{ id: "db", kind: "infrastructure", dependencies: [], command: "x", args: [], required: true }, { id: "migrations", kind: "migration", dependencies: ["db"], command: "x", args: [], required: true }, { id: "api", kind: "process", dependencies: ["db", "migrations"], command: "x", args: [], required: true }, { id: "worker", kind: "process", dependencies: ["db"], command: "x", args: [], required: false }] }; expect(selectDevPlan(plan, { service: "api", noMigrate: true }).services.map((item) => item.id)).toEqual(["db", "api"]); });
  test("rejects dependency cycles", () => { const services: DevService[] = [{ id: "a", kind: "process", dependencies: ["b"], command: "x", args: [], required: true }, { id: "b", kind: "process", dependencies: ["a"], command: "x", args: [], required: true }]; expect(() => topologicalServices(services)).toThrow(/cycle/i); });
  test("keeps deterministic order for a large ready set", () => {
    const services: DevService[] = Array.from({ length: 10_000 }, (_, index) => ({ id: `service-${String(9_999 - index).padStart(5, "0")}`, kind: "process", dependencies: [], command: "x", args: [], required: true }));
    const planned = topologicalServices(services);
    expect(planned).toHaveLength(10_000);
    expect(planned[0]?.id).toBe("service-00000");
    expect(planned.at(-1)?.id).toBe("service-09999");
  });
  test("waits for HTTP readiness and passes dynamically allocated ports", async () => {
    const child = new EventEmitter() as DevProcess;
    (child as DevProcess & { pid: number }).pid = 123;
    (child as DevProcess & { kill: () => void }).kill = () => child.emit("exit", 0);
    const envs: NodeJS.ProcessEnv[] = []; let probes = 0;
    const adapters: DevAdapters = { spawn(_command, _args, options) { envs.push(options.env); return child; }, reservePort: async (port) => port === 3000 ? undefined : { port, release: async () => {} }, acquirePortLock: async () => () => {}, probeHttp: async () => ++probes > 1, signal: (process) => process.kill("SIGTERM"), sleep: async () => {} };
    const reports: string[] = [];
    const plan: DevPlan = { projectDirectory: "/tmp/x", namespace: "ls-test", services: [{ id: "api", kind: "process", dependencies: [], command: "node", args: [], port: 3000, portEnvironment: "PORT", readiness: "http", healthPath: "/ready", required: true }] };
    const orchestrator = new DevOrchestrator(plan, adapters, (_id, status) => reports.push(status));
    await orchestrator.start({ readinessTimeoutMs: 1000 });
    expect(envs[0]?.PORT).toBe("3001");
    expect(probes).toBe(2);
    expect(reports).toContain("ready");
    await orchestrator.stop();
    expect(reports).toContain("stopped");
  });
  test("detects premature child exit before readiness", async () => {
    const child = new EventEmitter() as DevProcess;
    (child as DevProcess & { pid: number }).pid = 123;
    (child as DevProcess & { kill: () => void }).kill = () => child.emit("exit", 0);
    const adapters: DevAdapters = { spawn() { setTimeout(() => child.emit("exit", 17), 0); return child; }, reservePort: async (port) => ({ port, release: async () => {} }), acquirePortLock: async () => () => {}, probeHttp: async () => false, signal: (process) => process.kill("SIGTERM"), sleep: async () => new Promise((done) => setTimeout(done, 1)) };
    const plan: DevPlan = { projectDirectory: "/tmp/x", namespace: "ls-test", services: [{ id: "api", kind: "process", dependencies: [], command: "node", args: [], port: 3000, readiness: "http", required: true }] };
    await expect(new DevOrchestrator(plan, adapters).start({ readinessTimeoutMs: 1000 })).rejects.toThrow(/exited before its readiness probe/);
  });
  test("failed Docker startup tears down only the namespaced Compose project", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    let pid = 200;
    const adapters: DevAdapters = {
      spawn(command, args) { const child = new EventEmitter() as DevProcess; (child as DevProcess & { pid: number }).pid = pid++; (child as DevProcess & { kill: () => void }).kill = () => child.emit("exit", 0); calls.push({ command, args }); setTimeout(() => child.emit("exit", args.includes("down") ? 0 : 1), 0); return child; },
      reservePort: async () => undefined, acquirePortLock: async () => () => {}, probeHttp: async () => false,
      signal: (child) => child.kill("SIGTERM"), sleep: async () => {}
    };
    const plan: DevPlan = { projectDirectory: "/tmp/x", namespace: "ls-owned-123", services: [{ id: "postgres", kind: "infrastructure", dependencies: [], command: "docker", args: ["compose", "-p", "ls-owned-123", "up", "-d", "--wait"], required: true }] };
    await expect(new DevOrchestrator(plan, adapters).start()).rejects.toThrow(/postgres failed/);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.args).toContain("-p");
    expect(calls[1]?.args).toContain("ls-owned-123");
    expect(calls[1]?.args).toContain("down");
    expect(calls[1]?.args).toContain("--remove-orphans");
    expect(calls[1]?.args).not.toContain("--volumes");
  });
  test("times out a hung Docker operation and runs cleanup", async () => {
    const calls: string[][] = [];
    let pid = 300;
    const adapters: DevAdapters = {
      spawn(_command, args) { const child = new EventEmitter() as DevProcess; (child as DevProcess & { pid: number }).pid = pid++; (child as DevProcess & { kill: () => void }).kill = () => child.emit("exit", 0); calls.push(args); if (args.includes("down")) setTimeout(() => child.emit("exit", 0), 0); return child; },
      reservePort: async () => undefined, acquirePortLock: async () => () => {}, probeHttp: async () => false,
      signal: (child) => child.kill("SIGTERM"), sleep: async (ms) => new Promise((done) => setTimeout(done, Math.min(ms, 10)))
    };
    const plan: DevPlan = { projectDirectory: "/tmp/x", namespace: "ls-timeout", services: [{ id: "postgres", kind: "infrastructure", dependencies: [], command: "docker", args: ["compose", "up", "-d", "--wait"], required: true }] };
    await expect(new DevOrchestrator(plan, adapters).start({ readinessTimeoutMs: 1000 })).rejects.toThrow(/did not exit within 1000ms/);
    expect(calls.some((args) => args.includes("down"))).toBe(true);
  });
  test("keeps the process group owned after its parent exits unexpectedly", async () => {
    const child = new EventEmitter() as DevProcess;
    (child as DevProcess & { pid: number }).pid = 456;
    (child as DevProcess & { kill: () => void }).kill = () => {};
    const signals: string[] = [];
    const reports: string[] = [];
    const adapters: DevAdapters = { spawn: () => child, reservePort: async (port) => ({ port, release: async () => {} }), acquirePortLock: async () => () => {}, probeHttp: async () => true, signal: (_process, signal) => signals.push(signal), sleep: async () => {} };
    const plan: DevPlan = { projectDirectory: "/tmp/x", namespace: "ls-process", services: [{ id: "api", kind: "process", dependencies: [], command: "npm", args: ["run", "dev"], port: 3000, readiness: "http", required: true }] };
    await new DevOrchestrator(plan, adapters, (_service, status) => reports.push(status)).start();
    child.emit("exit", 17);
    for (let attempt = 0; attempt < 20 && !reports.includes("stopped"); attempt += 1) await new Promise((done) => setTimeout(done, 5));
    expect(reports).toContain("failed");
    expect(reports).toContain("stopped");
    expect(signals).toEqual(["SIGTERM", "SIGKILL"]);
  });
});
