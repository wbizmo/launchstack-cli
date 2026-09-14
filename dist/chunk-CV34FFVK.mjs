// src/extensions/first-party.ts
var extension = (value) => value;
var redis = extension({ schemaVersion: 1, id: "redis", version: "1.0.0", kind: "capability", displayName: "Redis", supportedLaunchStack: ">=2 <4", packages: { dependencies: { ioredis: "^5.4.0" } }, environment: [{ name: "REDIS_URL", description: "Redis connection URL", example: "redis://localhost:6379", required: true, secret: true }], composeServices: { redis: { image: "redis:8-alpine", restart: "unless-stopped", ports: ["6379:6379"], healthcheck: { test: ["CMD", "redis-cli", "ping"], interval: "5s", timeout: "3s", retries: 10 } } }, files: [{ path: "src/launchstack/capabilities/redis.ts", content: `import Redis from "ioredis";
export function createRedisClient(url = process.env.REDIS_URL): Redis { if (!url) throw new Error("REDIS_URL is required"); return new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null }); }
` }] });
var queue = extension({ schemaVersion: 1, id: "queue", version: "1.0.0", kind: "capability", displayName: "BullMQ queues", supportedLaunchStack: ">=2 <4", dependencies: ["redis"], packages: { dependencies: { bullmq: "^5.0.0" } }, environment: [{ name: "QUEUE_PREFIX", description: "BullMQ key prefix", example: "app" }], files: [{ path: "src/launchstack/capabilities/queue.ts", content: `import { Queue, type JobsOptions } from "bullmq";
import { createRedisClient } from "./redis";
export function createQueue<Data>(name: string): Queue<Data> { if (!/^[a-zA-Z0-9:_-]{1,80}$/.test(name)) throw new Error("Invalid queue name"); return new Queue<Data>(name, { connection: createRedisClient(), prefix: process.env.QUEUE_PREFIX || undefined, defaultJobOptions: { attempts: 3, removeOnComplete: 1000, removeOnFail: 5000 } satisfies JobsOptions }); }
` }] });
var oauth = extension({ schemaVersion: 1, id: "oauth", version: "1.0.0", kind: "capability", displayName: "OAuth client helpers", supportedLaunchStack: ">=2 <4", environment: [{ name: "OAUTH_CLIENT_ID", description: "OAuth client identifier", required: true }, { name: "OAUTH_CLIENT_SECRET", description: "OAuth client secret", required: true, secret: true }, { name: "OAUTH_REDIRECT_URI", description: "OAuth callback URL", example: "http://localhost:3000/api/auth/callback", required: true }], files: [{ path: "src/launchstack/capabilities/oauth.ts", content: `export function buildAuthorizationUrl(input: { authorizationEndpoint: string; state: string; scope: string[] }): string { if (input.state.length < 16) throw new Error("OAuth state must contain at least 16 characters"); const clientId = process.env.OAUTH_CLIENT_ID; const redirectUri = process.env.OAUTH_REDIRECT_URI; if (!clientId || !redirectUri) throw new Error("OAuth client configuration is incomplete"); const url = new URL(input.authorizationEndpoint); url.searchParams.set("response_type", "code"); url.searchParams.set("client_id", clientId); url.searchParams.set("redirect_uri", redirectUri); url.searchParams.set("scope", input.scope.join(" ")); url.searchParams.set("state", input.state); return url.toString(); }
` }] });
var storage = extension({ schemaVersion: 1, id: "storage", version: "1.0.0", kind: "capability", displayName: "S3-compatible storage", supportedLaunchStack: ">=2 <4", environment: [{ name: "STORAGE_ENDPOINT", description: "S3-compatible endpoint", required: true }, { name: "STORAGE_BUCKET", description: "Storage bucket", required: true }, { name: "STORAGE_ACCESS_KEY_ID", description: "Storage access key", required: true, secret: true }, { name: "STORAGE_SECRET_ACCESS_KEY", description: "Storage secret key", required: true, secret: true }], files: [{ path: "src/launchstack/capabilities/storage.ts", content: `export type StorageConfig = { endpoint: URL; bucket: string; accessKeyId: string; secretAccessKey: string };
export function storageConfig(): StorageConfig { const endpoint = process.env.STORAGE_ENDPOINT; const bucket = process.env.STORAGE_BUCKET; const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID; const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY; if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new Error("Storage configuration is incomplete"); return { endpoint: new URL(endpoint), bucket, accessKeyId, secretAccessKey }; }
` }] });
var observability = extension({ schemaVersion: 1, id: "observability", version: "1.0.0", kind: "capability", displayName: "OpenTelemetry baseline", supportedLaunchStack: ">=2 <4", packages: { dependencies: { "@opentelemetry/api": "^1.9.0" } }, environment: [{ name: "OTEL_SERVICE_NAME", description: "OpenTelemetry service name" }], files: [{ path: "src/launchstack/capabilities/observability.ts", content: `import { trace } from "@opentelemetry/api";
export const tracer = trace.getTracer(process.env.OTEL_SERVICE_NAME ?? "launchstack-api");
` }] });
var websocket = extension({ schemaVersion: 1, id: "websocket", version: "1.0.0", kind: "capability", displayName: "Fastify WebSocket", supportedLaunchStack: ">=2 <4", packages: { dependencies: { "@fastify/websocket": "^11.0.0" } }, files: [{ path: "src/launchstack/capabilities/websocket.ts", content: `import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
export async function registerWebsocket(app: FastifyInstance): Promise<void> { await app.register(websocket); }
` }] });
var email = extension({ schemaVersion: 1, id: "email", version: "1.0.0", kind: "capability", displayName: "Email/notification adapter", supportedLaunchStack: ">=2 <4", environment: [{ name: "EMAIL_FROM", description: "Default sender address", required: true }], files: [{ path: "src/launchstack/capabilities/email.ts", content: `export type EmailMessage = { to: string; subject: string; text: string; html?: string };
export interface EmailAdapter { send(message: EmailMessage): Promise<void>; }
export function requireEmailFrom(): string { const value = process.env.EMAIL_FROM; if (!value) throw new Error("EMAIL_FROM is required"); return value; }
` }] });
var cron = extension({ schemaVersion: 1, id: "cron", version: "1.0.0", kind: "capability", displayName: "Background scheduling", supportedLaunchStack: ">=2 <4", files: [{ path: "src/launchstack/capabilities/cron.ts", content: `export function scheduleInterval(task: () => Promise<void>, intervalMs: number): () => void { if (!Number.isFinite(intervalMs) || intervalMs < 1000) throw new Error("intervalMs must be at least 1000"); let running = false; const timer = setInterval(() => { if (running) return; running = true; void task().finally(() => { running = false; }); }, intervalMs); timer.unref(); return () => clearInterval(timer); }
` }] });
var webhooks = extension({ schemaVersion: 1, id: "webhooks", version: "1.0.0", kind: "capability", displayName: "Signed webhooks", supportedLaunchStack: ">=2 <4", environment: [{ name: "WEBHOOK_SIGNING_SECRET", description: "Webhook HMAC secret", required: true, secret: true }], files: [{ path: "src/launchstack/capabilities/webhooks.ts", content: `import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyWebhookSignature(payload: string | Buffer, signature: string, secret = process.env.WEBHOOK_SIGNING_SECRET): boolean { if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false; const expected = createHmac("sha256", secret).update(payload).digest(); const supplied = Buffer.from(signature, "hex"); return supplied.length === expected.length && timingSafeEqual(supplied, expected); }
` }] });
var FIRST_PARTY_EXTENSIONS = Object.fromEntries([redis, queue, oauth, storage, observability, websocket, email, cron, webhooks].map((item) => [item.id, item]));
function listFirstPartyExtensions() {
  return Object.values(FIRST_PARTY_EXTENSIONS).sort((left, right) => left.id.localeCompare(right.id));
}

// src/project/types.ts
var MANIFEST_SCHEMA_URL = "https://launchstack.dev/schemas/project-v1.json";
var MANIFEST_SCHEMA_VERSION = 1;
var STATE_SCHEMA_VERSION = 1;
function emptyProjectState(templateVersion, cliVersion, now = (/* @__PURE__ */ new Date()).toISOString()) {
  return { stateVersion: STATE_SCHEMA_VERSION, templateVersion, cliVersion, managedFiles: {}, extensions: {}, stages: {}, updatedAt: now };
}

