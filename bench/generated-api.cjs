const { spawn, spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const http = require("node:http");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { performance } = require("node:perf_hooks");

const root = resolve(
  process.env.LAUNCHSTACK_BENCH_REPO ?? join(__dirname, ".."),
);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const node = process.execPath;
const postgresContainer =
  process.env.LAUNCHSTACK_BENCH_POSTGRES_CONTAINER ??
  "launchstack-smoke-postgres";
const databaseName = `launchstack_bench_${process.pid}_${Date.now()}`;
const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:5432/${databaseName}`;
const project = join(
  mkdtempSync(join(tmpdir(), "launchstack-api-bench-")),
  "benchmark-api",
);
const temporary = require("node:path").dirname(project);
const port = Number(process.env.LAUNCHSTACK_BENCH_PORT ?? 49321);
const baseUrl = `http://127.0.0.1:${port}`;
const accessSecret = "launchstack-benchmark-access-secret-1234567890";
const refreshSecret = "launchstack-benchmark-refresh-secret-1234567890";
const requestCount = Number(process.env.LAUNCHSTACK_API_REQUESTS ?? 1000);
const authCycles = Number(process.env.LAUNCHSTACK_API_AUTH_CYCLES ?? 10);
let apiProcess;
let databaseCreated = false;
let apiLogTail = "";
const env = {
  ...process.env,
  NPM_CONFIG_CACHE: "/workspace/.npm-cache",
  DATABASE_URL: databaseUrl,
  NODE_ENV: "production",
  HOST: "127.0.0.1",
  PORT: String(port),
  CORS_ORIGIN: "https://benchmark.example",
  JWT_ACCESS_SECRET: accessSecret,
  JWT_REFRESH_SECRET: refreshSecret,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? env,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const detail = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
      .replaceAll(databaseUrl, "<database-url>")
      .replaceAll(accessSecret, "<redacted>")
      .replaceAll(refreshSecret, "<redacted>");
    throw new Error(
      `${command} ${args.join(" ")} failed with exit ${result.status ?? "unknown"}. ${detail.slice(-2500)}`,
    );
  }
  return result.stdout;
}
function timedRun(command, args, options = {}) {
  const started = performance.now();
  const output = run(command, args, options);
  return { output, elapsedMs: performance.now() - started };
}
function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return Number(
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
    ]?.toFixed(3) ?? 0,
  );
}
function send(path, options = {}, agent) {
  return new Promise((resolvePromise, rejectPromise) => {
    const body =
      options.body === undefined
        ? undefined
        : Buffer.from(JSON.stringify(options.body));
    const request = http.request(
      `${baseUrl}${path}`,
      {
        method: options.method ?? "GET",
        agent,
        headers: {
          ...(options.token
            ? { authorization: `Bearer ${options.token}` }
            : {}),
          ...(body
            ? {
                "content-type": "application/json",
                "content-length": String(body.length),
              }
            : {}),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data;
          try {
            data = text ? JSON.parse(text) : undefined;
          } catch {
            data = text;
          }
          resolvePromise({ status: response.statusCode ?? 0, data });
        });
      },
    );
    request.setTimeout(30_000, () =>
      request.destroy(new Error("request timeout")),
    );
    request.on("error", rejectPromise);
    if (body) request.write(body);
    request.end();
  });
}
async function waitReady() {
  const deadline = Date.now() + 60_000;
  let lastResponse;
  while (Date.now() < deadline) {
    if (apiProcess.exitCode !== null)
      throw new Error(
        `Generated API exited before readiness (${apiProcess.exitCode}): ${apiLogTail.slice(-1200)}`,
      );
    try {
      const response = await send("/ready");
      lastResponse = response;
      if (response.status === 200) return;
    } catch {
      await sleep(100);
    }
    await sleep(100);
  }
  throw new Error(
    `Generated API did not become ready within 60 seconds (last /ready: ${JSON.stringify(lastResponse)}). ${apiLogTail.slice(-1200)}`,
  );
}
async function resetQueries() {
  await send("/__benchmark/metrics/reset", { method: "POST" });
}
async function metrics() {
  const response = await send("/__benchmark/metrics");
  if (response.status !== 200)
    throw new Error("Benchmark metrics endpoint failed.");
  return response.data;
}
async function runPhase(name, operations) {
  await resetQueries();
  const before = await metrics();
  const started = performance.now();
  const results = await operations();
  const elapsed = performance.now() - started;
  const after = await metrics();
  const latencies = results
    .map((item) => item.elapsedMs)
    .sort((left, right) => left - right);
  const errors = results.filter(
    (item) => item.status < 200 || item.status >= 400,
  ).length;
  return {
    name,
    requests: results.length,
    elapsed_ms: Number(elapsed.toFixed(3)),
    latency_ms: {
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
    },
    throughput_rps: Number((results.length / (elapsed / 1000)).toFixed(2)),
    errors,
    http_statuses: results.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {}),
    database_queries: after.queryCount - before.queryCount,
    process_cpu_microseconds: {
      user: after.cpu.user - before.cpu.user,
      system: after.cpu.system - before.cpu.system,
    },
    process_peak_rss_bytes: after.maxRssBytes,
  };
}
async function measureOne(path, options = {}) {
  const started = performance.now();
  const response = await send(path, options);
  return {
    status: response.status,
    data: response.data,
    elapsedMs: performance.now() - started,
  };
}
async function parallelRequests(concurrency, total, operation) {
  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: concurrency,
    maxFreeSockets: concurrency,
  });
  const results = new Array(total);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, total) },
    async () => {
      while (true) {
        const index = next++;
        if (index >= total) break;
        results[index] = await operation(agent);
      }
    },
  );
  await Promise.all(workers);
  agent.destroy();
  return results;
}

