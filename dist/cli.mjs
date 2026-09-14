#!/usr/bin/env node
import {
  AUDIT_SEVERITIES,
  FIRST_PARTY_EXTENSIONS,
  applyExtensionInstall,
  applyExtensionRemoval,
  applyModuleGeneration,
  applyReconciliation,
  applyUpgrade,
  createOrUpdateStage,
  currentLaunchStackVersion,
  destroyStage,
  detectManagedDrift,
  generateProject,
  generateTypeScriptClient,
  getGitMetadata,
  inspectStage,
  installDependencies,
  listFirstPartyExtensions,
  loadOpenApiSource,
  loadProjectManifest,
  loadProjectState,
  parseFieldSpec,
  planExtensionInstall,
  planExtensionRemoval,
  planModuleGeneration,
  planReconciliation,
  planUpgrade,
  renderDockerIgnore,
  renderDockerfile,
  runProductionAudit,
  severityRank
} from "./chunk-CV34FFVK.mjs";

// src/cli.ts
import { Command as Command22 } from "commander";

// src/commands/add.ts
import { Command } from "commander";
var addCommand = new Command("add").description("Add a production capability to an existing LaunchStack project").argument("[capability]", "Capability ID").argument("[provider]", "Optional provider, for example google for oauth").option("--list").option("--dry-run").option("--json").option("-d, --directory <path>").action((capability, provider, options) => {
  try {
    if (options.list) {
      const capabilities = listFirstPartyExtensions().map((item) => ({ id: item.id, version: item.version, dependencies: item.dependencies ?? [] }));
      if (options.json) console.log(JSON.stringify(capabilities, null, 2));
      else for (const item of capabilities) console.log(`${item.id}	${item.version}${item.dependencies.length ? `	depends: ${item.dependencies.join(",")}` : ""}`);
      return;
    }
    if (!capability) throw new Error("Provide a capability ID or use --list.");
    if (provider && capability !== "oauth" && capability !== "storage") throw new Error(`Capability ${capability} does not accept a provider argument.`);
    const plan = planExtensionInstall({ projectDirectory: options.directory ?? process.cwd(), requested: [capability], registry: FIRST_PARTY_EXTENSIONS });
    if (provider && plan.nextManifest.capabilities[capability]) plan.nextManifest.capabilities[capability] = { ...plan.nextManifest.capabilities[capability], provider };
    if (!options.dryRun) applyExtensionInstall(plan);
    const output = { dryRun: Boolean(options.dryRun), noop: plan.noop, extensions: plan.extensionIds, provider: provider ?? null, actions: plan.actions, warnings: plan.warnings };
    if (options.json) console.log(JSON.stringify(output, null, 2));
    else {
      if (plan.noop) console.log(`${capability} is already up to date.`);
      else for (const action of plan.actions) console.log(`${options.dryRun ? "PLAN" : "APPLY"} ${action.kind} ${action.target}: ${action.detail}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
});

// src/commands/project.ts
import { Command as Command2 } from "commander";
function fail(error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
function printPlan(plan, json) {
  if (json) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  for (const action of plan.actions) console.log(`${action.destructive ? "DESTRUCTIVE" : "PLAN"} ${action.kind} ${action.target}: ${action.detail}`);
  for (const warning of plan.warnings) console.warn(`WARN ${warning}`);
  for (const conflict of plan.conflicts) console.error(`CONFLICT ${conflict}`);
  if (!plan.actions.length && !plan.conflicts.length) console.log("Project matches declared LaunchStack state.");
}
var diffCommand = new Command2("diff").description("Show drift in LaunchStack-managed project files").option("-d, --directory <path>").option("--json").action((options) => {
  try {
    const dir = options.directory ?? process.cwd();
    const manifest = loadProjectManifest(dir);
    const drift = detectManagedDrift(dir, loadProjectState(dir, { templateVersion: manifest.project.templateVersion, cliVersion: "unknown" }));
    if (options.json) console.log(JSON.stringify(drift, null, 2));
    else for (const item of drift) console.log(`${item.kind.toUpperCase()} ${item.path}`);
    if (drift.some((item) => item.kind === "modified" || item.kind === "missing")) process.exitCode = 1;
  } catch (error) {
    fail(error);
  }
});
var planCommand = new Command2("plan").description("Plan reconciliation from launchstack.json").option("-d, --directory <path>").option("--json").action((options) => {
  try {
    const plan = planReconciliation(options.directory ?? process.cwd());
    printPlan(plan, options.json);
    if (plan.conflicts.length) process.exitCode = 1;
  } catch (error) {
    fail(error);
  }
});
var applyAction = (options) => {
  try {
    const plan = applyReconciliation({ projectDirectory: options.directory ?? process.cwd(), allowRemove: options.allowRemove });
    printPlan(plan, options.json);
    if (plan.conflicts.length) process.exitCode = 1;
  } catch (error) {
    fail(error);
  }
};
var applyCommand = new Command2("apply").description("Apply declared LaunchStack state").option("-d, --directory <path>").option("--allow-remove").option("--json").action(applyAction);
var reconcileCommand = new Command2("reconcile").description("Reconcile project state with launchstack.json").option("-d, --directory <path>").option("--allow-remove").option("--json").action(applyAction);
var upgradeCommand = new Command2("upgrade").description("Safely adopt or upgrade a LaunchStack project").option("-d, --directory <path>").option("--plan").option("--json").action((options) => {
  try {
    const plan = planUpgrade(options.directory ?? process.cwd());
    if (!options.plan && !plan.conflicts.length) applyUpgrade(plan);
    const output = { dryRun: Boolean(options.plan), fromVersion: plan.fromVersion, toVersion: plan.toVersion, actions: plan.actions, conflicts: plan.conflicts };
    if (options.json) console.log(JSON.stringify(output, null, 2));
    else {
      for (const action of plan.actions) console.log(`${options.plan ? "PLAN" : "APPLY"} ${action.kind} ${action.target}: ${action.detail}`);
      for (const conflict of plan.conflicts) console.error(`CONFLICT ${conflict}`);
    }
    if (plan.conflicts.length) process.exitCode = 1;
  } catch (error) {
    fail(error);
  }
});

// src/commands/audit.ts
import { Command as Command3 } from "commander";
var auditCommand = new Command3("audit").description("Audit a LaunchStack project for production-readiness risks").option("-d, --directory <path>").option("--production", "Enable the production policy profile").option("--json").option("--fail-on <severity>", "low, medium, high, critical", "none").action((options) => {
  try {
    const report = runProductionAudit(options.directory ?? process.cwd());
    const output = { ...report, profile: options.production ? "production" : "standard" };
    if (options.json) console.log(JSON.stringify(output, null, 2));
    else {
      console.log(`LaunchStack ${output.profile} audit: ${report.projectDirectory}`);
      for (const item of report.findings) {
        console.log(`${item.suppressed ? "SUPPRESSED" : item.severity.toUpperCase()} ${item.ruleId} ${item.title}${item.path ? ` [${item.path}]` : ""}`);
        console.log(`  ${item.detail}`);
      }
    }
    if (options.failOn !== "none") {
      if (!AUDIT_SEVERITIES.includes(options.failOn)) throw new Error(`Unknown --fail-on severity: ${options.failOn}`);
      const threshold = severityRank(options.failOn);
      if (report.findings.some((item) => !item.suppressed && severityRank(item.severity) >= threshold)) process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
});

// src/commands/client-generate.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { Command as Command4 } from "commander";
var TARGETS = /* @__PURE__ */ new Set(["typescript", "react", "react-native"]);
var clientGenerateCommand = new Command4("generate").description("Generate a typed client from an OpenAPI JSON document").option("--schema <path-or-url>", "OpenAPI JSON file or HTTPS endpoint", "./openapi.json").option("--target <target>", "typescript, react, or react-native", "typescript").option("-o, --output <path>", "Output TypeScript file", "./src/generated/launchstack-client.ts").option("--check", "Fail if output differs without writing").action(async (options) => {
  try {
    if (!TARGETS.has(options.target)) throw new Error(`Unsupported client target: ${options.target}`);
    const source = /^https?:\/\//i.test(options.schema) ? options.schema : resolve(options.schema);
    if (/^http:\/\//i.test(source)) throw new Error("Remote OpenAPI schemas must use HTTPS.");
    const generated = generateTypeScriptClient(await loadOpenApiSource(source), options.target);
    const output = resolve(options.output);
    if (options.check) {
      if (!existsSync(output) || readFileSync(output, "utf8") !== generated) {
        console.error(`Generated client is stale: ${output}`);
        process.exitCode = 1;
        return;
      }
      console.log(`Generated client is current: ${output}`);
      return;
    }
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, generated, "utf8");
    console.log(`Generated ${options.target} client: ${output}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
});
var clientCommand = new Command4("client").description("Generate and verify typed API clients").addCommand(clientGenerateCommand);

// src/commands/create.ts
import { existsSync as existsSync2 } from "fs";
import { relative, resolve as resolve2 } from "path";
import { Command as Command5 } from "commander";
var createCommand = new Command5("create").description("Create a new backend API project").argument("<project-name>", "Name of the project to create").option(
  "-d, --directory <path>",
  "Directory where the project should be created"
).option("-f, --force", "Allow replacing a non-empty destination after staging succeeds").option("--no-install", "Skip dependency installation").action((projectName, options) => {
  try {
    const destinationDirectory = options.directory ? resolve2(options.directory) : resolve2(process.cwd(), projectName);
    const destinationAlreadyExists = existsSync2(destinationDirectory);
    console.log(`Creating ${projectName}...`);
    const generatedDirectory = generateProject({
      projectName,
      destinationDirectory,
      template: "api",
      overwrite: options.force ?? false
    });
    console.log(`Project files created in ${generatedDirectory}`);
    if (options.install) {
      console.log("Installing dependencies...");
      installDependencies(generatedDirectory);
      console.log("Dependencies installed");
    }
    console.log("");
    console.log("Project created successfully");
    console.log("");
    console.log("Next steps:");
    if (!destinationAlreadyExists || destinationDirectory !== process.cwd()) {
      const relativeDestination = relative(process.cwd(), destinationDirectory) || ".";
      console.log(`  cd ${relativeDestination}`);
    }
    if (!options.install) {
      console.log("  npm install");
    }
    console.log("  npm run dev");
  } catch (error) {
    console.error("Project creation failed");
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exitCode = 1;
  }
});

// src/commands/deploy.ts
import { execSync } from "child_process";
import { Command as Command6 } from "commander";

// src/config.ts
import { existsSync as existsSync4, readFileSync as readFileSync3 } from "fs";
import { resolve as resolve3 } from "path";
import { z } from "zod";

// src/providers.ts
var PROVIDER_IDS = [
  "vercel",
  "netlify",
  "render",
  "railway",
  "fly",
  "docker",
  "custom"
];
var PROVIDERS = {
  vercel: {
    id: "vercel",
    label: "Vercel",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  },
  netlify: {
    id: "netlify",
    label: "Netlify",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  },
  render: {
    id: "render",
    label: "Render",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  railway: {
    id: "railway",
    label: "Railway",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  fly: {
    id: "fly",
    label: "Fly.io",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  docker: {
    id: "docker",
    label: "Docker",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  custom: {
    id: "custom",
    label: "Custom",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  }
};
function isProviderId(value) {
  return PROVIDER_IDS.includes(value);
}
function providerHelpText() {
  return PROVIDER_IDS.join(", ");
}

// src/storage.ts
import {
  chmodSync,
  existsSync as existsSync3,
  mkdirSync as mkdirSync2,
  readFileSync as readFileSync2,
  renameSync,
  rmSync,
  writeFileSync as writeFileSync2
} from "fs";
import { basename, dirname as dirname2, join } from "path";
import { randomUUID } from "crypto";
function atomicWriteText(path, content, mode) {
  const directory2 = dirname2(path);
  mkdirSync2(directory2, { recursive: true });
  const temporaryPath = join(
    directory2,
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`
  );
  try {
    writeFileSync2(temporaryPath, content, {
      encoding: "utf8",
      flag: "wx",
      ...mode === void 0 ? {} : { mode }
    });
    if (mode !== void 0) {
      chmodSync(temporaryPath, mode);
    }
    renameSync(temporaryPath, path);
    if (mode !== void 0) {
      chmodSync(path, mode);
    }
  } finally {
    if (existsSync3(temporaryPath)) {
      rmSync(temporaryPath, { force: true });
    }
  }
}
function readJsonFile(path, fallback) {
  if (!existsSync3(path)) {
    return fallback;
  }
  try {
    return JSON.parse(readFileSync2(path, "utf8"));
  } catch {
    throw new Error(`Invalid JSON in ${basename(path)}.`);
  }
}

// src/config.ts
var CONFIG_FILE_NAME = "launchstack.config.json";
var launchStackConfigSchema = z.object({
  appName: z.string().min(1),
  environment: z.enum(["development", "staging", "production"]),
  provider: z.enum(PROVIDER_IDS),
  buildCommand: z.string().min(1),
  outputDirectory: z.string().min(1),
  deployTarget: z.string().min(1)
});
function getConfigPath() {
  return resolve3(process.cwd(), CONFIG_FILE_NAME);
}
function configExists() {
  return existsSync4(getConfigPath());
}
function createDefaultConfig(appName) {
  return {
    appName,
    environment: "production",
    provider: "custom",
    buildCommand: "npm run build",
    outputDirectory: "dist",
    deployTarget: "https://example.com"
  };
}
function writeConfig(config) {
  const validated = launchStackConfigSchema.parse(config);
  atomicWriteText(
    getConfigPath(),
    `${JSON.stringify(validated, null, 2)}
`
  );
}
function readConfig() {
  const raw = readFileSync3(getConfigPath(), "utf-8");
  const parsed = JSON.parse(raw);
  return launchStackConfigSchema.parse(parsed);
}

// src/deployment.ts
import {
  existsSync as existsSync5,
  statSync
} from "fs";
import {
  isAbsolute,
  relative as relative2,
  resolve as resolve4
} from "path";
function resolveVerifiedOutputDirectory(projectDirectory, configuredOutputDirectory) {
  const projectRoot = resolve4(projectDirectory);
  const outputPath = resolve4(projectRoot, configuredOutputDirectory);
  const relativePath = relative2(projectRoot, outputPath);
  if (relativePath === ".." || relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(relativePath)) {
    throw new Error(
      "Configured output directory must stay inside the project directory."
    );
  }
  if (!existsSync5(outputPath)) {
    throw new Error(
      `Output directory not found: ${configuredOutputDirectory}`
    );
  }
  if (!statSync(outputPath).isDirectory()) {
    throw new Error(
      `Configured output path is not a directory: ${configuredOutputDirectory}`
    );
  }
  return outputPath;
}

// src/history.ts
import { resolve as resolve5 } from "path";
var STORE_DIR = ".launchstack";
var HISTORY_FILE = "history.json";
function getHistoryPath(projectDirectory = process.cwd()) {
  return resolve5(
    projectDirectory,
    STORE_DIR,
    HISTORY_FILE
  );
}
function readHistory(projectDirectory = process.cwd()) {
  const records = readJsonFile(
    getHistoryPath(projectDirectory),
    []
  );
  if (!Array.isArray(records)) {
    throw new Error("history.json must contain a JSON array.");
  }
  return records;
}
function writeHistory(records, projectDirectory = process.cwd()) {
  atomicWriteText(
    getHistoryPath(projectDirectory),
    `${JSON.stringify(records, null, 2)}
`
  );
}
function addDeploymentRecord(record, projectDirectory = process.cwd()) {
  const records = readHistory(projectDirectory);
  records.unshift(record);
  writeHistory(records.slice(0, 50), projectDirectory);
}

// src/commands/deploy.ts
var deployCommand = new Command6("deploy").description("Build/prepare deployment artifacts or deploy a manifest-declared stage").option("--skip-build").option("--stage <stage>").option("--production").option("--json").action((options) => {
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    if (options.stage) {
      if (!options.skipBuild) execSync("npm run build", { stdio: "inherit", cwd: process.cwd() });
      const stage = createOrUpdateStage({ projectDirectory: process.cwd(), stage: options.stage, production: options.production });
      if (options.json) console.log(JSON.stringify(stage, null, 2));
      else {
        console.log(`Stage ${stage.name}: ${stage.status}`);
        console.log(`Provider: ${stage.provider}`);
        console.log(`Resource: ${stage.resourceId}`);
        if (stage.url) console.log(`URL: ${stage.url}`);
      }
      return;
    }
    if (options.production) throw new Error("--production is only valid with --stage.");
    const config = readConfig();
    const git = getGitMetadata();
    const provider = PROVIDERS[config.provider];
    console.log("LaunchStack deployment preparation");
    console.log(`App: ${config.appName}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Provider: ${provider.label}`);
    if (git) {
      console.log(`Branch: ${git.branch}`);
      console.log(`Commit: ${git.commitHash.slice(0, 7)}`);
      if (git.dirty) console.log("Working tree has uncommitted changes");
    }
    if (!options.skipBuild) execSync(config.buildCommand, { stdio: "inherit", cwd: process.cwd() });
    resolveVerifiedOutputDirectory(process.cwd(), config.outputDirectory);
    addDeploymentRecord({ id: `dep_${Date.now()}`, appName: config.appName, environment: config.environment, provider: config.provider, deployTarget: config.deployTarget, outputDirectory: config.outputDirectory, status: "prepared", createdAt, git });
    console.log(`Deploy target: ${config.deployTarget}`);
    console.log(provider.remoteDeploymentSupported ? "Deployment provider confirmed the remote deployment." : "Artifacts are prepared. LaunchStack has not performed or confirmed a remote deployment for this provider.");
  } catch (error) {
    console.log("Deployment preparation failed");
    console.log(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
});

// src/commands/stages.ts
import { Command as Command7 } from "commander";
var fail2 = (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
};
var previewCommand = new Command7("preview").description("Create or update a non-production preview stage").argument("[stage]", "Preview stage name", "preview").option("-d, --directory <path>").option("--json").action((stage, options) => {
  try {
    const state = createOrUpdateStage({ projectDirectory: options.directory ?? process.cwd(), stage, production: false });
    if (options.json) console.log(JSON.stringify(state, null, 2));
    else console.log(`Preview ${state.name}: ${state.status}`);
  } catch (error) {
    fail2(error);
  }
});
var stageCommand = new Command7("stage").description("Inspect named LaunchStack stages");
stageCommand.command("status").argument("<stage>").option("-d, --directory <path>").option("--json").action((stage, options) => {
  try {
    const status = inspectStage(options.directory ?? process.cwd(), stage);
    if (options.json) console.log(JSON.stringify(status, null, 2));
    else console.log(status.state ? `Stage ${stage}: ${status.state.status}` : `Stage ${stage}: absent`);
  } catch (error) {
    fail2(error);
  }
});
var destroyCommand = new Command7("destroy").description("Destroy a verified LaunchStack stage resource").option("--stage <stage>").option("-d, --directory <path>").option("--production").option("--json").action((options) => {
  try {
    if (!options.stage) throw new Error("--stage is required.");
    destroyStage({ projectDirectory: options.directory ?? process.cwd(), stage: options.stage, production: options.production });
    if (options.json) console.log(JSON.stringify({ stage: options.stage, status: "destroyed" }, null, 2));
    else console.log(`Destroyed stage ${options.stage}.`);
  } catch (error) {
    fail2(error);
  }
});

// src/commands/dev.ts
import { Command as Command8 } from "commander";

// src/dev/orchestrator.ts
import { spawn } from "child_process";
import { createServer } from "net";
import { resolve as resolve6 } from "path";
var defaultAdapters = { spawn(command, args, options) {
  return spawn(command, args, { ...options, shell: false });
}, portAvailable(port) {
  return new Promise((done) => {
    const server = createServer();
    server.unref();
    server.once("error", () => done(false));
    server.listen({ host: "127.0.0.1", port }, () => server.close(() => done(true)));
  });
}, sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
} };
function topologicalServices(services) {
  const byId = new Map(services.map((item) => [item.id, item]));
  const indegree = /* @__PURE__ */ new Map();
  const dependents = /* @__PURE__ */ new Map();
  for (const item of services) {
    indegree.set(item.id, item.dependencies.length);
    for (const dep of item.dependencies) {
      if (!byId.has(dep)) throw new Error(`Unknown dev service dependency ${dep} for ${item.id}`);
      const list = dependents.get(dep) ?? [];
      list.push(item.id);
      dependents.set(dep, list);
    }
  }
  const queue = services.filter((item) => (indegree.get(item.id) ?? 0) === 0).sort((a, b) => a.id.localeCompare(b.id));
  const ordered = [];
  while (queue.length) {
    const item = queue.shift();
    if (!item) break;
    ordered.push(item);
    for (const id of (dependents.get(item.id) ?? []).sort()) {
      const next = (indegree.get(id) ?? 0) - 1;
      indegree.set(id, next);
      if (next === 0) {
        const dependent = byId.get(id);
        if (dependent) {
          queue.push(dependent);
          queue.sort((a, b) => a.id.localeCompare(b.id));
        }
      }
    }
  }
  if (ordered.length !== services.length) throw new Error("Development service dependency cycle detected.");
  return ordered;
}
function createDevPlan(projectDirectoryInput) {
  const projectDirectory = resolve6(projectDirectoryInput);
  const manifest = loadProjectManifest(projectDirectory);
  const capabilities = new Set(Object.keys(manifest.capabilities));
  const services = [{ id: "postgres", kind: "infrastructure", dependencies: [], command: "docker", args: ["compose", "up", "-d", "postgres"], port: 5432, required: true }];
  if (capabilities.has("redis") || capabilities.has("queue")) services.push({ id: "redis", kind: "infrastructure", dependencies: [], command: "docker", args: ["compose", "up", "-d", "redis"], port: 6379, required: true });
  services.push({ id: "migrations", kind: "migration", dependencies: ["postgres"], command: "npm", args: ["run", "prisma:deploy"], required: true }, { id: "api", kind: "process", dependencies: ["postgres", ...services.some((item) => item.id === "redis") ? ["redis"] : [], "migrations"], command: "npm", args: ["run", "dev"], port: 3e3, required: true });
  if (capabilities.has("queue")) services.push({ id: "worker", kind: "process", dependencies: ["redis", "migrations"], command: "npm", args: ["run", "worker"], required: false });
  if (capabilities.has("cron")) services.push({ id: "scheduler", kind: "process", dependencies: ["migrations"], command: "npm", args: ["run", "scheduler"], required: false });
  return { projectDirectory, services: topologicalServices(services) };
}
function selectDevPlan(plan, options) {
  let services = plan.services;
  if (options.noMigrate) {
    services = services.filter((item) => item.id !== "migrations").map((item) => ({ ...item, dependencies: item.dependencies.filter((dep) => dep !== "migrations") }));
  }
  if (options.service) {
    const byId = new Map(services.map((item) => [item.id, item]));
    if (!byId.has(options.service)) throw new Error(`Unknown dev service: ${options.service}`);
    const selected = /* @__PURE__ */ new Set();
    const visit = (id) => {
      if (selected.has(id)) return;
      const item = byId.get(id);
      if (!item) throw new Error(`Missing selected dependency: ${id}`);
      selected.add(id);
      for (const dep of item.dependencies) visit(dep);
    };
    visit(options.service);
    services = services.filter((item) => selected.has(item.id));
  }
  return { ...plan, services: topologicalServices(services) };
}
function waitForExit(child, timeoutMs) {
  return new Promise((done, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Process ${child.pid ?? "unknown"} did not exit within ${timeoutMs}ms`));
      }
    }, timeoutMs);
    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      done(code);
    });
  });
}
async function waitUntilPortOccupied(port, adapters, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!await adapters.portAvailable(port)) return;
    await adapters.sleep(100);
  }
  throw new Error(`Timed out waiting for service on port ${port}`);
}
var DevOrchestrator = class {
  constructor(plan, adapters = defaultAdapters) {
    this.plan = plan;
    this.adapters = adapters;
    this.children = /* @__PURE__ */ new Set();
    this.stopped = false;
  }
  async start(options = {}) {
    const timeoutMs = options.readinessTimeoutMs ?? 3e4;
    const ports = /* @__PURE__ */ new Set();
    for (const service of this.plan.services) if (service.port) {
      if (ports.has(service.port)) throw new Error(`Duplicate configured dev port: ${service.port}`);
      ports.add(service.port);
      if (!await this.adapters.portAvailable(service.port)) throw new Error(`Port ${service.port} required by ${service.id} is already occupied.`);
    }
    try {
      for (const service of this.plan.services) {
        const child = this.adapters.spawn(service.command, service.args, { cwd: this.plan.projectDirectory, stdio: "inherit" });
        this.children.add(child);
        child.once("exit", () => this.children.delete(child));
        if (service.kind !== "process") {
          const code = await waitForExit(child, timeoutMs);
          if (code !== 0 && service.required) throw new Error(`${service.id} failed with exit code ${String(code)}`);
        } else if (service.port) await waitUntilPortOccupied(service.port, this.adapters, timeoutMs);
      }
    } catch (error) {
      await this.stop();
      throw error;
    }
  }
  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    const children = [...this.children];
    for (const child of children) try {
      child.kill("SIGTERM");
    } catch {
    }
    await Promise.race([Promise.allSettled(children.map((child) => waitForExit(child, 5e3))), this.adapters.sleep(5100)]);
    for (const child of [...this.children]) {
      try {
        child.kill("SIGKILL");
      } catch {
      }
      this.children.delete(child);
    }
  }
};