// src/project/manifest.ts
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { z } from "zod";
var jsonValueSchema = z.lazy(() => z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]));
var capabilitySchema = z.object({ version: z.string().min(1).max(64), provider: z.string().min(1).max(64).optional(), options: z.record(z.string(), jsonValueSchema).optional() }).strict();
var stageSchema = z.object({ provider: z.string().min(1).max(64).optional(), source: z.string().min(1).max(256).optional(), production: z.boolean().optional(), env: z.record(z.string(), z.string()).optional() }).strict();
var suppressionSchema = z.object({ ruleId: z.string().regex(/^LS\d{3}$/), reason: z.string().trim().min(8).max(300) }).strict();
var projectManifestSchema = z.object({
  $schema: z.literal(MANIFEST_SCHEMA_URL),
  schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
  project: z.object({ name: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/), templateVersion: z.string().min(1).max(64) }).strict(),
  capabilities: z.record(z.string(), capabilitySchema),
  provider: z.object({ id: z.string().min(1).max(64) }).strict().optional(),
  stages: z.record(z.string(), stageSchema),
  audit: z.object({ suppressions: z.array(suppressionSchema).max(100) }).strict().optional()
}).strict();
var MANIFEST_FILENAME = "launchstack.json";
function parseProjectManifest(input) {
  const result = projectManifestSchema.safeParse(input);
  if (!result.success) {
    const detail = result.error.issues.map((issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`).join("; ");
    throw new Error(`Invalid ${MANIFEST_FILENAME}: ${detail}`);
  }
  return result.data;
}
function loadProjectManifest(projectDirectory) {
  const manifestPath = join(resolve(projectDirectory), MANIFEST_FILENAME);
  try {
    return parseProjectManifest(JSON.parse(readFileSync(manifestPath, "utf8")));
  } catch (error) {
    throw new Error(`Unable to read ${MANIFEST_FILENAME}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function serializeProjectManifest(manifest) {
  return `${JSON.stringify(parseProjectManifest(manifest), null, 2)}
`;
}
function createProjectManifest(input) {
  return parseProjectManifest({ $schema: MANIFEST_SCHEMA_URL, schemaVersion: MANIFEST_SCHEMA_VERSION, project: input, capabilities: {}, provider: { id: "docker" }, stages: {} });
}

// src/project/state.ts
import { createHash } from "crypto";
import { existsSync, readFileSync as readFileSync2 } from "fs";
import { join as join2, resolve as resolve2 } from "path";
import { z as z2 } from "zod";
var managedFileSchema = z2.object({ owner: z2.string().min(1), sha256: z2.string().regex(/^[a-f0-9]{64}$/), version: z2.string().min(1) }).strict();
var extensionSchema = z2.object({ id: z2.string().min(1), version: z2.string().min(1), kind: z2.enum(["capability", "plugin"]), source: z2.string().optional(), installedAt: z2.string().min(1) }).strict();
var stageSchema2 = z2.object({ name: z2.string().min(1), provider: z2.string().min(1), resourceId: z2.string().min(1), status: z2.enum(["creating", "ready", "failed", "destroyed"]), sourceCommit: z2.string().optional(), url: z2.string().optional(), createdAt: z2.string().min(1), updatedAt: z2.string().min(1), production: z2.boolean() }).strict();
var projectStateSchema = z2.object({ stateVersion: z2.literal(STATE_SCHEMA_VERSION), templateVersion: z2.string().min(1), cliVersion: z2.string().min(1), managedFiles: z2.record(z2.string(), managedFileSchema), extensions: z2.record(z2.string(), extensionSchema), stages: z2.record(z2.string(), stageSchema2), updatedAt: z2.string().min(1) }).strict();
var STATE_DIRECTORY = ".launchstack";
var STATE_FILENAME = "state.json";
function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}
function hashFile(path) {
  return sha256(readFileSync2(path));
}
function parseProjectState(input) {
  const result = projectStateSchema.safeParse(input);
  if (!result.success) throw new Error(`Invalid LaunchStack state: ${result.error.issues.map((issue) => `${issue.path.join(".") || "state"}: ${issue.message}`).join("; ")}`);
  return result.data;
}
function loadProjectState(projectDirectory, defaults) {
  const statePath = join2(resolve2(projectDirectory), STATE_DIRECTORY, STATE_FILENAME);
  if (!existsSync(statePath)) return emptyProjectState(defaults?.templateVersion ?? "unknown", defaults?.cliVersion ?? "unknown");
  try {
    return parseProjectState(JSON.parse(readFileSync2(statePath, "utf8")));
  } catch (error) {
    throw new Error(`Unable to read LaunchStack state: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function serializeProjectState(state) {
  return `${JSON.stringify(parseProjectState(state), null, 2)}
`;
}
function detectManagedDrift(projectDirectory, state) {
  const root = resolve2(projectDirectory);
  const entries = [];
  for (const [path, managed] of Object.entries(state.managedFiles)) {
    const absolute = join2(root, path);
    if (!existsSync(absolute)) {
      entries.push({ path, kind: "missing", owner: managed.owner, expectedSha256: managed.sha256 });
      continue;
    }
    const actualSha256 = hashFile(absolute);
    entries.push({ path, kind: actualSha256 === managed.sha256 ? "clean" : "modified", owner: managed.owner, expectedSha256: managed.sha256, actualSha256 });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

// src/version.ts
function currentLaunchStackVersion() {
  if (process.env.LAUNCHSTACK_VERSION_OVERRIDE) return process.env.LAUNCHSTACK_VERSION_OVERRIDE;
  return true ? "3.0.0" : "0.0.0-dev";
}

// src/extensions/engine.ts
import { existsSync as existsSync4, readFileSync as readFileSync4 } from "fs";
import { resolve as resolve5 } from "path";

// src/project/paths.ts
import { existsSync as existsSync2, lstatSync, realpathSync } from "fs";
import { dirname, isAbsolute, relative, resolve as resolve3, sep } from "path";
function normalizeManagedPath(path) {
  if (!path || path.includes("\0") || isAbsolute(path)) throw new Error(`Unsafe managed path: ${JSON.stringify(path)}`);
  const segments = path.split(/[\\/]+/).filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === ".." || segment === ".")) throw new Error(`Unsafe managed path: ${JSON.stringify(path)}`);
  return segments.join("/");
}
function resolveProjectPath(projectDirectory, path) {
  const root = resolve3(projectDirectory);
  const normalized = normalizeManagedPath(path);
  const target = resolve3(root, ...normalized.split("/"));
  const fromRoot = relative(root, target);
  if (fromRoot === "" || fromRoot.startsWith(`..${sep}`) || fromRoot === ".." || isAbsolute(fromRoot)) throw new Error(`Managed path escapes project root: ${path}`);
  let cursor = root;
  for (const segment of normalized.split("/")) {
    cursor = resolve3(cursor, segment);
    if (existsSync2(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error(`Refusing to mutate symbolic-link path: ${path}`);
  }
  if (existsSync2(root)) {
    const realRoot = realpathSync(root);
    let current = dirname(target);
    while (!existsSync2(current) && current !== realRoot) current = dirname(current);
    if (existsSync2(current)) {
      const relativeParent = relative(realRoot, realpathSync(current));
      if (relativeParent.startsWith(`..${sep}`) || relativeParent === ".." || isAbsolute(relativeParent)) throw new Error(`Managed path resolves outside project root: ${path}`);
    }
  }
  return target;
}

// src/project/transaction.ts
import {
  chmodSync,
  closeSync,
  existsSync as existsSync3,
  mkdirSync,
  openSync,
  readFileSync as readFileSync3,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "fs";
import { randomUUID } from "crypto";
import { dirname as dirname2, join as join3, resolve as resolve4 } from "path";
var metadataDirectory = (projectDirectory) => join3(resolve4(projectDirectory), ".launchstack");
var journalPath = (projectDirectory) => join3(metadataDirectory(projectDirectory), "mutation-journal.json");
function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function acquireLock(projectDirectory) {
  const directory = metadataDirectory(projectDirectory);
  mkdirSync(directory, { recursive: true });
  const lockPath = join3(directory, "mutation.lock");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = openSync(lockPath, "wx", 384);
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid, createdAt: Date.now() }));
      closeSync(descriptor);
      return () => {
        try {
          unlinkSync(lockPath);
        } catch {
        }
      };
    } catch (error) {
      if (!existsSync3(lockPath)) throw error;
      let stale = false;
      try {
        const lock = JSON.parse(readFileSync3(lockPath, "utf8"));
        stale = !processIsAlive(lock.pid ?? -1);
      } catch {
        stale = true;
      }
      if (!stale || attempt > 0) {
        throw new Error("Another LaunchStack mutation is already running for this project.");
      }
      unlinkSync(lockPath);
    }
  }
  throw new Error("Unable to acquire LaunchStack project mutation lock.");
}
function restoreJournal(projectDirectory, journal) {
  for (const mutation of [...journal.mutations].reverse()) {
    const target = resolveProjectPath(projectDirectory, mutation.path);
    const backup = join3(journal.backupDirectory, mutation.path);
    if (existsSync3(target)) rmSync(target, { recursive: true, force: true });
    if (mutation.hadOriginal && existsSync3(backup)) {
      mkdirSync(dirname2(target), { recursive: true });
      renameSync(backup, target);
    }
  }
  rmSync(journal.stageDirectory, { recursive: true, force: true });
  rmSync(journal.backupDirectory, { recursive: true, force: true });
  rmSync(journalPath(projectDirectory), { force: true });
}
function recoverInterruptedMutation(projectDirectory) {
  const path = journalPath(projectDirectory);
  if (!existsSync3(path)) return false;
  restoreJournal(projectDirectory, JSON.parse(readFileSync3(path, "utf8")));
  return true;
}
function withTrackedMutations(state, mutations) {
  const next = structuredClone(state);
  for (const mutation of mutations) {
    if (mutation.owner === "launchstack:metadata") continue;
    if (mutation.type === "write") {
      next.managedFiles[mutation.path] = {
        owner: mutation.owner,
        version: mutation.version,
        sha256: sha256(mutation.content)
      };
    } else {
      delete next.managedFiles[mutation.path];
    }
  }
  next.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return next;
}
function applyFileMutations(input) {
  const projectDirectory = resolve4(input.projectDirectory);
  const releaseLock = acquireLock(projectDirectory);
  try {
    recoverInterruptedMutation(projectDirectory);
    const id = randomUUID();
    const metadata = metadataDirectory(projectDirectory);
    const stageDirectory = join3(metadata, `.stage-${id}`);
    const backupDirectory = join3(metadata, `.backup-${id}`);
    mkdirSync(stageDirectory, { recursive: true, mode: 448 });
    mkdirSync(backupDirectory, { recursive: true, mode: 448 });
    try {
      const uniquePaths = /* @__PURE__ */ new Set();
      for (const mutation of input.mutations) {
        if (uniquePaths.has(mutation.path)) {
          throw new Error(`Mutation plan contains duplicate target: ${mutation.path}`);
        }
        uniquePaths.add(mutation.path);
        const target = resolveProjectPath(projectDirectory, mutation.path);
        const exists = existsSync3(target);
        if (mutation.type === "write") {
          if (mutation.expectedSha256 === null && exists) {
            throw new Error(`Refusing to overwrite unmanaged file: ${mutation.path}`);
          }
          if (typeof mutation.expectedSha256 === "string" && (!exists || hashFile(target) !== mutation.expectedSha256)) {
            throw new Error(`File changed since planning: ${mutation.path}`);
          }
          const staged = join3(stageDirectory, mutation.path);
          mkdirSync(dirname2(staged), { recursive: true });
          writeFileSync(staged, mutation.content, "utf8");
          chmodSync(staged, mutation.executable ? 493 : 420);
        } else if (!exists || hashFile(target) !== mutation.expectedSha256) {
          throw new Error(`Managed file changed before delete: ${mutation.path}`);
        }
      }
    } catch (error) {
      rmSync(stageDirectory, { recursive: true, force: true });
      rmSync(backupDirectory, { recursive: true, force: true });
      throw error;
    }
    const journal = {
      id,
      backupDirectory,
      stageDirectory,
      mutations: input.mutations.map((mutation) => ({
        type: mutation.type,
        path: mutation.path,
        hadOriginal: existsSync3(resolveProjectPath(projectDirectory, mutation.path))
      }))
    };
    writeFileSync(journalPath(projectDirectory), JSON.stringify(journal, null, 2), { mode: 384 });
    try {
      for (const mutation of input.mutations) {
        const target = resolveProjectPath(projectDirectory, mutation.path);
        const backup = join3(backupDirectory, mutation.path);
        if (existsSync3(target)) {
          mkdirSync(dirname2(backup), { recursive: true });
          renameSync(target, backup);
        }
        if (mutation.type === "write") {
          const staged = join3(stageDirectory, mutation.path);
          mkdirSync(dirname2(target), { recursive: true });
          renameSync(staged, target);
        }
      }
      const nextState = input.nextState ?? withTrackedMutations(input.state, input.mutations);
      rmSync(stageDirectory, { recursive: true, force: true });
      rmSync(backupDirectory, { recursive: true, force: true });
      rmSync(journalPath(projectDirectory), { force: true });
      return nextState;
    } catch (error) {
      restoreJournal(projectDirectory, journal);
      throw error;
    }
  } finally {
    releaseLock();
  }
}

// src/extensions/engine.ts
function compatible(version, range) {
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);
  if (!Number.isInteger(major)) return false;
  const lower = range.match(/>=\s*(\d+)/)?.[1];
  const upper = range.match(/<\s*(\d+)/)?.[1];
  return !(lower && major < Number(lower)) && !(upper && major >= Number(upper));
}
function resolveExtensionOrder(requested, registry) {
  const order = [];
  const visiting = /* @__PURE__ */ new Set();
  const visited = /* @__PURE__ */ new Set();
  const visit = (id, chain) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`Extension dependency cycle: ${[...chain, id].join(" -> ")}`);
    const item = registry[id];
    if (!item) throw new Error(`Unknown extension: ${id}`);
    visiting.add(id);
    for (const dep of item.dependencies ?? []) visit(dep, [...chain, id]);
    visiting.delete(id);
    visited.add(id);
    order.push(item);
  };
  for (const id of requested) visit(id, []);
  return order;
}
function packageMutation(projectDirectory, extensions) {
  const deps = {};
  const devDeps = {};
  for (const item of extensions) {
    Object.assign(deps, item.packages?.dependencies ?? {});
    Object.assign(devDeps, item.packages?.devDependencies ?? {});
  }
  if (!Object.keys(deps).length && !Object.keys(devDeps).length) return null;
  const path = resolveProjectPath(projectDirectory, "package.json");
  if (!existsSync4(path)) throw new Error("Cannot install package-backed capability without package.json");
  const existingText = readFileSync4(path, "utf8");
  const parsed = JSON.parse(existingText);
  const currentDeps = parsed.dependencies ?? {};
  const currentDev = parsed.devDependencies ?? {};
  const sort = (value) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
  const nextText = `${JSON.stringify({ ...parsed, dependencies: sort({ ...currentDeps, ...deps }), devDependencies: sort({ ...currentDev, ...devDeps }) }, null, 2)}
`;
  if (nextText === existingText) return null;
  return { type: "write", path: "package.json", content: nextText, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: hashFile(path) };
}
function envMutation(projectDirectory, extensions) {
  const vars = extensions.flatMap((item) => item.environment ?? []);
  if (!vars.length) return null;
  const path = ".env.example";
  const absolute = resolveProjectPath(projectDirectory, path);
  const existing = existsSync4(absolute) ? readFileSync4(absolute, "utf8") : "";
  const known = new Set(existing.split(/\r?\n/).map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1]).filter((value) => Boolean(value)));
  const additions = vars.filter((item) => !known.has(item.name)).sort((a, b) => a.name.localeCompare(b.name)).map((item) => `${item.name}=${item.example ?? ""}`);
  if (!additions.length) return null;
  const prefix = existing && !existing.endsWith("\n") ? `${existing}
` : existing;
  return { type: "write", path, content: `${prefix}${additions.join("\n")}
`, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync4(absolute) ? hashFile(absolute) : null };
}
function fileMutations(projectDirectory, state, extensions) {
  const output = [];
  for (const item of extensions) {
    for (const file of item.files ?? []) {
      const absolute = resolveProjectPath(projectDirectory, file.path);
      const tracked = state.managedFiles[file.path];
      if (tracked && tracked.owner !== item.id) throw new Error(`File ${file.path} is owned by ${tracked.owner}`);
      if (existsSync4(absolute)) {
        const current = hashFile(absolute);
        if (!tracked) throw new Error(`Refusing to overwrite user-owned file: ${file.path}`);
        if (tracked.sha256 !== current) throw new Error(`Managed file has local modifications: ${file.path}`);
        if (readFileSync4(absolute, "utf8") === file.content) continue;
        output.push({ type: "write", path: file.path, content: file.content, owner: item.id, version: item.version, expectedSha256: current, executable: file.executable });
      } else output.push({ type: "write", path: file.path, content: file.content, owner: item.id, version: item.version, expectedSha256: null, executable: file.executable });
    }
    if (item.composeServices && Object.keys(item.composeServices).length) {
      const path = `.launchstack/generated/compose/${item.id}.json`;
      const absolute = resolveProjectPath(projectDirectory, path);
      const tracked = state.managedFiles[path];
      if (existsSync4(absolute) && (!tracked || tracked.owner !== item.id || tracked.sha256 !== hashFile(absolute))) throw new Error(`Compose fragment has local modifications: ${path}`);
      const content = `${JSON.stringify({ services: item.composeServices }, null, 2)}
`;
      if (!existsSync4(absolute) || readFileSync4(absolute, "utf8") !== content) output.push({ type: "write", path, content, owner: item.id, version: item.version, expectedSha256: existsSync4(absolute) ? hashFile(absolute) : null });
    }
  }
  return output;
}
function metadataMutations(projectDirectory, manifest, state) {
  const output = [];
  for (const item of [
    { path: "launchstack.json", content: serializeProjectManifest(manifest) },
    { path: ".launchstack/state.json", content: serializeProjectState(state) }
  ]) {
    const absolute = resolveProjectPath(projectDirectory, item.path);
    const existing = existsSync4(absolute) ? readFileSync4(absolute, "utf8") : null;
    if (existing === item.content) continue;
    output.push({
      type: "write",
      path: item.path,
      content: item.content,
      owner: "launchstack:metadata",
      version: currentLaunchStackVersion(),
      expectedSha256: existsSync4(absolute) ? hashFile(absolute) : null
    });
  }
  return output;
}
function planExtensionInstall(input) {
  const projectDirectory = resolve5(input.projectDirectory);
  const manifest = loadProjectManifest(projectDirectory);
  const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  const ordered = resolveExtensionOrder(input.requested, input.registry);
  const selected = new Set(ordered.map((item) => item.id));
  for (const item of ordered) {
    if (!compatible(manifest.project.templateVersion, item.supportedLaunchStack)) throw new Error(`${item.id}@${item.version} does not support project ${manifest.project.templateVersion}`);
    for (const conflict of item.conflicts ?? []) if (selected.has(conflict) || state.extensions[conflict]) throw new Error(`${item.id} conflicts with ${conflict}`);
  }
  const mutations = fileMutations(projectDirectory, state, ordered);
  const packageWrite = packageMutation(projectDirectory, ordered);
  if (packageWrite) mutations.push(packageWrite);
  const envWrite = envMutation(projectDirectory, ordered);
  if (envWrite) mutations.push(envWrite);
  const nextManifest = structuredClone(manifest);
  const nextState = withTrackedMutations(state, mutations);
  const installedAt = (/* @__PURE__ */ new Date()).toISOString();
  for (const item of ordered) {
    if (item.kind === "capability") nextManifest.capabilities[item.id] = { ...nextManifest.capabilities[item.id] ?? {}, version: item.version };
    const current = state.extensions[item.id];
    nextState.extensions[item.id] = current?.version === item.version ? current : { id: item.id, version: item.version, kind: item.kind, installedAt, source: item.kind === "plugin" ? item.id : void 0 };
  }
  nextState.templateVersion = manifest.project.templateVersion;
  nextState.cliVersion = currentLaunchStackVersion();
  if (mutations.length || ordered.some((item) => state.extensions[item.id]?.version !== item.version)) nextState.updatedAt = installedAt;
  const changed = ordered.filter((item) => state.extensions[item.id]?.version !== item.version);
  const actions = [...changed.map((item) => ({ kind: "metadata", target: item.id, detail: state.extensions[item.id] ? `upgrade ${state.extensions[item.id]?.version} -> ${item.version}` : `install ${item.version}` })), ...mutations.map((mutation) => ({ kind: mutation.path === "package.json" ? "package" : mutation.path === ".env.example" ? "environment" : mutation.path.includes("/compose/") ? "compose" : "file", target: mutation.path, detail: mutation.type }))];
  return { projectDirectory, extensionIds: ordered.map((item) => item.id), actions, warnings: ordered.flatMap((item) => item.hooks?.length ? [`${item.id} declares executable hooks; declarative installation does not execute them.`] : []), noop: actions.length === 0, mutations, nextManifest, nextState };
}
function applyExtensionInstall(plan) {
  if (plan.noop) return plan.nextState;
  return applyFileMutations({ projectDirectory: plan.projectDirectory, mutations: [...plan.mutations, ...metadataMutations(plan.projectDirectory, plan.nextManifest, plan.nextState)], state: loadProjectState(plan.projectDirectory, { templateVersion: plan.nextManifest.project.templateVersion, cliVersion: currentLaunchStackVersion() }), nextState: plan.nextState });
}

// src/project/reconcile.ts
import { existsSync as existsSync6 } from "fs";
import { resolve as resolve7 } from "path";

// src/extensions/remove.ts
import { existsSync as existsSync5 } from "fs";
import { resolve as resolve6 } from "path";
function metadataWrite(projectDirectory, path, content) {
  const absolute = resolveProjectPath(projectDirectory, path);
  return { type: "write", path, content, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync5(absolute) ? hashFile(absolute) : null };
}
function planExtensionRemoval(input) {
  const projectDirectory = resolve6(input.projectDirectory);
  const manifest = loadProjectManifest(projectDirectory);
  const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  if (!state.extensions[input.extension.id]) throw new Error(`${input.extension.id} is not installed.`);
  const mutations = [];
  for (const [path, managed] of Object.entries(state.managedFiles)) {
    if (managed.owner !== input.extension.id) continue;
    const absolute = resolveProjectPath(projectDirectory, path);
    if (!existsSync5(absolute)) throw new Error(`Managed plugin file is missing: ${path}`);
    const current = hashFile(absolute);
    if (current !== managed.sha256) throw new Error(`Refusing to remove locally modified file: ${path}`);
    mutations.push({ type: "delete", path, owner: input.extension.id, expectedSha256: current });
  }
  const nextManifest = structuredClone(manifest);
  if (input.extension.kind === "capability") delete nextManifest.capabilities[input.extension.id];
  const nextState = structuredClone(state);
  for (const mutation of mutations) delete nextState.managedFiles[mutation.path];
  delete nextState.extensions[input.extension.id];
  nextState.cliVersion = currentLaunchStackVersion();
  nextState.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const warnings = [];
  if (input.extension.packages) warnings.push("Package dependencies are preserved on removal because other code may still depend on them.");
  if (input.extension.environment?.length) warnings.push("Environment variable declarations are preserved to avoid deleting user configuration.");
  return { projectDirectory, extension: input.extension, mutations, nextManifest, nextState, warnings };
}
function applyExtensionRemoval(plan) {
  return applyFileMutations({ projectDirectory: plan.projectDirectory, mutations: [...plan.mutations, metadataWrite(plan.projectDirectory, "launchstack.json", serializeProjectManifest(plan.nextManifest)), metadataWrite(plan.projectDirectory, ".launchstack/state.json", serializeProjectState(plan.nextState))], state: loadProjectState(plan.projectDirectory), nextState: plan.nextState });
}

// src/project/reconcile.ts
function planReconciliation(projectDirectoryInput) {
  const projectDirectory = resolve7(projectDirectoryInput);
  const manifest = loadProjectManifest(projectDirectory);
  const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  const desiredCapabilities = Object.keys(manifest.capabilities).sort();
  const installedCapabilities = Object.values(state.extensions).filter((item) => item.kind === "capability").map((item) => item.id).sort();
  const installCapabilities = desiredCapabilities.filter((id) => !state.extensions[id] || state.extensions[id]?.version !== manifest.capabilities[id]?.version);
  const desiredSet = new Set(desiredCapabilities);
  const removeCapabilities = installedCapabilities.filter((id) => !desiredSet.has(id));
  const drift = detectManagedDrift(projectDirectory, state);
  const conflicts = drift.filter((item) => item.kind === "modified").map((item) => `Managed file has local modifications: ${item.path}`);
  const actions = [];
  for (const id of installCapabilities) {
    if (!FIRST_PARTY_EXTENSIONS[id]) {
      conflicts.push(`Manifest capability is not available: ${id}`);
      continue;
    }
    actions.push({ id: `capability:${id}:install`, kind: state.extensions[id] ? "upgrade" : "install", target: id, detail: `${state.extensions[id]?.version ?? "absent"} -> ${manifest.capabilities[id]?.version ?? "unknown"}` });
  }
  for (const id of removeCapabilities) {
    if (!FIRST_PARTY_EXTENSIONS[id]) conflicts.push(`Installed capability cannot be removed by this CLI: ${id}`);
    actions.push({ id: `capability:${id}:remove`, kind: "remove", target: id, detail: "installed capability is absent from desired manifest", destructive: true });
  }
  return { projectDirectory, desiredCapabilities, installCapabilities, removeCapabilities, drift, actions, warnings: removeCapabilities.length ? ["Capability removals are destructive and require --allow-remove during apply."] : [], conflicts };
}
function applyReconciliation(input) {
  let plan = planReconciliation(input.projectDirectory);
  if (plan.conflicts.length) throw new Error(`Cannot reconcile project: ${plan.conflicts.join("; ")}`);
  if (plan.removeCapabilities.length && !input.allowRemove) throw new Error("Reconciliation includes capability removal. Re-run with --allow-remove after reviewing the plan.");
  for (const id of plan.installCapabilities) {
    const item = FIRST_PARTY_EXTENSIONS[id];
    if (!item) throw new Error(`Unknown first-party capability: ${id}`);
    const desiredVersion = loadProjectManifest(input.projectDirectory).capabilities[id]?.version;
    if (desiredVersion && desiredVersion !== item.version) throw new Error(`Requested ${id}@${desiredVersion}, but this CLI provides ${item.version}.`);
    applyExtensionInstall(planExtensionInstall({ projectDirectory: input.projectDirectory, requested: [id], registry: FIRST_PARTY_EXTENSIONS }));
  }
  if (plan.removeCapabilities.length) {
    const ordered = resolveExtensionOrder(plan.removeCapabilities, FIRST_PARTY_EXTENSIONS).reverse();
    for (const item of ordered) {
      if (!plan.removeCapabilities.includes(item.id)) continue;
      const fresh = planReconciliation(input.projectDirectory);
      if (fresh.removeCapabilities.includes(item.id)) applyExtensionRemoval(planExtensionRemoval({ projectDirectory: input.projectDirectory, extension: item }));
    }
  }
  plan = planReconciliation(input.projectDirectory);
  return plan;
}
function projectHasManifest(projectDirectory) {
  return existsSync6(resolve7(projectDirectory, "launchstack.json"));
}

// src/project/upgrade.ts
import { existsSync as existsSync7, readFileSync as readFileSync5 } from "fs";
import { resolve as resolve8 } from "path";
var V3_TEMPLATE_VERSION = "3.0.0";
function readText(projectDirectory, path) {
  const absolute = resolveProjectPath(projectDirectory, path);
  if (!existsSync7(absolute)) throw new Error(`Expected project file is missing: ${path}`);
  return { content: readFileSync5(absolute, "utf8"), hash: hashFile(absolute) };
}
function inferLegacyProject(projectDirectory) {
  const packagePath = resolveProjectPath(projectDirectory, "package.json");
  if (!existsSync7(packagePath)) throw new Error("No launchstack.json or package.json was found; this does not look like a LaunchStack project.");
  const parsed = JSON.parse(readFileSync5(packagePath, "utf8"));
  if (typeof parsed.name !== "string" || typeof parsed.version !== "string") throw new Error("Legacy package.json does not contain a valid name/version.");
  if (!existsSync7(resolveProjectPath(projectDirectory, "src/app.ts")) || !existsSync7(resolveProjectPath(projectDirectory, "src/routes/index.ts"))) throw new Error("Legacy project is missing LaunchStack architecture files.");
  if (!/^2\./.test(parsed.version) && !/^3\./.test(parsed.version)) throw new Error(`Unsupported legacy template version: ${parsed.version}`);
  return { name: parsed.name, version: parsed.version };
}
function patchRoutes(content) {
  if (content.includes("registerGeneratedRoutes")) return content;
  const anchor = /import \{ readinessRoutes \} from ["']\.\/readiness["'];/;
  if (!anchor.test(content)) throw new Error("Cannot safely upgrade src/routes/index.ts: readiness import anchor not found.");
  let next = content.replace(anchor, (match) => `${match}
import { registerGeneratedRoutes } from "./launchstack.generated";`);
  const closing = next.lastIndexOf("}\n");
  if (closing < 0) throw new Error("Cannot safely upgrade src/routes/index.ts: function boundary not found.");
  return `${next.slice(0, closing)}
  await registerGeneratedRoutes(app);
${next.slice(closing)}`;
}
function patchApp(content) {
  if (content.includes("registerLaunchStackCapabilities")) return content;
  const anchor = /import \{ registerPlugins \} from ["']\.\/plugins["'];/;
  if (!anchor.test(content)) throw new Error("Cannot safely upgrade src/app.ts: plugin import anchor not found.");
  let next = content.replace(anchor, (match) => `${match}
import { registerLaunchStackCapabilities } from "./launchstack/capabilities";`);
  const call = "  await registerPlugins(app);";
  if (!next.includes(call)) throw new Error("Cannot safely upgrade src/app.ts: plugin registration anchor not found.");
  return next.replace(call, `${call}
  await registerLaunchStackCapabilities(app);`);
}
function metadataMutation(projectDirectory, path, content) {
  const absolute = resolveProjectPath(projectDirectory, path);
  return { type: "write", path, content, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync7(absolute) ? hashFile(absolute) : null };
}
function planUpgrade(projectDirectoryInput) {
  const projectDirectory = resolve8(projectDirectoryInput);
  const hasManifest = existsSync7(resolveProjectPath(projectDirectory, "launchstack.json"));
  const legacy = hasManifest ? null : inferLegacyProject(projectDirectory);
  const manifest = hasManifest ? loadProjectManifest(projectDirectory) : createProjectManifest({ name: legacy?.name ?? "legacy-project", templateVersion: legacy?.version ?? "2.0.0" });
  const fromVersion = manifest.project.templateVersion;
  const state = hasManifest ? loadProjectState(projectDirectory, { templateVersion: fromVersion, cliVersion: currentLaunchStackVersion() }) : emptyProjectState(fromVersion, currentLaunchStackVersion());
  const actions = [];
  const conflicts = [];
  const mutations = [];
  if (!/^2\./.test(fromVersion) && fromVersion !== V3_TEMPLATE_VERSION) conflicts.push(`No ordered migration is registered from template ${fromVersion}.`);
  const generatedRoutesPath = "src/routes/launchstack.generated.ts";
  if (!existsSync7(resolveProjectPath(projectDirectory, generatedRoutesPath))) {
    mutations.push({ type: "write", path: generatedRoutesPath, content: `import type { FastifyInstance } from "fastify";

/* launchstack-routes: [] */
export async function registerGeneratedRoutes(app: FastifyInstance): Promise<void> { void app; }
`, owner: "launchstack:core", version: V3_TEMPLATE_VERSION, expectedSha256: null });
    actions.push({ id: "v3:route-registry", kind: "write", target: generatedRoutesPath, detail: "create generated route ownership boundary" });
  }
  const capabilitiesPath = "src/launchstack/capabilities/index.ts";
  if (!existsSync7(resolveProjectPath(projectDirectory, capabilitiesPath))) {
    mutations.push({ type: "write", path: capabilitiesPath, content: `import type { FastifyInstance } from "fastify";
export async function registerLaunchStackCapabilities(app: FastifyInstance): Promise<void> { void app; }
`, owner: "launchstack:core", version: V3_TEMPLATE_VERSION, expectedSha256: null });
    actions.push({ id: "v3:capability-registry", kind: "write", target: capabilitiesPath, detail: "create capability ownership boundary" });
  }
  try {
    const routes = readText(projectDirectory, "src/routes/index.ts");
    const next = patchRoutes(routes.content);
    if (next !== routes.content) {
      mutations.push({ type: "write", path: "src/routes/index.ts", content: next, owner: "launchstack:metadata", version: V3_TEMPLATE_VERSION, expectedSha256: routes.hash });
      actions.push({ id: "v3:routes-wire", kind: "write", target: "src/routes/index.ts", detail: "wire generated route registry" });
    }
  } catch (error) {
    conflicts.push(error instanceof Error ? error.message : String(error));
  }
  try {
    const app = readText(projectDirectory, "src/app.ts");
    const next = patchApp(app.content);
    if (next !== app.content) {
      mutations.push({ type: "write", path: "src/app.ts", content: next, owner: "launchstack:metadata", version: V3_TEMPLATE_VERSION, expectedSha256: app.hash });
      actions.push({ id: "v3:capabilities-wire", kind: "write", target: "src/app.ts", detail: "wire capability registry" });
    }
  } catch (error) {
    conflicts.push(error instanceof Error ? error.message : String(error));
  }
  const nextManifest = structuredClone(manifest);
  nextManifest.project.templateVersion = V3_TEMPLATE_VERSION;
  const nextState = withTrackedMutations(state, mutations);
  nextState.templateVersion = V3_TEMPLATE_VERSION;
  nextState.cliVersion = currentLaunchStackVersion();
  nextState.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (!hasManifest || fromVersion !== V3_TEMPLATE_VERSION) actions.push({ id: "v3:metadata", kind: "upgrade", target: "launchstack.json", detail: `${fromVersion} -> ${V3_TEMPLATE_VERSION}` });
  return { projectDirectory, fromVersion, toVersion: V3_TEMPLATE_VERSION, actions, conflicts, mutations, nextManifest, nextState };
}
function applyUpgrade(plan) {
  if (plan.conflicts.length) throw new Error(`Upgrade conflicts: ${plan.conflicts.join("; ")}`);
  return applyFileMutations({ projectDirectory: plan.projectDirectory, mutations: [...plan.mutations, metadataMutation(plan.projectDirectory, "launchstack.json", serializeProjectManifest(plan.nextManifest)), metadataMutation(plan.projectDirectory, ".launchstack/state.json", serializeProjectState(plan.nextState))], state: existsSync7(resolveProjectPath(plan.projectDirectory, ".launchstack/state.json")) ? loadProjectState(plan.projectDirectory) : emptyProjectState(plan.fromVersion, currentLaunchStackVersion()), nextState: plan.nextState });
}

// src/audit/run.ts
import { existsSync as existsSync8, readFileSync as readFileSync6 } from "fs";
import { execFileSync } from "child_process";
import { join as join4, resolve as resolve9 } from "path";
var readIfPresent = (root, path) => {
  const absolute = join4(root, path);
  return existsSync8(absolute) ? readFileSync6(absolute, "utf8") : void 0;
};
function packageJson(root) {
  const content = readIfPresent(root, "package.json");
  if (!content) return void 0;
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function gitTrackedFiles(root) {
  try {
    return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\0").filter(Boolean);
  } catch {
    return [];
  }
}
var finding = (ruleId, severity, title, detail, verified, path) => ({ ruleId, severity, title, detail, verified, path });
var SECRET_FILE_PATTERNS = [/^\.env(?:\..+)?$/, /(^|\/)\.env(?:\..+)?$/, /(^|\/)secrets?\.json$/i, /(^|\/).*\.pem$/i, /(^|\/).*\.p12$/i, /(^|\/)id_rsa$/i];
function runProductionAudit(projectDirectoryInput) {
  const root = resolve9(projectDirectoryInput);
  const findings = [];
  const pkg = packageJson(root);
  if (!existsSync8(join4(root, "package-lock.json"))) findings.push(finding("LS001", "high", "Dependency graph is not locked", "package-lock.json is missing; production installs are not reproducible.", true, "package-lock.json"));
  const cors = readIfPresent(root, "src/plugins/cors.ts") ?? "";
  const envExample = readIfPresent(root, ".env.example") ?? "";
  if (cors && /origin\s*:\s*true|origin\s*:\s*["']\*["']/.test(cors)) findings.push(finding("LS002", "high", "Production CORS may be unrestricted", "CORS source contains an unrestricted origin setting.", true, "src/plugins/cors.ts"));
  const authRoutes = readIfPresent(root, "src/modules/auth/auth.routes.ts") ?? "";
  if (authRoutes && !/rateLimit|max:\s*\d+/.test(authRoutes)) findings.push(finding("LS003", "high", "Authentication routes lack visible rate limits", "Authentication endpoints should enforce bounded request rates before expensive work.", true, "src/modules/auth/auth.routes.ts"));
  for (const entry of [".env", ".env.example"].map((path) => ({ path, content: readIfPresent(root, path) })).filter((item) => item.content !== void 0)) if ((entry.content ?? "").split(/\r?\n/).some((line) => /^(JWT_(?:ACCESS|REFRESH)_SECRET)=\s*(?:secret|changeme|development|test|your[-_ ]?secret)\s*$/i.test(line))) findings.push(finding("LS004", entry.path === ".env" ? "critical" : "high", "JWT secret uses a known placeholder", `A JWT secret placeholder was detected in ${entry.path}; values are intentionally not displayed.`, true, entry.path));
  const tracked = gitTrackedFiles(root).filter((path) => SECRET_FILE_PATTERNS.some((pattern) => pattern.test(path)) && !/(^|\/)\.env\.example$/.test(path));
  if (tracked.length) findings.push(finding("LS005", "critical", "Potential secret material is tracked by Git", `Sensitive-looking tracked paths: ${tracked.join(", ")}. Secret contents were not inspected or printed.`, true));
  const dockerfile = readIfPresent(root, "Dockerfile");
  if (dockerfile && !/^USER\s+[^\s]+/m.test(dockerfile)) findings.push(finding("LS006", "high", "Container may run as root", "Dockerfile does not declare a non-root USER in the runtime image.", true, "Dockerfile"));
  if (pkg) {
    const scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
    if (!scripts["prisma:deploy"]) findings.push(finding("LS007", "high", "Production migration command is missing", "package.json does not expose prisma:deploy.", true, "package.json"));
  }
  if (!existsSync8(join4(root, "src/routes/health.ts")) || !existsSync8(join4(root, "src/routes/readiness.ts"))) findings.push(finding("LS008", "medium", "Health/readiness coverage is incomplete", "Production services should expose both liveness and readiness endpoints.", true));
  const swagger = readIfPresent(root, "src/plugins/swagger.ts") ?? "";
  if (swagger && !/NODE_ENV|SWAGGER|DOCS|enabled/i.test(swagger)) findings.push(finding("LS009", "medium", "Swagger exposure has no visible production policy", "Gate public production API documentation explicitly or document the choice.", false, "src/plugins/swagger.ts"));
  const tsconfig = readIfPresent(root, "tsconfig.json") ?? "";
  if (/"sourceMap"\s*:\s*true|"inlineSourceMap"\s*:\s*true/.test(tsconfig)) findings.push(finding("LS011", "low", "Source maps are enabled", "Ensure production source maps are private.", true, "tsconfig.json"));
  if (envExample && /NODE_ENV=development|LOG_LEVEL=debug/.test(envExample)) findings.push(finding("LS012", "low", "Development defaults are documented", "Deployment configuration should override development defaults.", true, ".env.example"));
  if (existsSync8(join4(root, "launchstack.json"))) try {
    const manifest = loadProjectManifest(root);
    const state = loadProjectState(root, { templateVersion: manifest.project.templateVersion, cliVersion: "unknown" });
    const drift = detectManagedDrift(root, state).filter((item) => item.kind !== "clean");
    if (drift.length) findings.push(finding("LS013", "high", "LaunchStack-managed files have drift", `${drift.length} managed file(s) are missing or locally modified.`, true));
    const suppressions = new Map((manifest.audit?.suppressions ?? []).map((item) => [item.ruleId, item.reason]));
    for (const item of findings) {
      const reason = suppressions.get(item.ruleId);
      if (reason) {
        item.suppressed = true;
        item.suppressionReason = reason;
      }
    }
  } catch (error) {
    findings.push(finding("LS015", "high", "LaunchStack project metadata is invalid", error instanceof Error ? error.message : "Unable to validate metadata.", true, "launchstack.json"));
  }
  findings.sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  const summary = { info: 0, low: 0, medium: 0, high: 0, critical: 0, suppressed: 0 };
  for (const item of findings) item.suppressed ? summary.suppressed += 1 : summary[item.severity] += 1;
  return { projectDirectory: root, findings, summary };
}

// src/audit/types.ts
var AUDIT_SEVERITIES = ["info", "low", "medium", "high", "critical"];
function severityRank(severity) {
  return AUDIT_SEVERITIES.indexOf(severity);
}

// src/client/openapi.ts
import { createHash as createHash2 } from "crypto";
var METHODS = /* @__PURE__ */ new Set(["get", "post", "put", "patch", "delete", "head", "options"]);
var object = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function parseOpenApiDocument(value) {
  if (!object(value) || typeof value.openapi !== "string" || !object(value.paths)) throw new Error("OpenAPI document must contain an openapi version and paths object.");
  return value;
}
function sanitize(input) {
  const words = input.replace(/[^A-Za-z0-9_$]+/g, " ").trim().split(/\s+/).filter(Boolean);
  let result = words.map((word, index) => index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)).join("");
  if (!result) result = "operation";
  if (/^[0-9]/.test(result)) result = `op${result}`;
  return result.replace(/[^A-Za-z0-9_$]/g, "");
}
function collectOperations(document) {
  const raw = [];
  for (const path of Object.keys(document.paths).sort()) {
    const item = document.paths[path] ?? {};
    for (const method of Object.keys(item).sort()) {
      if (!METHODS.has(method.toLowerCase())) continue;
      const operation = item[method];
      if (!object(operation)) continue;
      const typed = operation;
      raw.push({ method: method.toUpperCase(), path, operation: typed, preferredName: sanitize(typed.operationId ?? `${method}-${path.replace(/[{}]/g, "")}`) });
    }
  }
  const counts = /* @__PURE__ */ new Map();
  for (const item of raw) counts.set(item.preferredName, (counts.get(item.preferredName) ?? 0) + 1);
  return raw.map(({ preferredName, ...item }) => ({ ...item, name: (counts.get(preferredName) ?? 0) > 1 ? `${preferredName}_${createHash2("sha256").update(`${item.method} ${item.path}`).digest("hex").slice(0, 8)}` : preferredName }));
}
var refName = (ref) => (ref.split("/").pop() ?? "Unknown").replace(/[^A-Za-z0-9_$]/g, "_");
function schemaToType(schema) {
  if (!schema) return "unknown";
  if (schema.$ref) return refName(schema.$ref);
  if (schema.enum?.length) return schema.enum.map((value) => value === null ? "null" : JSON.stringify(value)).join(" | ");
  if (schema.oneOf?.length) return schema.oneOf.map(schemaToType).join(" | ");
  if (schema.anyOf?.length) return schema.anyOf.map(schemaToType).join(" | ");
  if (schema.allOf?.length) return schema.allOf.map(schemaToType).join(" & ");
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  const nullable = schema.nullable === true || types.includes("null");
  const type = types.find((entry) => entry !== "null");
  let rendered = "unknown";
  if (type === "string") rendered = "string";
  else if (type === "integer" || type === "number") rendered = "number";
  else if (type === "boolean") rendered = "boolean";
  else if (type === "array") rendered = `Array<${schemaToType(schema.items)}>`;
  else if (schema.properties) {
    const required = new Set(schema.required ?? []);
    rendered = `{ ${Object.keys(schema.properties).sort().map((key) => `${JSON.stringify(key)}${required.has(key) ? "" : "?"}: ${schemaToType(schema.properties?.[key])};`).join(" ")} }`;
  } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") rendered = `Record<string, ${schemaToType(schema.additionalProperties)}>`;
  else rendered = "Record<string, unknown>";
  return nullable ? `${rendered} | null` : rendered;
}
function responseSchema(operation) {
  const responses = operation.responses ?? {};
  const code = Object.keys(responses).filter((value) => /^2\d\d$/.test(value)).sort()[0];
  const content = (code ? responses[code] : responses.default)?.content ?? {};
  return content["application/json"]?.schema ?? Object.values(content)[0]?.schema;
}
function requestBodySchema(operation) {
  const content = operation.requestBody?.content ?? {};
  return content["application/json"]?.schema ?? Object.values(content)[0]?.schema;
}

// src/client/generate.ts
import { readFileSync as readFileSync7 } from "fs";
async function loadOpenApiSource(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(1e4) });
    if (!response.ok) throw new Error(`OpenAPI request failed with ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) throw new Error(`OpenAPI endpoint returned unsupported content type: ${contentType || "unknown"}`);
    return parseOpenApiDocument(await response.json());
  }
  return parseOpenApiDocument(JSON.parse(readFileSync7(source, "utf8")));
}
function renderSchemas(document) {
  return Object.keys(document.components?.schemas ?? {}).sort().map((name) => `export type ${name.replace(/[^A-Za-z0-9_$]/g, "_")} = ${schemaToType(document.components?.schemas?.[name])};`).join("\n");
}
function property(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}
function renderInputs(document) {
  return collectOperations(document).map((item) => {
    const parameters = item.operation.parameters ?? [];
    const body = requestBodySchema(item.operation);
    if (!parameters.length && !body) return "";
    const name = `${item.name.charAt(0).toUpperCase()}${item.name.slice(1)}Input`;
    const path = parameters.filter((p) => p.in === "path");
    const query = parameters.filter((p) => p.in === "query");
    const headers = parameters.filter((p) => p.in === "header");
    const groups = [];
    if (path.length) groups.push(`path: { ${path.map((p) => `${property(p.name)}: ${schemaToType(p.schema)};`).join(" ")} };`);
    if (query.length) groups.push(`query${query.every((p) => !p.required) ? "?" : ""}: { ${query.map((p) => `${property(p.name)}${p.required ? "" : "?"}: ${schemaToType(p.schema)};`).join(" ")} };`);
    if (headers.length) groups.push(`headers${headers.every((p) => !p.required) ? "?" : ""}: { ${headers.map((p) => `${property(p.name)}${p.required ? "" : "?"}: ${schemaToType(p.schema)};`).join(" ")} };`);
    if (body) groups.push(`body${item.operation.requestBody?.required ? "" : "?"}: ${schemaToType(body)};`);
    return `export type ${name} = { ${groups.join(" ")} };`;
  }).filter(Boolean).join("\n");
}
function renderMethod(item) {
  const parameters = item.operation.parameters ?? [];
  const body = requestBodySchema(item.operation);
  const hasInput = parameters.length > 0 || Boolean(body);
  const inputName = `${item.name.charAt(0).toUpperCase()}${item.name.slice(1)}Input`;
  const output = schemaToType(responseSchema(item.operation));
  const paths = parameters.filter((p) => p.in === "path").map((p) => `path = path.replace(${JSON.stringify(`{${p.name}}`)}, encodeURIComponent(String(input.path.${property(p.name)})));`).join("\n    ");
  const query = parameters.filter((p) => p.in === "query").map((p) => `if (input.query?.${property(p.name)} !== undefined) query.set(${JSON.stringify(p.name)}, String(input.query.${property(p.name)}));`).join("\n    ");
  const headers = parameters.filter((p) => p.in === "header").map((p) => `if (input.headers?.${property(p.name)} !== undefined) headers.set(${JSON.stringify(p.name)}, String(input.headers.${property(p.name)}));`).join("\n    ");
  return `  async ${item.name}(${hasInput ? `input: ${inputName}` : "input: Record<string, never> = {}"}): Promise<${output}> {
    let path = ${JSON.stringify(item.path)};
    ${paths}
    const query = new URLSearchParams();
    ${query}
    const headers = new Headers({ accept: "application/json" });
    ${headers}
    const token = await this.tokenProvider?.();
    if (token) headers.set("authorization", \`Bearer \${token}\`);
    ${body ? `headers.set("content-type", "application/json");` : ""}
    const url = new URL(path, this.baseUrl);
    if ([...query].length > 0) url.search = query.toString();
    const response = await this.fetchImpl(url, { method: ${JSON.stringify(item.method)}, headers, ${body ? "body: input.body === undefined ? undefined : JSON.stringify(input.body)," : ""} signal: AbortSignal.timeout(this.timeoutMs) });
    const contentType = response.headers.get("content-type") ?? "";
    const payload: unknown = response.status === 204 ? undefined : contentType.includes("json") ? await response.json() : await response.text();
    if (!response.ok) throw new ApiError(response.status, response.statusText, payload);
    return payload as ${output};
  }`;
}
function generateTypeScriptClient(document, target = "typescript") {
  const operations = collectOperations(document);
  const react = target === "react" ? `
${operations.map((item) => `export const ${item.name}QueryKey = (input: unknown) => [${JSON.stringify(item.name)}, input] as const;`).join("\n")}
` : target === "react-native" ? '\nexport const launchStackClientTarget = "react-native" as const;\n' : "";
  return `/* eslint-disable */
// Generated by LaunchStack CLI. Do not edit directly.
export type TokenProvider = () => string | undefined | null | Promise<string | undefined | null>;
export class ApiError extends Error { constructor(public readonly status: number, public readonly statusText: string, public readonly body: unknown) { super(\`API request failed: \${status} \${statusText}\`); this.name = "ApiError"; } }
${renderSchemas(document)}
${renderInputs(document)}
export class LaunchStackClient { private readonly baseUrl: URL; private readonly tokenProvider?: TokenProvider; private readonly fetchImpl: typeof fetch; private readonly timeoutMs: number; constructor(options: { baseUrl: string | URL; tokenProvider?: TokenProvider; fetch?: typeof fetch; timeoutMs?: number }) { this.baseUrl = new URL(options.baseUrl); this.tokenProvider = options.tokenProvider; this.fetchImpl = options.fetch ?? globalThis.fetch; this.timeoutMs = options.timeoutMs ?? 10000; if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new Error("timeoutMs must be positive"); }
${operations.map(renderMethod).join("\n\n")}
}
${react}`;
}

// src/generator/files.ts
import {
  cpSync,
  existsSync as existsSync9,
  mkdirSync as mkdirSync2,
  readdirSync,
  readFileSync as readFileSync8,
  renameSync as renameSync2,
  statSync,
  unlinkSync as unlinkSync2
} from "fs";
import { basename, dirname as dirname3, resolve as resolve10 } from "path";
var RENAMED_TEMPLATE_FILES = {
  "_gitignore": ".gitignore",
  "_dockerignore": ".dockerignore",
  "_npmrc": ".npmrc",
  "_env": ".env",
  "_env.example": ".env.example"
};
function ensureDestinationAvailable(destinationDirectory, overwrite = false) {
  if (!existsSync9(destinationDirectory)) {
    return;
  }
  const contents = readdirSync(destinationDirectory);
  if (contents.length > 0 && !overwrite) {
    throw new Error(
      `Destination is not empty: ${destinationDirectory}. Use --force to overwrite it.`
    );
  }
}
function copyDirectory(sourceDirectory, destinationDirectory, overwriteRenamedFiles = false) {
  if (!existsSync9(sourceDirectory)) {
    throw new Error(`Template directory not found: ${sourceDirectory}`);
  }
  mkdirSync2(destinationDirectory, { recursive: true });
  cpSync(sourceDirectory, destinationDirectory, {
    recursive: true,
    force: true
  });
  renameTemplateFiles(destinationDirectory, overwriteRenamedFiles);
}
function renameTemplateFiles(directory, overwriteRenamedFiles) {
  for (const entry of readdirSync(directory)) {
    const currentPath = resolve10(directory, entry);
    const stats = statSync(currentPath);
    if (stats.isDirectory()) {
      renameTemplateFiles(currentPath, overwriteRenamedFiles);
      continue;
    }
    const replacementName = RENAMED_TEMPLATE_FILES[basename(currentPath)];
    if (!replacementName) {
      continue;
    }
    const replacementPath = resolve10(dirname3(currentPath), replacementName);
    if (existsSync9(replacementPath)) {
      if (overwriteRenamedFiles) {
        unlinkSync2(replacementPath);
        renameSync2(currentPath, replacementPath);
        continue;
      }
      const existingContent = readFileSync8(replacementPath);
      const sourceContent = readFileSync8(currentPath);
      if (!existingContent.equals(sourceContent)) {
        throw new Error(
          `Cannot rename template file because the destination exists: ${replacementPath}`
        );
      }
      unlinkSync2(currentPath);
      continue;
    }
    renameSync2(currentPath, replacementPath);
  }
}

// src/generator/names.ts
var PROJECT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function validateProjectName(projectName) {
  if (!projectName.trim()) {
    throw new Error("Project name is required.");
  }
  if (!PROJECT_NAME_PATTERN.test(projectName)) {
    throw new Error(
      "Project name must use lowercase letters, numbers, and hyphens only."
    );
  }
}
function toDisplayName(projectName) {
  return projectName.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

// src/generator/paths.ts
import { existsSync as existsSync10 } from "fs";
import { resolve as resolve11 } from "path";
function getRuntimeDirectory() {
  if (typeof __dirname === "string") {
    return __dirname;
  }
  return process.cwd();
}
function getPackageRoot() {
  const runtimeDirectory = getRuntimeDirectory();
  const candidates = [
    process.cwd(),
    runtimeDirectory,
    resolve11(runtimeDirectory, ".."),
    resolve11(runtimeDirectory, "../.."),
    resolve11(process.cwd(), ".."),
    resolve11(process.cwd(), "../..")
  ];
  for (const candidate of candidates) {
    if (existsSync10(resolve11(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error("Could not locate the LaunchStack package root.");
}
function getTemplateDirectory(templateName) {
  const runtimeDirectory = getRuntimeDirectory();
  const packageRoot = getPackageRoot();
  const candidates = [
    resolve11(runtimeDirectory, "templates", templateName),
    resolve11(packageRoot, "dist", "templates", templateName),
    resolve11(packageRoot, "src", "templates", templateName),
    resolve11(packageRoot, "templates", templateName)
  ];
  const templateDirectory = candidates.find(
    (candidate) => existsSync10(candidate)
  );
  if (!templateDirectory) {
    throw new Error(
      `Template "${templateName}" could not be found in the LaunchStack installation.`
    );
  }
  return templateDirectory;
}

// src/generator/template.ts
import {
  existsSync as existsSync11,
  readFileSync as readFileSync9,
  readdirSync as readdirSync2,
  statSync as statSync2,
  writeFileSync as writeFileSync2
} from "fs";
import { basename as basename2, extname, join as join5 } from "path";
var TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
  ".cjs",
  ".css",
  ".example",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);
var TEXT_FILENAMES = /* @__PURE__ */ new Set([
  ".dockerignore",
  ".env",
  ".env.example",
  ".gitignore",
  ".npmrc",
  "Dockerfile",
  "LICENSE"
]);
function renderTemplate(content, variables) {
  return content.replace(
    /{{([A-Z0-9_]+)}}/g,
    (token, key) => Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] ?? token : token
  );
}
function isTextTemplateFile(path) {
  const name = basename2(path);
  return TEXT_FILENAMES.has(name) || TEXT_EXTENSIONS.has(extname(name).toLowerCase());
}
function renderDirectory(directory, variables) {
  if (!existsSync11(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }
  for (const entry of readdirSync2(directory)) {
    const path = join5(directory, entry);
    const stats = statSync2(path);
    if (stats.isDirectory()) {
      renderDirectory(path, variables);
      continue;
    }
    if (!isTextTemplateFile(path)) {
      continue;
    }
    const content = readFileSync9(path, "utf8");
    const rendered = renderTemplate(content, variables);
    if (rendered !== content) {
      writeFileSync2(path, rendered);
    }
  }
}

// src/generator/generate.ts
import {
  cpSync as cpSync2,
  existsSync as existsSync13,
  mkdirSync as mkdirSync3,
  mkdtempSync,
  readdirSync as readdirSync3,
  renameSync as renameSync3,
  rmSync as rmSync2
} from "fs";
import {
  basename as basename3,
  dirname as dirname4,
  join as join7,
  resolve as resolve12
} from "path";
import { randomUUID as randomUUID2 } from "crypto";

// src/docker-assets.ts
import { existsSync as existsSync12, writeFileSync as writeFileSync3 } from "fs";
import { join as join6 } from "path";
function packageInstallCommand(hasLockfile, productionOnly = false) {
  if (hasLockfile) {
    return productionOnly ? "npm ci --omit=dev" : "npm ci";
  }
  return productionOnly ? "npm install --omit=dev" : "npm install";
}
function dockerJsonCommand(command) {
  return JSON.stringify(command);
}
function renderDockerfile(options) {
  const install = packageInstallCommand(options.hasLockfile);
  const productionInstall = packageInstallCommand(options.hasLockfile, true);
  const startCommand = options.startCommand ?? ["npm", "start"];
  const port = options.port ?? 3e3;
  const packageFiles = options.hasLockfile ? "COPY package.json package-lock.json ./" : "COPY package.json ./";
  const prismaCopy = options.prisma ? "COPY prisma ./prisma\n" : "";
  const prismaRuntimeCopy = options.prisma ? "COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma\nCOPY --from=build /app/node_modules/@prisma ./node_modules/@prisma\n" : "";
  return `FROM node:20-alpine AS dependencies

WORKDIR /app

${packageFiles}
${prismaCopy}
RUN ${install}

FROM node:20-alpine AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN ${options.buildCommand}

FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

${packageFiles}
${prismaCopy}
RUN ${productionInstall} && npm cache clean --force

COPY --from=build /app/${options.outputDirectory} ./${options.outputDirectory}
${prismaRuntimeCopy}
USER node

EXPOSE ${port}

CMD ${dockerJsonCommand(startCommand)}
`;
}
function renderDockerIgnore() {
  return `node_modules
dist
coverage
.git
.github
.env
.env.*
!.env.example
.launchstack
*.log
npm-debug.log*
docker-compose*.yml
`;
}
function writeCanonicalDockerAssets(projectDirectory, options) {
  const hasLockfile = options.hasLockfile ?? existsSync12(join6(projectDirectory, "package-lock.json"));
  const prisma = options.prisma ?? existsSync12(join6(projectDirectory, "prisma", "schema.prisma"));
  writeFileSync3(
    join6(projectDirectory, "Dockerfile"),
    renderDockerfile({
      ...options,
      hasLockfile,
      prisma
    })
  );
  writeFileSync3(
    join6(projectDirectory, ".dockerignore"),
    renderDockerIgnore()
  );
}

// src/generator/generate.ts
function commitStagedProject(stagedDirectory, destinationDirectory, overwrite) {
  if (!existsSync13(destinationDirectory)) {
    renameSync3(stagedDirectory, destinationDirectory);
    return;
  }
  if (!overwrite) {
    if (readdirSync3(destinationDirectory).length === 0) {
      rmSync2(destinationDirectory, {
        recursive: true,
        force: true
      });
      renameSync3(stagedDirectory, destinationDirectory);
      return;
    }
    throw new Error(`Destination already exists: ${destinationDirectory}`);
  }
  if (resolve12(destinationDirectory) === resolve12(process.cwd())) {
    throw new Error(
      "Refusing to replace the current working directory with --force. Choose a parent directory instead."
    );
  }
  const backupDirectory = join7(
    dirname4(destinationDirectory),
    `.${basename3(destinationDirectory)}.launchstack-backup-${randomUUID2()}`
  );
  renameSync3(destinationDirectory, backupDirectory);
  try {
    renameSync3(stagedDirectory, destinationDirectory);
    rmSync2(backupDirectory, {
      recursive: true,
      force: true
    });
  } catch (error) {
    if (existsSync13(destinationDirectory)) {
      rmSync2(destinationDirectory, {
        recursive: true,
        force: true
      });
    }
    renameSync3(backupDirectory, destinationDirectory);
    throw error;
  }
}
function generateProject(options) {
  validateProjectName(options.projectName);
  const destinationDirectory = resolve12(options.destinationDirectory);
  const overwrite = options.overwrite ?? false;
  ensureDestinationAvailable(destinationDirectory, overwrite);
  const templateDirectory = getTemplateDirectory(options.template);
  const parentDirectory = dirname4(destinationDirectory);
  mkdirSync3(parentDirectory, { recursive: true });
  const stagedDirectory = mkdtempSync(
    join7(parentDirectory, `.${basename3(destinationDirectory)}.launchstack-stage-`)
  );
  try {
    if (overwrite && existsSync13(destinationDirectory)) {
      cpSync2(destinationDirectory, stagedDirectory, {
        recursive: true,
        force: true
      });
    }
    copyDirectory(
      templateDirectory,
      stagedDirectory,
      overwrite
    );
    renderDirectory(stagedDirectory, {
      PROJECT_NAME: options.projectName,
      PROJECT_DISPLAY_NAME: toDisplayName(options.projectName)
    });
    if (options.template === "api") {
      writeCanonicalDockerAssets(stagedDirectory, {
        buildCommand: "npm run build",
        outputDirectory: "dist",
        hasLockfile: true,
        prisma: true,
        startCommand: ["node", "dist/server.js"],
        port: 3e3
      });
    }
    commitStagedProject(
      stagedDirectory,
      destinationDirectory,
      overwrite
    );
  } catch (error) {
    if (existsSync13(stagedDirectory)) {
      rmSync2(stagedDirectory, {
        recursive: true,
        force: true
      });
    }
    throw error;
  }
  return destinationDirectory;
}

// src/generator/install.ts
import { execFileSync as execFileSync2 } from "child_process";
function installDependencies(projectDirectory) {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync2(npmExecutable, ["install"], {
    cwd: projectDirectory,
    stdio: "inherit"
  });
}

// src/stages/manager.ts
import { createHash as createHash3 } from "crypto";
import { existsSync as existsSync14 } from "fs";
import { resolve as resolve13 } from "path";

// src/git.ts
import { execFileSync as execFileSync3 } from "child_process";
function run(args, cwd) {
  return execFileSync3("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}
function getGitMetadata(cwd = process.cwd()) {
  try {
    const status = run(
      ["status", "--porcelain=v2", "--branch"],
      cwd
    );
    const lines = status.split("\n").filter(Boolean);
    const branch = lines.find((line) => line.startsWith("# branch.head "))?.slice("# branch.head ".length);
    const commitHash = lines.find((line) => line.startsWith("# branch.oid "))?.slice("# branch.oid ".length);
    if (!commitHash || commitHash === "(initial)") {
      return null;
    }
    const commitMessage = run(
      ["log", "-1", "--pretty=%B"],
      cwd
    );
    return {
      branch: !branch || branch === "(detached)" ? "HEAD" : branch,
      commitHash,
      commitMessage,
      dirty: lines.some((line) => !line.startsWith("# "))
    };
  } catch {
    return null;
  }
}

// src/stages/docker.ts
import { execFileSync as execFileSync4 } from "child_process";
function run2(projectDirectory, args, environment = {}) {
  return execFileSync4("docker", args, { cwd: projectDirectory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...environment } });
}
var dockerStageAdapter = { id: "docker", capabilities: { create: true, inspect: true, update: true, destroy: true }, create(input) {
  run2(input.projectDirectory, ["compose", "-p", input.resourceId, "up", "-d", "--build"], input.environment);
  return { resourceId: input.resourceId, url: process.env.LAUNCHSTACK_PREVIEW_URL };
}, inspect(input) {
  try {
    const output = run2(input.projectDirectory, ["compose", "-p", input.resourceId, "ps", "--format", "json"]).trim();
    if (!output) return { exists: false };
    const records = output.split(/\r?\n/).flatMap((line) => {
      try {
        const value = JSON.parse(line);
        return Array.isArray(value) ? value : [value];
      } catch {
        return [];
      }
    });
    if (!records.length) return { exists: false };
    const running = records.every((record) => record && typeof record === "object" && String(record.State).toLowerCase() === "running");
    return { exists: true, status: running ? "running" : "degraded" };
  } catch {
    return { exists: false };
  }
}, destroy(input) {
  run2(input.projectDirectory, ["compose", "-p", input.resourceId, "down", "--remove-orphans", "--volumes"], input.environment);
} };

// src/stages/manager.ts
var ADAPTERS = { docker: dockerStageAdapter };
function validateStageName(stage) {
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(stage)) throw new Error("Stage names must use lowercase letters, numbers, and hyphens and be at most 48 characters.");
  return stage;
}
function stageResourceId(projectDirectory, projectName, stage) {
  const suffix = createHash3("sha256").update(resolve13(projectDirectory)).digest("hex").slice(0, 8);
  return `launchstack-${projectName}-${stage}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 63);
}
var stageEnvironment = (stage, values) => ({ ...values ?? {}, LAUNCHSTACK_STAGE: stage });
function stateMutation(projectDirectory, state) {
  const path = ".launchstack/state.json";
  const absolute = resolveProjectPath(projectDirectory, path);
  return { type: "write", path, content: serializeProjectState(state), owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync14(absolute) ? hashFile(absolute) : null };
}
function persist(projectDirectory, previous, next) {
  return applyFileMutations({ projectDirectory, mutations: [stateMutation(projectDirectory, next)], state: previous, nextState: next });
}
function adapter(provider) {
  const value = ADAPTERS[provider];
  if (!value) throw new Error(`Provider ${provider} does not implement preview lifecycle operations. Supported: ${Object.keys(ADAPTERS).join(", ")}.`);
  return value;
}
function createOrUpdateStage(input) {
  const projectDirectory = resolve13(input.projectDirectory);
  const stage = validateStageName(input.stage);
  const manifest = loadProjectManifest(projectDirectory);
  const desired = manifest.stages[stage];
  const production = input.production === true;
  if (desired?.production === true && !production) throw new Error(`Stage ${stage} is declared production. Re-run with --production.`);
  if (production && desired?.production !== true) throw new Error(`Refusing to infer ${stage} as production. Declare it in launchstack.json first.`);
  const provider = desired?.provider ?? manifest.provider?.id ?? "docker";
  const providerAdapter = adapter(provider);
  const previous = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  const resourceId = stageResourceId(projectDirectory, manifest.project.name, stage);
  const existing = previous.stages[stage];
  if (existing && existing.resourceId !== resourceId) throw new Error(`Stored resource identity for ${stage} does not match this project.`);
  if (existing && existing.provider !== provider) throw new Error(`Stage ${stage} is already owned by ${existing.provider}.`);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const git = getGitMetadata(projectDirectory);
  const creating = { name: stage, provider, resourceId, status: "creating", sourceCommit: git?.commitHash, url: existing?.url, createdAt: existing?.createdAt ?? now, updatedAt: now, production };
  const creatingState = structuredClone(previous);
  creatingState.stages[stage] = creating;
  persist(projectDirectory, previous, creatingState);
  try {
    const result = providerAdapter.create({ projectDirectory, stage, resourceId, environment: stageEnvironment(stage, desired?.env), sourceCommit: git?.commitHash, production });
    if (result.resourceId !== resourceId) throw new Error(`Provider returned unexpected resource identity for stage ${stage}.`);
    const beforeReady = loadProjectState(projectDirectory);
    const ready = { ...creating, status: "ready", url: result.url, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    const next = structuredClone(beforeReady);
    next.stages[stage] = ready;
    next.updatedAt = ready.updatedAt;
    persist(projectDirectory, beforeReady, next);
    return ready;
  } catch (error) {
    const beforeFailed = loadProjectState(projectDirectory);
    const failed = { ...creating, status: "failed", updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    const next = structuredClone(beforeFailed);
    next.stages[stage] = failed;
    next.updatedAt = failed.updatedAt;
    try {
      persist(projectDirectory, beforeFailed, next);
    } catch {
    }
    throw error;
  }
}
function inspectStage(projectDirectoryInput, stageInput) {
  const projectDirectory = resolve13(projectDirectoryInput);
  const stage = validateStageName(stageInput);
  const manifest = loadProjectManifest(projectDirectory);
  const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  const stored = state.stages[stage] ?? null;
  if (!stored) return { stage, state: null };
  const check = adapter(stored.provider).inspect({ projectDirectory, resourceId: stored.resourceId });
  return { stage, state: stored, providerExists: check.exists, providerStatus: check.status };
}
function destroyStage(input) {
  const projectDirectory = resolve13(input.projectDirectory);
  const stage = validateStageName(input.stage);
  const manifest = loadProjectManifest(projectDirectory);
  const previous = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  const stored = previous.stages[stage];
  if (!stored) throw new Error(`Stage ${stage} is not recorded.`);
  if (stored.production !== Boolean(input.production)) throw new Error(`Production acknowledgement does not match stored stage ${stage}.`);
  const expected = stageResourceId(projectDirectory, manifest.project.name, stage);
  if (stored.resourceId !== expected) throw new Error(`Stored resource identity for ${stage} failed verification; refusing destroy.`);
  adapter(stored.provider).destroy({ projectDirectory, resourceId: stored.resourceId, environment: stageEnvironment(stage, manifest.stages[stage]?.env) });
  const next = structuredClone(previous);
  delete next.stages[stage];
  next.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  persist(projectDirectory, previous, next);
}

// src/generator/module.ts
import { existsSync as existsSync15, readFileSync as readFileSync10 } from "fs";
import { resolve as resolve14 } from "path";
var RESERVED_FIELDS = /* @__PURE__ */ new Set(["id", "ownerId", "createdAt", "updatedAt"]);
var FIELD_TYPES = /* @__PURE__ */ new Set(["string", "number", "boolean", "date"]);
var validateName = (name) => {
  if (!/^[a-z][a-z0-9-]{0,48}$/.test(name)) throw new Error("Generated names must use lowercase letters, numbers, and hyphens.");
  return name;
};
function validateFields(fields) {
  const names = /* @__PURE__ */ new Set();
  for (const field of fields) {
    if (!/^[a-z][A-Za-z0-9_]{0,48}$/.test(field.name)) throw new Error(`Invalid field name: ${field.name}`);
    if (RESERVED_FIELDS.has(field.name)) throw new Error(`Field name is reserved: ${field.name}`);
    if (!FIELD_TYPES.has(field.type)) throw new Error(`Unsupported field type: ${String(field.type)}`);
    if (names.has(field.name)) throw new Error(`Duplicate field name: ${field.name}`);
    names.add(field.name);
  }
  return fields;
}
var camel = (name) => name.replace(/-([a-z0-9])/g, (_, value) => value.toUpperCase());
var pascal = (name) => {
  const value = camel(name);
  return value.charAt(0).toUpperCase() + value.slice(1);
};
var plural = (name) => name.endsWith("s") ? `${name}es` : name.endsWith("y") ? `${name.slice(0, -1)}ies` : `${name}s`;
function parseFieldSpec(spec) {
  const match = spec.match(/^([a-z][A-Za-z0-9_]{0,48}):(string|number|boolean|date)(\?)?$/);
  if (!match) throw new Error(`Invalid field specification: ${spec}`);
  const [, name, type, optional] = match;
  return validateFields([{ name: name ?? "field", type, optional: Boolean(optional) }])[0];
}
function zodType(field) {
  const base = field.type === "string" ? "z.string().trim().min(1).max(500)" : field.type === "number" ? "z.number().finite()" : field.type === "boolean" ? "z.boolean()" : "z.coerce.date()";
  return field.optional ? `${base}.optional()` : base;
}
function prismaType(field) {
  const base = field.type === "string" ? "String" : field.type === "number" ? "Float" : field.type === "boolean" ? "Boolean" : "DateTime";
  return `${base}${field.optional ? "?" : ""}`;
}
function moduleFiles(name) {
  const cls = pascal(name);
  return { [`src/modules/${name}/${name}.service.ts`]: `export class ${cls}Service { health(): { module: string; ready: true } { return { module: ${JSON.stringify(name)}, ready: true }; } }
`, [`src/modules/${name}/${name}.controller.ts`]: `import type { FastifyReply, FastifyRequest } from "fastify";
import { ${cls}Service } from "./${name}.service";
export class ${cls}Controller { constructor(private readonly service = new ${cls}Service()) {} health = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => { await reply.send(this.service.health()); }; }
`, [`src/modules/${name}/${name}.routes.ts`]: `import type { FastifyInstance } from "fastify";
import { ${cls}Controller } from "./${name}.controller";
export async function ${camel(name)}Routes(app: FastifyInstance): Promise<void> { const controller = new ${cls}Controller(); app.get("/health", { preHandler: [app.authenticate] }, controller.health); }
` };
}
function resourceFiles(name, fields) {
  const cls = pascal(name);
  const delegate = camel(name);
  const values = fields.length ? fields : [{ name: "title", type: "string" }];
  const schemaFields = values.map((field) => `  ${field.name}: ${zodType(field)}`).join(",\n");
  const updateFields = values.map((field) => `  ${field.name}: ${zodType({ ...field, optional: true })}`).join(",\n");
  const assignments = values.map((field) => `${field.name}: input.${field.name}`).join(", ");
  const modelFields = values.map((field) => `  ${field.name} ${prismaType(field)}`).join("\n");
  return { [`src/modules/${name}/${name}.schemas.ts`]: `import { z } from "zod";
export const create${cls}Schema = z.object({
${schemaFields}
}).strict();
export const update${cls}Schema = z.object({
${updateFields}
}).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required");
export const ${delegate}IdSchema = z.object({ id: z.string().min(1).max(128) }).strict();
export type Create${cls}Input = z.infer<typeof create${cls}Schema>;
export type Update${cls}Input = z.infer<typeof update${cls}Schema>;
`, [`src/modules/${name}/${name}.repository.ts`]: `import { PrismaClient } from "@prisma/client";
import type { Create${cls}Input, Update${cls}Input } from "./${name}.schemas";
export class ${cls}Repository { constructor(private readonly prisma: PrismaClient) {} create(ownerId: string, input: Create${cls}Input) { return this.prisma.${delegate}.create({ data: { ownerId, ${assignments} } }); } list(ownerId: string) { return this.prisma.${delegate}.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 100 }); } findOwned(id: string, ownerId: string) { return this.prisma.${delegate}.findFirst({ where: { id, ownerId } }); } updateOwned(id: string, ownerId: string, input: Update${cls}Input) { return this.prisma.$transaction(async (tx) => { const current = await tx.${delegate}.findFirst({ where: { id, ownerId }, select: { id: true } }); if (!current) return null; return tx.${delegate}.update({ where: { id: current.id }, data: input }); }); } deleteOwned(id: string, ownerId: string): Promise<boolean> { return this.prisma.${delegate}.deleteMany({ where: { id, ownerId } }).then((result) => result.count === 1); } }
`, [`src/modules/${name}/${name}.service.ts`]: `import { ApplicationError } from "../../core/errors/application-error";
import { prisma } from "../../lib/prisma";
import { ${cls}Repository } from "./${name}.repository";
import type { Create${cls}Input, Update${cls}Input } from "./${name}.schemas";
export class ${cls}Service { constructor(private readonly repository = new ${cls}Repository(prisma)) {} create(ownerId: string, input: Create${cls}Input) { return this.repository.create(ownerId, input); } list(ownerId: string) { return this.repository.list(ownerId); } async get(ownerId: string, id: string) { const value = await this.repository.findOwned(id, ownerId); if (!value) throw new ApplicationError({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: ${JSON.stringify(`${cls} not found.`)} }); return value; } async update(ownerId: string, id: string, input: Update${cls}Input) { const value = await this.repository.updateOwned(id, ownerId, input); if (!value) throw new ApplicationError({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: ${JSON.stringify(`${cls} not found.`)} }); return value; } async remove(ownerId: string, id: string): Promise<void> { if (!(await this.repository.deleteOwned(id, ownerId))) throw new ApplicationError({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: ${JSON.stringify(`${cls} not found.`)} }); } }
`, [`src/modules/${name}/${name}.controller.ts`]: `import type { FastifyReply, FastifyRequest } from "fastify";
import { create${cls}Schema, ${delegate}IdSchema, update${cls}Schema } from "./${name}.schemas";
import { ${cls}Service } from "./${name}.service";
export class ${cls}Controller { constructor(private readonly service = new ${cls}Service()) {} create = async (request: FastifyRequest, reply: FastifyReply) => reply.code(201).send(await this.service.create(request.user.sub, create${cls}Schema.parse(request.body))); list = async (request: FastifyRequest, reply: FastifyReply) => reply.send(await this.service.list(request.user.sub)); get = async (request: FastifyRequest, reply: FastifyReply) => { const { id } = ${delegate}IdSchema.parse(request.params); return reply.send(await this.service.get(request.user.sub, id)); }; update = async (request: FastifyRequest, reply: FastifyReply) => { const { id } = ${delegate}IdSchema.parse(request.params); return reply.send(await this.service.update(request.user.sub, id, update${cls}Schema.parse(request.body))); }; remove = async (request: FastifyRequest, reply: FastifyReply) => { const { id } = ${delegate}IdSchema.parse(request.params); await this.service.remove(request.user.sub, id); return reply.code(204).send(); }; }
`, [`src/modules/${name}/${name}.routes.ts`]: `import type { FastifyInstance } from "fastify";
import { ${cls}Controller } from "./${name}.controller";
export async function ${delegate}Routes(app: FastifyInstance): Promise<void> { const controller = new ${cls}Controller(); const auth = { preHandler: [app.authenticate] }; app.post("/", auth, controller.create); app.get("/", auth, controller.list); app.get("/:id", auth, controller.get); app.patch("/:id", auth, controller.update); app.delete("/:id", auth, controller.remove); }
`, [`docs/generated/${name}-prisma.md`]: `# ${cls} data model

Run \`npm run prisma:migrate -- --name add-${name}\` before shipping. Every generated lookup/update/delete is owner-scoped by \`ownerId\`; add domain RBAC and invariants in the service.
`, [`.__launchstack_model_${name}`]: `model ${cls} {
  id String @id @default(cuid())
  ownerId String
${modelFields}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId, createdAt])
}
` };
}
function parseRoutes(content) {
  const marker = content.match(/\/\* launchstack-routes: (\[[^\n]*\]) \*\//);
  if (!marker?.[1]) return [];
  const parsed = JSON.parse(marker[1]);
  return Array.isArray(parsed) && parsed.every((value) => typeof value === "string") ? parsed : [];
}
function renderRoutes(names) {
  const sorted = [...new Set(names)].sort();
  const imports = sorted.map((name) => `import { ${camel(name)}Routes } from "../modules/${name}/${name}.routes";`).join("\n");
  const registrations = sorted.map((name) => `  await app.register(${camel(name)}Routes, { prefix: ${JSON.stringify(`/api/${plural(name)}`)} });`).join("\n");
  return `import type { FastifyInstance } from "fastify";
${imports ? `${imports}
` : ""}
/* launchstack-routes: ${JSON.stringify(sorted)} */
export async function registerGeneratedRoutes(app: FastifyInstance): Promise<void> {
${registrations || "  void app;"}
}
`;
}
function planModuleGeneration(input) {
  const projectDirectory = resolve14(input.projectDirectory);
  const name = validateName(input.name);
  const fields = input.kind === "resource" ? validateFields(input.fields ?? []) : [];
  const manifest = loadProjectManifest(projectDirectory);
  const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  const files = input.kind === "resource" ? resourceFiles(name, fields) : moduleFiles(name);
  const mutations = [];
  const owner = `generator:${input.kind}:${name}`;
  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith(".__launchstack_model_")) continue;
    const absolute = resolveProjectPath(projectDirectory, path);
    if (existsSync15(absolute)) throw new Error(`Generation collision: ${path} already exists.`);
    mutations.push({ type: "write", path, content, owner, version: currentLaunchStackVersion(), expectedSha256: null });
  }
  const registryPath = "src/routes/launchstack.generated.ts";
  const registryAbsolute = resolveProjectPath(projectDirectory, registryPath);
  const registryCurrent = existsSync15(registryAbsolute) ? readFileSync10(registryAbsolute, "utf8") : `import type { FastifyInstance } from "fastify";

/* launchstack-routes: [] */
export async function registerGeneratedRoutes(app: FastifyInstance): Promise<void> { void app; }
`;
  const names = parseRoutes(registryCurrent);
  if (!names.includes(name)) names.push(name);
  const nextRegistry = renderRoutes(names);
  if (nextRegistry !== registryCurrent) mutations.push({ type: "write", path: registryPath, content: nextRegistry, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync15(registryAbsolute) ? hashFile(registryAbsolute) : null });
  let migrationCommand;
  if (input.kind === "resource") {
    const schemaPath = "prisma/schema.prisma";
    const schemaAbsolute = resolveProjectPath(projectDirectory, schemaPath);
    if (!existsSync15(schemaAbsolute)) throw new Error("Cannot generate a CRUD resource without prisma/schema.prisma.");
    const schema = readFileSync10(schemaAbsolute, "utf8");
    const model = files[`.__launchstack_model_${name}`] ?? "";
    if (new RegExp(`\\bmodel\\s+${pascal(name)}\\b`).test(schema)) throw new Error(`Prisma model ${pascal(name)} already exists.`);
    mutations.push({ type: "write", path: schemaPath, content: `${schema.trimEnd()}

${model}`, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: hashFile(schemaAbsolute) });
    migrationCommand = `npm run prisma:migrate -- --name add-${name}`;
  }
  const nextState = withTrackedMutations(state, mutations);
  nextState.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const statePath = ".launchstack/state.json";
  const stateAbsolute = resolveProjectPath(projectDirectory, statePath);
  mutations.push({ type: "write", path: statePath, content: serializeProjectState(nextState), owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync15(stateAbsolute) ? hashFile(stateAbsolute) : null });
  return { projectDirectory, kind: input.kind, name, files: mutations.map((mutation) => mutation.path).sort(), mutations, nextState, migrationCommand };
}
function applyModuleGeneration(plan) {
  return applyFileMutations({ projectDirectory: plan.projectDirectory, mutations: plan.mutations, state: loadProjectState(plan.projectDirectory), nextState: plan.nextState });
}

export {
  FIRST_PARTY_EXTENSIONS,
  listFirstPartyExtensions,
  MANIFEST_SCHEMA_URL,
  MANIFEST_SCHEMA_VERSION,
  STATE_SCHEMA_VERSION,
  emptyProjectState,
  projectManifestSchema,
  MANIFEST_FILENAME,
  parseProjectManifest,
  loadProjectManifest,
  serializeProjectManifest,
  createProjectManifest,
  projectStateSchema,
  STATE_DIRECTORY,
  STATE_FILENAME,
  sha256,
  hashFile,
  parseProjectState,
  loadProjectState,
  serializeProjectState,
  detectManagedDrift,
  currentLaunchStackVersion,
  resolveExtensionOrder,
  planExtensionInstall,
  applyExtensionInstall,
  planExtensionRemoval,
  applyExtensionRemoval,
  planReconciliation,
  applyReconciliation,
  projectHasManifest,
  V3_TEMPLATE_VERSION,
  planUpgrade,
  applyUpgrade,
  runProductionAudit,
  AUDIT_SEVERITIES,
  severityRank,
  parseOpenApiDocument,
  collectOperations,
  schemaToType,
  responseSchema,
  requestBodySchema,
  loadOpenApiSource,
  generateTypeScriptClient,
  renderDockerfile,
  renderDockerIgnore,
  ensureDestinationAvailable,
  copyDirectory,
  validateProjectName,
  toDisplayName,
  getPackageRoot,
  getTemplateDirectory,
  renderTemplate,
  renderDirectory,
  generateProject,
  installDependencies,
  getGitMetadata,
  validateStageName,
  stageResourceId,
  createOrUpdateStage,
  inspectStage,
  destroyStage,
  parseFieldSpec,
  planModuleGeneration,
  applyModuleGeneration
};
//# sourceMappingURL=chunk-CV34FFVK.mjs.map