async function main() {
  const setupTimings = {};
  run("docker", [
    "exec",
    postgresContainer,
    "createdb",
    "-U",
    "postgres",
    databaseName,
  ]);
  databaseCreated = true;
  setupTimings.template_create_ms = timedRun(node, [
    join(root, "dist", "cli.js"),
    "create",
    "benchmark-api",
    "--directory",
    temporary,
    "--no-install",
  ]).elapsedMs;
  setupTimings.resource_generation_ms = timedRun(node, [
    join(root, "dist", "cli.js"),
    "generate",
    "resource",
    "bench-record",
    "--field",
    "title:string",
    "--directory",
    project,
  ]).elapsedMs;
  const prismaSource = `import { PrismaClient } from "@prisma/client";\nlet queryCount = 0;\nexport const prisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });\nprisma.$on("query", () => { queryCount += 1; });\nexport function resetBenchmarkQueryCount(): void { queryCount = 0; }\nexport function getBenchmarkMetrics() { const cpu = process.cpuUsage(); return { queryCount, cpu: { user: cpu.user, system: cpu.system }, maxRssBytes: process.resourceUsage().maxRSS * 1024 }; }\n`;
  writeFileSync(join(project, "src", "lib", "prisma.ts"), prismaSource);
  const routesPath = join(project, "src", "routes", "index.ts");
  let routes = readFileSync(routesPath, "utf8");
  routes = routes.replace(
    'import { authRoutes } from "../modules/auth/auth.routes";',
    'import { authRoutes } from "../modules/auth/auth.routes";\nimport { getBenchmarkMetrics, resetBenchmarkQueryCount } from "../lib/prisma";',
  );
  routes = routes.replace(
    "  await registerGeneratedRoutes(app);",
    '  app.get("/__benchmark/metrics", async () => getBenchmarkMetrics());\n  app.post("/__benchmark/metrics/reset", async () => { resetBenchmarkQueryCount(); return { reset: true }; });\n  await registerGeneratedRoutes(app);',
  );
  writeFileSync(routesPath, routes);
  setupTimings.dependency_install_ms = timedRun(
    npm,
    ["ci", "--no-audit", "--no-fund"],
    { cwd: project, env: { ...env, NODE_ENV: "development" } },
  ).elapsedMs;
  setupTimings.database_push_ms = timedRun(
    npm,
    ["exec", "--", "prisma", "db", "push", "--skip-generate"],
    { cwd: project },
  ).elapsedMs;
  setupTimings.generated_api_build_ms = timedRun(npm, ["run", "build"], {
    cwd: project,
  }).elapsedMs;
  const apiStartedAt = performance.now();
  apiProcess = spawn(node, [join(project, "dist", "server.js")], {
    cwd: project,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [apiProcess.stdout, apiProcess.stderr])
    stream.on("data", (chunk) => {
      apiLogTail = (apiLogTail + chunk.toString("utf8")).slice(-5000);
    });
  await waitReady();
  const startupMs = performance.now() - apiStartedAt;
  const email = `bench-${process.pid}@example.com`;
  const registered = await measureOne("/api/auth/register", {
    method: "POST",
    body: { email, password: "Benchmark-password-123", name: "Benchmark" },
  });
  if (registered.status !== 201)
    throw new Error("Benchmark account registration failed.");
  const user = registered.data.data.user;
  let accessToken = registered.data.data.tokens.accessToken;
  let refreshToken = registered.data.data.tokens.refreshToken;
  const phases = [];
  phases.push(
    await runPhase("login-and-refresh", async () => {
      const results = [];
      for (let index = 0; index < authCycles; index += 1) {
        const login = await measureOne("/api/auth/login", {
          method: "POST",
          body: { email, password: "Benchmark-password-123" },
        });
        results.push(login);
        if (login.status !== 200) continue;
        refreshToken = login.data.data.tokens.refreshToken;
        const refresh = await measureOne("/api/auth/refresh", {
          method: "POST",
          body: { refreshToken },
        });
        results.push(refresh);
        if (refresh.status === 200) {
          accessToken = refresh.data.data.accessToken;
          refreshToken = refresh.data.data.refreshToken;
        }
      }
      return results;
    }),
  );
  for (const concurrency of [50, 200, 500])
    phases.push(
      await runPhase(`authenticated-get-concurrency-${concurrency}`, () =>
        parallelRequests(concurrency, requestCount, (agent) =>
          measureOne("/api/auth/me", { token: accessToken }, agent),
        ),
      ),
    );
  const record = await measureOne("/api/bench-records", {
    method: "POST",
    token: accessToken,
    body: { title: "seed" },
  });
  if (record.status !== 201)
    throw new Error("Generated resource creation failed.");
  const recordId = record.data.data?.id ?? record.data.id;
  phases.push(
    await runPhase("resource-crud", async () => {
      const results = [];
      for (let index = 0; index < 25; index += 1) {
        results.push(
          await measureOne(`/api/bench-records/${recordId}`, {
            token: accessToken,
          }),
        );
        results.push(
          await measureOne(`/api/bench-records/${recordId}`, {
            method: "PATCH",
            token: accessToken,
            body: { title: `updated-${index}` },
          }),
        );
      }
      results.push(
        await measureOne(`/api/bench-records/${recordId}`, {
          method: "DELETE",
          token: accessToken,
        }),
      );
      return results;
    }),
  );
  const pageRows = await Promise.all(
    Array.from({ length: 100 }, (_, index) =>
      send("/api/bench-records", {
        method: "POST",
        token: accessToken,
        body: { title: `pagination-${index}` },
      }),
    ),
  );
  if (pageRows.some((item) => item.status !== 201))
    throw new Error("Pagination dataset setup failed.");
  phases.push(
    await runPhase("resource-pagination", () =>
      parallelRequests(20, 100, (agent) =>
        measureOne(
          "/api/bench-records?limit=20",
          { token: accessToken },
          agent,
        ),
      ),
    ),
  );
  const apiMetrics = await metrics();
  process.stdout.write(
    `${JSON.stringify({ measured_at: new Date().toISOString(), implementation_commit: run("git", ["rev-parse", "HEAD"], { cwd: root }).trim(), node: process.version, platform: `${process.platform} ${process.arch}`, setup_ms: Object.fromEntries(Object.entries(setupTimings).map(([key, value]) => [key, Number(value.toFixed(3))])), workload: { generated_api: "LaunchStack Fastify template + generated owner-scoped resource", database: "fresh PostgreSQL database in the launchstack-smoke-postgres container", pagination_dataset: 100, authenticated_get_requests_per_concurrency: requestCount, concurrency_levels: [50, 200, 500], auth_cycles: authCycles }, startup_ms_to_ready: Number(startupMs.toFixed(3)), phases, api_process_peak_rss_bytes: apiMetrics.maxRssBytes }, null, 2)}\n`,
  );
}

main()
  .catch((error) => {
    const message = (
      error instanceof Error ? error.message : "API benchmark failed."
    )
      .replaceAll(databaseUrl, "<database-url>")
      .replaceAll(accessSecret, "<redacted>")
      .replaceAll(refreshSecret, "<redacted>");
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (apiProcess && apiProcess.exitCode === null) {
      apiProcess.kill("SIGTERM");
      await new Promise((resolvePromise) => {
        const timeout = setTimeout(resolvePromise, 5_000);
        apiProcess.once("exit", () => {
          clearTimeout(timeout);
          resolvePromise();
        });
      });
    }
    if (databaseCreated)
      spawnSync(
        "docker",
        ["exec", postgresContainer, "dropdb", "-U", "postgres", databaseName],
        { stdio: "ignore" },
      );
    rmSync(temporary, { recursive: true, force: true });
  });