// src/commands/dev.ts
var devCommand = new Command8("dev").description("Start LaunchStack-managed local development services").option("-d, --directory <path>").option("--service <id>", "Start one service plus its dependencies").option("--no-migrate", "Skip the migration process").option("--json").option("--readiness-timeout <ms>", "Readiness timeout", "30000").action(async (options) => {
  try {
    const plan = selectDevPlan(createDevPlan(options.directory ?? process.cwd()), { service: options.service, noMigrate: options.migrate === false });
    if (options.json) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }
    const timeoutMs = Number.parseInt(options.readinessTimeout, 10);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1e3 || timeoutMs > 3e5) throw new Error("--readiness-timeout must be between 1000 and 300000 milliseconds.");
    const orchestrator = new DevOrchestrator(plan);
    let stopping = false;
    const stop = async () => {
      if (stopping) return;
      stopping = true;
      await orchestrator.stop();
    };
    process.once("SIGINT", () => void stop().then(() => {
      process.exitCode = 130;
    }));
    process.once("SIGTERM", () => void stop().then(() => {
      process.exitCode = 143;
    }));
    await orchestrator.start({ readinessTimeoutMs: timeoutMs });
    console.log("Development services are ready. Press Ctrl+C to stop LaunchStack-owned processes.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
});

// src/commands/doctor.ts
import { Command as Command9 } from "commander";

// src/release/doctor.ts
import {
  existsSync as existsSync6,
  readFileSync as readFileSync4
} from "fs";
import { resolve as resolve7 } from "path";
function checkFile(projectDirectory, file, label) {
  const path = resolve7(projectDirectory, file);
  const passed = existsSync6(path);
  return {
    name: label,
    passed,
    detail: passed ? `${file} found` : `${file} is missing`
  };
}
function checkPackageScripts(projectDirectory) {
  const packagePath = resolve7(
    projectDirectory,
    "package.json"
  );
  if (!existsSync6(packagePath)) {
    return {
      name: "Package scripts",
      passed: false,
      detail: "package.json is missing"
    };
  }
  const packageJson = JSON.parse(
    readFileSync4(packagePath, "utf8")
  );
  const requiredScripts = [
    "dev",
    "build",
    "start",
    "test",
    "typecheck",
    "prisma:generate",
    "prisma:migrate",
    "prisma:deploy"
  ];
  const missingScripts = requiredScripts.filter(
    (script) => !packageJson.scripts?.[script]
  );
  return {
    name: "Package scripts",
    passed: missingScripts.length === 0,
    detail: missingScripts.length === 0 ? "Required scripts are present" : `Missing scripts: ${missingScripts.join(", ")}`
  };
}
function checkEnvironmentExample(projectDirectory) {
  const path = resolve7(
    projectDirectory,
    ".env.example"
  );
  if (!existsSync6(path)) {
    return {
      name: "Environment example",
      passed: false,
      detail: ".env.example is missing"
    };
  }
  const content = readFileSync4(path, "utf8");
  const requiredVariables = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET"
  ];
  const missingVariables = requiredVariables.filter(
    (variable) => !content.includes(`${variable}=`)
  );
  return {
    name: "Environment example",
    passed: missingVariables.length === 0,
    detail: missingVariables.length === 0 ? "Required environment variables are documented" : `Missing variables: ${missingVariables.join(", ")}`
  };
}
function runDoctor(projectDirectory = process.cwd()) {
  const checks = [
    checkFile(
      projectDirectory,
      "package.json",
      "Package manifest"
    ),
    checkFile(
      projectDirectory,
      "tsconfig.json",
      "TypeScript configuration"
    ),
    checkFile(
      projectDirectory,
      "prisma/schema.prisma",
      "Prisma schema"
    ),
    checkFile(
      projectDirectory,
      "src/app.ts",
      "Fastify application"
    ),
    checkFile(
      projectDirectory,
      "src/server.ts",
      "Server entrypoint"
    ),
    checkFile(
      projectDirectory,
      "Dockerfile",
      "Dockerfile"
    ),
    checkFile(
      projectDirectory,
      "docker-compose.yml",
      "Docker Compose"
    ),
    checkFile(
      projectDirectory,
      ".github/workflows/ci.yml",
      "CI workflow"
    ),
    checkPackageScripts(projectDirectory),
    checkEnvironmentExample(projectDirectory)
  ];
  return {
    healthy: checks.every((check) => check.passed),
    projectDirectory: resolve7(projectDirectory),
    checks
  };
}

// src/commands/doctor.ts
var doctorCommand = new Command9("doctor").description("Inspect a generated LaunchStack project for missing production files and configuration").option("-d, --directory <path>", "Project directory to inspect").option("--json", "Print the doctor report as JSON").option("--fix", "Apply deterministic LaunchStack metadata/ownership repairs when safe").action((options) => {
  const directory2 = options.directory ?? process.cwd();
  try {
    let fixes = [];
    if (options.fix) {
      const plan = planUpgrade(directory2);
      if (plan.conflicts.length) throw new Error(`doctor --fix found ambiguous project edits: ${plan.conflicts.join("; ")}`);
      if (plan.actions.length) {
        applyUpgrade(plan);
        fixes = plan.actions.map((action) => `${action.kind}:${action.target}`);
      }
    }
    const report = runDoctor(directory2);
    if (options.json) {
      console.log(JSON.stringify({ ...report, fixes }, null, 2));
      process.exitCode = report.healthy ? 0 : 1;
      return;
    }
    console.log(`LaunchStack doctor: ${report.projectDirectory}`);
    console.log("");
    for (const check of report.checks) console.log(`${check.passed ? "PASS" : "FAIL"}  ${check.name}: ${check.detail}`);
    if (fixes.length) {
      console.log("");
      for (const fix of fixes) console.log(`FIXED ${fix}`);
    }
    console.log("");
    if (report.healthy) console.log("Project health check passed.");
    else {
      console.error("Project health check failed.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
});

// src/commands/docker.ts
import { existsSync as existsSync7, writeFileSync as writeFileSync3 } from "fs";
import { Command as Command10 } from "commander";
function writeFileIfAllowed(path, content, force) {
  if (existsSync7(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }
  writeFileSync3(path, content);
  console.log(`Created ${path}`);
}
var dockerCommand = new Command10("docker").description("Generate Docker deployment files");
dockerCommand.command("init").description("Create hardened Dockerfile, .dockerignore, and docker-compose.yml").option("-f, --force", "Overwrite existing Docker files").action((options) => {
  const config = readConfig();
  const force = Boolean(options.force);
  const hasLockfile = existsSync7("package-lock.json");
  const prisma = existsSync7("prisma/schema.prisma");
  const dockerfile = renderDockerfile({
    buildCommand: config.buildCommand,
    outputDirectory: config.outputDirectory,
    hasLockfile,
    prisma
  });
  const compose = `services:
  ${config.appName}:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: ${config.environment}
`;
  writeFileIfAllowed("Dockerfile", dockerfile, force);
  writeFileIfAllowed(".dockerignore", renderDockerIgnore(), force);
  writeFileIfAllowed("docker-compose.yml", compose, force);
});

// src/commands/env.ts
import { Command as Command11 } from "commander";
var allowedEnvironments = ["development", "staging", "production"];
var envCommand = new Command11("env").description("View or update the LaunchStack environment").argument("[environment]", "development, staging, or production").action((environment) => {
  try {
    const config = readConfig();
    if (!environment) {
      console.log(`Current environment: ${config.environment}`);
      return;
    }
    if (!allowedEnvironments.includes(environment)) {
      console.log("Invalid environment. Use development, staging, or production.");
      process.exit(1);
    }
    config.environment = environment;
    writeConfig(config);
    console.log(`Environment updated to ${config.environment}`);
  } catch (error) {
    console.log("Could not update environment");
    if (error instanceof Error) {
      console.log(error.message);
    }
    process.exit(1);
  }
});

// src/commands/generate.ts
import { Command as Command12 } from "commander";
function configure(kind) {
  const command = new Command12(kind).argument("<name>").option("-d, --directory <path>").option("--field <name:type...>", "Repeat for resource fields", (value, previous) => [...previous, value], []).option("--dry-run").option("--json");
  if (kind === "resource") command.option("--crud", "Generate CRUD endpoints (default for resources)");
  return command.action((name, options) => {
    try {
      if (kind === "module" && options.field.length) throw new Error("--field is only supported by generate resource.");
      const plan = planModuleGeneration({ projectDirectory: options.directory ?? process.cwd(), kind, name, fields: options.field.map(parseFieldSpec) });
      if (!options.dryRun) applyModuleGeneration(plan);
      const output = { dryRun: Boolean(options.dryRun), kind, name, crud: kind === "resource", files: plan.files, migrationCommand: plan.migrationCommand };
      if (options.json) console.log(JSON.stringify(output, null, 2));
      else {
        for (const path of plan.files) console.log(`${options.dryRun ? "PLAN" : "CREATE"} ${path}`);
        if (plan.migrationCommand) console.log(`Next: ${plan.migrationCommand}`);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  });
}
var generateCommand = new Command12("generate").description("Generate architecture-aware modules and resources").addCommand(configure("module")).addCommand(configure("resource"));

// src/commands/github.ts
import { existsSync as existsSync8, mkdirSync as mkdirSync3 } from "fs";
import { dirname as dirname3 } from "path";
import { Command as Command13 } from "commander";
function writeWorkflowFile(path, content, force) {
  if (existsSync8(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }
  mkdirSync3(dirname3(path), { recursive: true });
  atomicWriteText(path, content);
  console.log(`Created ${path}`);
}
var githubCommand = new Command13("github").description("Generate GitHub Actions workflows");
githubCommand.command("init").description("Create a lockfile-first CI workflow").option("-f, --force", "Overwrite existing workflow").action((options) => {
  const config = readConfig();
  const workflow = `name: CI

on:
  push:
    branches:
      - main
  pull_request:

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run project checks when available
        run: npm run check --if-present

      - name: Build project
        run: ${config.buildCommand}
`;
  writeWorkflowFile(
    ".github/workflows/ci.yml",
    workflow,
    Boolean(options.force)
  );
});

// src/commands/history.ts
import { Command as Command14 } from "commander";
var historyCommand = new Command14("history").description("Show recent LaunchStack deployments").option("-l, --limit <number>", "Number of records to show", "10").action((options) => {
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
    if (record.git) {
      console.log(`Branch: ${record.git.branch}`);
      console.log(`Commit: ${record.git.commitHash.slice(0, 7)}`);
      console.log(`Dirty: ${record.git.dirty ? "yes" : "no"}`);
    }
    console.log("");
  });
});

// src/commands/init.ts
import { Command as Command15 } from "commander";
var initCommand = new Command15("init").description("Create a LaunchStack config file").option("-n, --name <name>", "Project name").option("-f, --force", "Overwrite existing config file").action((options) => {
  if (configExists() && !options.force) {
    console.log("launchstack.config.json already exists. Use --force to overwrite.");
    return;
  }
  const appName = options.name || "my-app";
  const config = createDefaultConfig(appName);
  writeConfig(config);
  console.log("Created launchstack.config.json");
});

// src/commands/plugin.ts
import { Command as Command16 } from "commander";

// src/extensions/plugins.ts
import { existsSync as existsSync9, readFileSync as readFileSync5 } from "fs";
import { isAbsolute as isAbsolute2, join as join2, resolve as resolve8 } from "path";
import { z as z2 } from "zod";
var fileSchema = z2.object({ path: z2.string().min(1).max(240), content: z2.string().max(1e6), executable: z2.boolean().optional() }).strict();
var environmentSchema = z2.object({ name: z2.string().regex(/^[A-Z][A-Z0-9_]*$/), description: z2.string().min(1).max(300), example: z2.string().max(500).optional(), required: z2.boolean().optional(), secret: z2.boolean().optional() }).strict();
var hookSchema = z2.object({ name: z2.string().min(1).max(80), command: z2.string().min(1).max(500), destructive: z2.boolean().optional() }).strict();
var pluginManifestSchema = z2.object({
  schemaVersion: z2.literal(1),
  id: z2.string().regex(/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]{0,100}$/),
  version: z2.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/),
  kind: z2.literal("plugin"),
  displayName: z2.string().min(1).max(120),
  supportedLaunchStack: z2.string().min(1).max(80),
  dependencies: z2.array(z2.string().min(1).max(120)).max(50).optional(),
  conflicts: z2.array(z2.string().min(1).max(120)).max(50).optional(),
  files: z2.array(fileSchema).max(200).optional(),
  packages: z2.object({ dependencies: z2.record(z2.string(), z2.string()).optional(), devDependencies: z2.record(z2.string(), z2.string()).optional() }).strict().optional(),
  environment: z2.array(environmentSchema).max(100).optional(),
  composeServices: z2.record(z2.string(), z2.unknown()).optional(),
  doctor: z2.array(z2.object({ id: z2.string().min(1), path: z2.string().optional(), env: z2.string().optional(), description: z2.string().min(1) }).strict()).max(100).optional(),
  auditRequirements: z2.array(z2.object({ ruleId: z2.string().regex(/^LS\d{3}$/), description: z2.string().min(1) }).strict()).max(100).optional(),
  hooks: z2.array(hookSchema).max(20).optional()
}).strict();
function parsePluginManifest(input, allowHooks = false) {
  const result = pluginManifestSchema.safeParse(input);
  if (!result.success) throw new Error(`Invalid LaunchStack plugin manifest: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  if (!allowHooks && result.data.hooks?.length) throw new Error(`Plugin requests executable hooks (${result.data.hooks.map((hook) => hook.name).join(", ")}). Re-run with --allow-hooks only after reviewing the plugin.`);
  return result.data;
}
function resolvePluginManifestPath(projectDirectory, specifier) {
  if (specifier.includes("\0")) throw new Error("Invalid plugin specifier");
  if (specifier.endsWith(".json") || specifier.startsWith(".") || isAbsolute2(specifier)) return resolve8(projectDirectory, specifier);
  const segments = specifier.startsWith("@") ? specifier.split("/") : [specifier];
  if (segments.some((segment) => segment === ".." || segment === "." || !segment)) throw new Error(`Invalid plugin package name: ${specifier}`);
  return join2(resolve8(projectDirectory), "node_modules", ...segments, "launchstack-plugin.json");
}
function loadPluginManifest(projectDirectory, specifier, options = {}) {
  const path = resolvePluginManifestPath(projectDirectory, specifier);
  if (!existsSync9(path)) throw new Error(`Plugin manifest not found at ${path}. Install third-party packages with scripts disabled, review launchstack-plugin.json, then run launchstack plugin add.`);
  try {
    return parsePluginManifest(JSON.parse(readFileSync5(path, "utf8")), options.allowHooks ?? false);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid LaunchStack")) throw error;
    throw new Error(`Unable to read plugin manifest: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// src/commands/plugin.ts
var directory = (options) => options.directory ?? process.cwd();
function print(value, json) {
  if (json) console.log(JSON.stringify(value, null, 2));
  else if (Array.isArray(value)) for (const item of value) console.log(typeof item === "string" ? item : JSON.stringify(item));
  else console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
}
function fail3(error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
function installLike(name) {
  return pluginCommand.command(name).argument("<specifier>").option("-d, --directory <path>").option("--dry-run").option("--allow-hooks").option("--json").action((specifier, options) => {
    try {
      const item = loadPluginManifest(directory(options), specifier, { allowHooks: options.allowHooks });
      const plan = planExtensionInstall({ projectDirectory: directory(options), requested: [item.id], registry: { ...FIRST_PARTY_EXTENSIONS, [item.id]: item } });
      if (!options.dryRun) applyExtensionInstall(plan);
      print({ dryRun: Boolean(options.dryRun), plugin: `${item.id}@${item.version}`, actions: plan.actions, warnings: plan.warnings }, options.json);
    } catch (error) {
      fail3(error);
    }
  });
}
var pluginCommand = new Command16("plugin").description("Manage validated LaunchStack extension manifests");
pluginCommand.command("list").option("-d, --directory <path>").option("--json").action((options) => {
  try {
    const manifest = loadProjectManifest(directory(options));
    const state = loadProjectState(directory(options), { templateVersion: manifest.project.templateVersion, cliVersion: "unknown" });
    const plugins = Object.values(state.extensions).filter((item) => item.kind === "plugin").sort((a, b) => a.id.localeCompare(b.id));
    print(options.json ? plugins : plugins.map((item) => `${item.id}	${item.version}`), options.json);
  } catch (error) {
    fail3(error);
  }
});
pluginCommand.command("validate").argument("<specifier>").option("-d, --directory <path>").option("--allow-hooks").option("--json").action((specifier, options) => {
  try {
    print(loadPluginManifest(directory(options), specifier, { allowHooks: options.allowHooks }), options.json);
  } catch (error) {
    fail3(error);
  }
});
installLike("add");
installLike("upgrade");
pluginCommand.command("remove").argument("<plugin-id>").option("-d, --directory <path>").option("--manifest <path>").option("--dry-run").option("--json").action((pluginId, options) => {
  try {
    const projectDirectory = directory(options);
    const manifest = loadProjectManifest(projectDirectory);
    const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: "unknown" });
    const installed = state.extensions[pluginId];
    if (!installed || installed.kind !== "plugin") throw new Error(`${pluginId} is not an installed plugin.`);
    let item;
    if (options.manifest) {
      item = loadPluginManifest(projectDirectory, options.manifest, { allowHooks: true });
      if (item.id !== pluginId) throw new Error(`Manifest ID ${item.id} does not match installed plugin ${pluginId}.`);
    } else item = { schemaVersion: 1, id: pluginId, version: installed.version, kind: "plugin", displayName: pluginId, supportedLaunchStack: ">=2 <4" };
    const plan = planExtensionRemoval({ projectDirectory, extension: item });
    if (!options.dryRun) applyExtensionRemoval(plan);
    print({ dryRun: Boolean(options.dryRun), plugin: pluginId, actions: plan.mutations.map((mutation) => ({ type: mutation.type, path: mutation.path })), warnings: plan.warnings }, options.json);
  } catch (error) {
    fail3(error);
  }
});

// src/commands/provider.ts
import { Command as Command17 } from "commander";
var providerCommand = new Command17("provider").description("View or update the LaunchStack deployment provider").argument("[provider]", providerHelpText()).action((provider) => {
  try {
    const config = readConfig();
    if (!provider) {
      const definition = PROVIDERS[config.provider];
      console.log(`Current provider: ${definition.label} (${definition.id})`);
      console.log(
        definition.remoteDeploymentSupported ? "Remote deployment is supported by LaunchStack." : "LaunchStack currently prepares artifacts/presets for this provider; it does not perform the remote deployment."
      );
      return;
    }
    if (!isProviderId(provider)) {
      console.log(`Invalid provider. Use ${providerHelpText()}.`);
      process.exitCode = 1;
      return;
    }
    config.provider = provider;
    writeConfig(config);
    console.log(`Provider updated to ${PROVIDERS[provider].label}`);
  } catch (error) {
    console.log("Could not update provider");
    if (error instanceof Error) {
      console.log(error.message);
    }
    process.exitCode = 1;
  }
});

// src/commands/rollback.ts
import { Command as Command18 } from "commander";
var rollbackCommand = new Command18("rollback").description("Show the latest successful deployment available for rollback").action(() => {
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

// src/commands/secrets.ts
import { Command as Command19 } from "commander";

// src/secrets-store.ts
import { existsSync as existsSync10, mkdirSync as mkdirSync4 } from "fs";
import { resolve as resolve9 } from "path";
var STORE_DIR2 = ".launchstack";
var SECRETS_FILE = "secrets.json";
var SECRET_MODE = 384;
var RESERVED_KEYS = /* @__PURE__ */ new Set([
  "__proto__",
  "constructor",
  "prototype"
]);
function getSecretsPath(projectDirectory = process.cwd()) {
  return resolve9(
    projectDirectory,
    STORE_DIR2,
    SECRETS_FILE
  );
}
function validateSecretKey(key) {
  const normalized = key.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(normalized) || RESERVED_KEYS.has(normalized)) {
    throw new Error(
      "Secret keys must start with a letter or underscore, contain only letters, numbers, underscores, dots, or hyphens, and must not use reserved object keys."
    );
  }
  return normalized;
}
function readSecrets(projectDirectory = process.cwd()) {
  const path = getSecretsPath(projectDirectory);
  const parsed = readJsonFile(path, {});
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("secrets.json must contain a JSON object.");
  }
  const secrets = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of Object.entries(parsed)) {
    validateSecretKey(key);
    if (typeof value !== "string") {
      throw new Error("secrets.json contains a non-string secret value.");
    }
    secrets[key] = value;
  }
  return secrets;
}
function writeSecrets(secrets, projectDirectory = process.cwd()) {
  const storeDirectory = resolve9(projectDirectory, STORE_DIR2);
  mkdirSync4(storeDirectory, { recursive: true });
  atomicWriteText(
    getSecretsPath(projectDirectory),
    `${JSON.stringify(secrets, null, 2)}
`,
    SECRET_MODE
  );
}
function setSecret(key, value, projectDirectory = process.cwd()) {
  const normalizedKey = validateSecretKey(key);
  if (value.length === 0) {
    throw new Error("Secret value must not be empty.");
  }
  const secrets = readSecrets(projectDirectory);
  secrets[normalizedKey] = value;
  writeSecrets(secrets, projectDirectory);
}
function removeSecret(key, projectDirectory = process.cwd()) {
  const normalizedKey = validateSecretKey(key);
  const secrets = readSecrets(projectDirectory);
  if (!(normalizedKey in secrets)) {
    return false;
  }
  delete secrets[normalizedKey];
  writeSecrets(secrets, projectDirectory);
  return true;
}

// src/commands/secrets.ts
async function readSecretFromStdin() {
  let value = "";
  for await (const chunk of process.stdin) {
    value += String(chunk);
  }
  return value.replace(/\r?\n$/, "");
}
async function promptHiddenSecret() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error(
      "Interactive secret entry requires a TTY. Pipe the value and use --stdin instead."
    );
  }
  return new Promise((resolve10, reject) => {
    let value = "";
    const input = process.stdin;
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };
    const onData = (chunk) => {
      const text = String(chunk);
      for (const character of text) {
        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve10(value);
          return;
        }
        if (character === "") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Secret entry cancelled."));
          return;
        }
        if (character === "\x7F" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    process.stdout.write("Secret value: ");
    input.setEncoding("utf8");
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}
var secretsCommand = new Command19("secrets").description("Manage local LaunchStack secrets");
secretsCommand.command("add").description("Add or update a local secret without exposing it in process arguments").argument("<key>", "Secret key").option("--stdin", "Read the secret value from standard input").action(async (key, options) => {
  try {
    validateSecretKey(key);
    const value = options.stdin ? await readSecretFromStdin() : await promptHiddenSecret();
    setSecret(key, value);
    console.log(`Secret saved: ${key}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not save secret.");
    process.exitCode = 1;
  }
});
secretsCommand.command("list").description("List local secret keys").action(() => {
  try {
    const keys = Object.keys(readSecrets());
    if (keys.length === 0) {
      console.log("No secrets found");
      return;
    }
    keys.forEach((key) => {
      console.log(`${key}=********`);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not read secrets.");
    process.exitCode = 1;
  }
});
secretsCommand.command("remove").description("Remove a local secret").argument("<key>", "Secret key").action((key) => {
  try {
    if (!removeSecret(key)) {
      console.log(`Secret not found: ${key}`);
      return;
    }
    console.log(`Secret removed: ${key}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not remove secret.");
    process.exitCode = 1;
  }
});

// src/commands/status.ts
import { existsSync as existsSync11 } from "fs";
import { join as join3 } from "path";
import { Command as Command20 } from "commander";
var statusCommand = new Command20("status").description("Show LaunchStack project or stage status").option("--stage <stage>", "Show one named stage").option("--json").option("-d, --directory <path>").action((options) => {
  const directory2 = options.directory ?? process.cwd();
  try {
    if (options.stage) {
      const status = inspectStage(directory2, options.stage);
      const output2 = { stage: options.stage, status: status.state?.status ?? "absent", provider: status.state?.provider ?? null, resourceId: status.state?.resourceId ?? null, url: status.state?.url ?? null, sourceCommit: status.state?.sourceCommit ?? null, production: status.state?.production ?? false, providerExists: status.providerExists ?? false, providerStatus: status.providerStatus ?? null };
      if (options.json) console.log(JSON.stringify(output2, null, 2));
      else console.log(`Stage ${options.stage}: ${output2.status}${output2.provider ? ` (${output2.provider})` : ""}`);
      return;
    }
    if (existsSync11(join3(directory2, "launchstack.json"))) {
      const manifest = loadProjectManifest(directory2);
      const state = loadProjectState(directory2, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
      const drift = detectManagedDrift(directory2, state);
      const output2 = { project: manifest.project.name, templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion(), provider: manifest.provider?.id ?? null, capabilities: Object.keys(manifest.capabilities).sort(), installedExtensions: Object.values(state.extensions).map((item) => ({ id: item.id, version: item.version, kind: item.kind })).sort((a, b) => a.id.localeCompare(b.id)), stages: Object.values(state.stages).map((item) => ({ name: item.name, status: item.status, provider: item.provider, url: item.url ?? null, production: item.production })).sort((a, b) => a.name.localeCompare(b.name)), drift: drift.filter((item) => item.kind !== "clean") };
      if (options.json) console.log(JSON.stringify(output2, null, 2));
      else {
        console.log("LaunchStack project status");
        console.log(`App: ${output2.project}`);
        console.log(`Template: ${output2.templateVersion}`);
        console.log(`Provider: ${output2.provider ?? "none"}`);
        console.log(`Capabilities: ${output2.capabilities.join(", ") || "none"}`);
        console.log(`Stages: ${output2.stages.length}`);
        console.log(`Drift: ${output2.drift.length}`);
      }
      return;
    }
    if (options.directory && directory2 !== process.cwd()) throw new Error("Legacy config status does not support --directory; run from the project directory or upgrade the manifest.");
    const config = readConfig();
    const output = { app: config.appName, environment: config.environment, provider: config.provider, buildCommand: config.buildCommand, outputDirectory: config.outputDirectory, deployTarget: config.deployTarget, config: "valid" };
    if (options.json) console.log(JSON.stringify(output, null, 2));
    else {
      console.log("LaunchStack project status");
      console.log(`App: ${config.appName}`);
      console.log(`Environment: ${config.environment}`);
      console.log(`Provider: ${config.provider}`);
      console.log(`Build command: ${config.buildCommand}`);
      console.log(`Output directory: ${config.outputDirectory}`);
      console.log(`Deploy target: ${config.deployTarget}`);
      console.log("Config: valid");
    }
  } catch (error) {
    if (options.json) console.log(JSON.stringify({ config: "missing-or-invalid", error: error instanceof Error ? error.message : String(error) }, null, 2));
    else {
      console.log("Config: missing or invalid");
      console.log("Run: launchstack init --name your-app");
    }
    process.exitCode = 1;
  }
});

// src/commands/validate.ts
import { Command as Command21 } from "commander";
var validateCommand = new Command21("validate").description("Validate the LaunchStack config file").action(() => {
  try {
    const config = readConfig();
    console.log("LaunchStack config is valid");
    console.log(`App: ${config.appName}`);
    console.log(`Provider: ${config.provider}`);
    console.log(`Environment: ${config.environment}`);
  } catch (error) {
    console.log("LaunchStack config is invalid");
    if (error instanceof Error) {
      console.log(error.message);
    }
    process.exit(1);
  }
});

// src/cli.ts
var program = new Command22();
program.name("launchstack").description("Backend API scaffolding and lifecycle platform for production TypeScript services").version(currentLaunchStackVersion());
program.addCommand(createCommand);
program.addCommand(addCommand);
program.addCommand(pluginCommand);
program.addCommand(planCommand);
program.addCommand(applyCommand);
program.addCommand(reconcileCommand);
program.addCommand(diffCommand);
program.addCommand(upgradeCommand);
program.addCommand(devCommand);
program.addCommand(clientCommand);
program.addCommand(auditCommand);
program.addCommand(generateCommand);
program.addCommand(previewCommand);
program.addCommand(stageCommand);
program.addCommand(destroyCommand);
program.addCommand(doctorCommand);
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);
program.addCommand(validateCommand);
program.addCommand(envCommand);
program.addCommand(providerCommand);
program.addCommand(secretsCommand);
program.addCommand(historyCommand);
program.addCommand(rollbackCommand);
program.addCommand(dockerCommand);
program.addCommand(githubCommand);
program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
//# sourceMappingURL=cli.mjs.map