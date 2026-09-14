#!/usr/bin/env node
"use strict";

// src/cli.ts
var import_commander22 = require("commander");

// src/commands/add.ts
var import_commander = require("commander");

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

// src/extensions/engine.ts
var import_node_fs5 = require("fs");
var import_node_path5 = require("path");

// src/project/manifest.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
var import_zod = require("zod");

// src/project/types.ts
var MANIFEST_SCHEMA_URL = "https://launchstack.dev/schemas/project-v1.json";
var MANIFEST_SCHEMA_VERSION = 1;
var STATE_SCHEMA_VERSION = 1;
function emptyProjectState(templateVersion, cliVersion, now = (/* @__PURE__ */ new Date()).toISOString()) {
  return { stateVersion: STATE_SCHEMA_VERSION, templateVersion, cliVersion, managedFiles: {}, extensions: {}, stages: {}, updatedAt: now };
}

// src/project/manifest.ts
var jsonValueSchema = import_zod.z.lazy(() => import_zod.z.union([import_zod.z.string(), import_zod.z.number(), import_zod.z.boolean(), import_zod.z.null(), import_zod.z.array(jsonValueSchema), import_zod.z.record(import_zod.z.string(), jsonValueSchema)]));
var capabilitySchema = import_zod.z.object({ version: import_zod.z.string().min(1).max(64), provider: import_zod.z.string().min(1).max(64).optional(), options: import_zod.z.record(import_zod.z.string(), jsonValueSchema).optional() }).strict();
var stageSchema = import_zod.z.object({ provider: import_zod.z.string().min(1).max(64).optional(), source: import_zod.z.string().min(1).max(256).optional(), production: import_zod.z.boolean().optional(), env: import_zod.z.record(import_zod.z.string(), import_zod.z.string()).optional() }).strict();
var suppressionSchema = import_zod.z.object({ ruleId: import_zod.z.string().regex(/^LS\d{3}$/), reason: import_zod.z.string().trim().min(8).max(300) }).strict();
var projectManifestSchema = import_zod.z.object({
  $schema: import_zod.z.literal(MANIFEST_SCHEMA_URL),
  schemaVersion: import_zod.z.literal(MANIFEST_SCHEMA_VERSION),
  project: import_zod.z.object({ name: import_zod.z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/), templateVersion: import_zod.z.string().min(1).max(64) }).strict(),
  capabilities: import_zod.z.record(import_zod.z.string(), capabilitySchema),
  provider: import_zod.z.object({ id: import_zod.z.string().min(1).max(64) }).strict().optional(),
  stages: import_zod.z.record(import_zod.z.string(), stageSchema),
  audit: import_zod.z.object({ suppressions: import_zod.z.array(suppressionSchema).max(100) }).strict().optional()
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
  const manifestPath = (0, import_node_path.join)((0, import_node_path.resolve)(projectDirectory), MANIFEST_FILENAME);
  try {
    return parseProjectManifest(JSON.parse((0, import_node_fs.readFileSync)(manifestPath, "utf8")));
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

// src/project/paths.ts
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");
function normalizeManagedPath(path) {
  if (!path || path.includes("\0") || (0, import_node_path2.isAbsolute)(path)) throw new Error(`Unsafe managed path: ${JSON.stringify(path)}`);
  const segments = path.split(/[\\/]+/).filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === ".." || segment === ".")) throw new Error(`Unsafe managed path: ${JSON.stringify(path)}`);
  return segments.join("/");
}
function resolveProjectPath(projectDirectory, path) {
  const root = (0, import_node_path2.resolve)(projectDirectory);
  const normalized = normalizeManagedPath(path);
  const target = (0, import_node_path2.resolve)(root, ...normalized.split("/"));
  const fromRoot = (0, import_node_path2.relative)(root, target);
  if (fromRoot === "" || fromRoot.startsWith(`..${import_node_path2.sep}`) || fromRoot === ".." || (0, import_node_path2.isAbsolute)(fromRoot)) throw new Error(`Managed path escapes project root: ${path}`);
  let cursor = root;
  for (const segment of normalized.split("/")) {
    cursor = (0, import_node_path2.resolve)(cursor, segment);
    if ((0, import_node_fs2.existsSync)(cursor) && (0, import_node_fs2.lstatSync)(cursor).isSymbolicLink()) throw new Error(`Refusing to mutate symbolic-link path: ${path}`);
  }
  if ((0, import_node_fs2.existsSync)(root)) {
    const realRoot = (0, import_node_fs2.realpathSync)(root);
    let current = (0, import_node_path2.dirname)(target);
    while (!(0, import_node_fs2.existsSync)(current) && current !== realRoot) current = (0, import_node_path2.dirname)(current);
    if ((0, import_node_fs2.existsSync)(current)) {
      const relativeParent = (0, import_node_path2.relative)(realRoot, (0, import_node_fs2.realpathSync)(current));
      if (relativeParent.startsWith(`..${import_node_path2.sep}`) || relativeParent === ".." || (0, import_node_path2.isAbsolute)(relativeParent)) throw new Error(`Managed path resolves outside project root: ${path}`);
    }
  }
  return target;
}

// src/project/state.ts
var import_node_crypto = require("crypto");
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");
var import_zod2 = require("zod");
var managedFileSchema = import_zod2.z.object({ owner: import_zod2.z.string().min(1), sha256: import_zod2.z.string().regex(/^[a-f0-9]{64}$/), version: import_zod2.z.string().min(1) }).strict();
var extensionSchema = import_zod2.z.object({ id: import_zod2.z.string().min(1), version: import_zod2.z.string().min(1), kind: import_zod2.z.enum(["capability", "plugin"]), source: import_zod2.z.string().optional(), installedAt: import_zod2.z.string().min(1) }).strict();
var stageSchema2 = import_zod2.z.object({ name: import_zod2.z.string().min(1), provider: import_zod2.z.string().min(1), resourceId: import_zod2.z.string().min(1), status: import_zod2.z.enum(["creating", "ready", "failed", "destroyed"]), sourceCommit: import_zod2.z.string().optional(), url: import_zod2.z.string().optional(), createdAt: import_zod2.z.string().min(1), updatedAt: import_zod2.z.string().min(1), production: import_zod2.z.boolean() }).strict();
var projectStateSchema = import_zod2.z.object({ stateVersion: import_zod2.z.literal(STATE_SCHEMA_VERSION), templateVersion: import_zod2.z.string().min(1), cliVersion: import_zod2.z.string().min(1), managedFiles: import_zod2.z.record(import_zod2.z.string(), managedFileSchema), extensions: import_zod2.z.record(import_zod2.z.string(), extensionSchema), stages: import_zod2.z.record(import_zod2.z.string(), stageSchema2), updatedAt: import_zod2.z.string().min(1) }).strict();
var STATE_DIRECTORY = ".launchstack";
var STATE_FILENAME = "state.json";
function sha256(content) {
  return (0, import_node_crypto.createHash)("sha256").update(content).digest("hex");
}
function hashFile(path) {
  return sha256((0, import_node_fs3.readFileSync)(path));
}
function parseProjectState(input) {
  const result = projectStateSchema.safeParse(input);
  if (!result.success) throw new Error(`Invalid LaunchStack state: ${result.error.issues.map((issue) => `${issue.path.join(".") || "state"}: ${issue.message}`).join("; ")}`);
  return result.data;
}
function loadProjectState(projectDirectory, defaults) {
  const statePath = (0, import_node_path3.join)((0, import_node_path3.resolve)(projectDirectory), STATE_DIRECTORY, STATE_FILENAME);
  if (!(0, import_node_fs3.existsSync)(statePath)) return emptyProjectState(defaults?.templateVersion ?? "unknown", defaults?.cliVersion ?? "unknown");
  try {
    return parseProjectState(JSON.parse((0, import_node_fs3.readFileSync)(statePath, "utf8")));
  } catch (error) {
    throw new Error(`Unable to read LaunchStack state: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function serializeProjectState(state) {
  return `${JSON.stringify(parseProjectState(state), null, 2)}
`;
}
function detectManagedDrift(projectDirectory, state) {
  const root = (0, import_node_path3.resolve)(projectDirectory);
  const entries = [];
  for (const [path, managed] of Object.entries(state.managedFiles)) {
    const absolute = (0, import_node_path3.join)(root, path);
    if (!(0, import_node_fs3.existsSync)(absolute)) {
      entries.push({ path, kind: "missing", owner: managed.owner, expectedSha256: managed.sha256 });
      continue;
    }
    const actualSha256 = hashFile(absolute);
    entries.push({ path, kind: actualSha256 === managed.sha256 ? "clean" : "modified", owner: managed.owner, expectedSha256: managed.sha256, actualSha256 });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

// src/project/transaction.ts
var import_node_fs4 = require("fs");
var import_node_crypto2 = require("crypto");
var import_node_path4 = require("path");
var metadataDirectory = (projectDirectory) => (0, import_node_path4.join)((0, import_node_path4.resolve)(projectDirectory), ".launchstack");
var journalPath = (projectDirectory) => (0, import_node_path4.join)(metadataDirectory(projectDirectory), "mutation-journal.json");
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
  const directory2 = metadataDirectory(projectDirectory);
  (0, import_node_fs4.mkdirSync)(directory2, { recursive: true });
  const lockPath = (0, import_node_path4.join)(directory2, "mutation.lock");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = (0, import_node_fs4.openSync)(lockPath, "wx", 384);
      (0, import_node_fs4.writeFileSync)(descriptor, JSON.stringify({ pid: process.pid, createdAt: Date.now() }));
      (0, import_node_fs4.closeSync)(descriptor);
      return () => {
        try {
          (0, import_node_fs4.unlinkSync)(lockPath);
        } catch {
        }
      };
    } catch (error) {
      if (!(0, import_node_fs4.existsSync)(lockPath)) throw error;
      let stale = false;
      try {
        const lock = JSON.parse((0, import_node_fs4.readFileSync)(lockPath, "utf8"));
        stale = !processIsAlive(lock.pid ?? -1);
      } catch {
        stale = true;
      }
      if (!stale || attempt > 0) {
        throw new Error("Another LaunchStack mutation is already running for this project.");
      }
      (0, import_node_fs4.unlinkSync)(lockPath);
    }
  }
  throw new Error("Unable to acquire LaunchStack project mutation lock.");
}
function restoreJournal(projectDirectory, journal) {
  for (const mutation of [...journal.mutations].reverse()) {
    const target = resolveProjectPath(projectDirectory, mutation.path);
    const backup = (0, import_node_path4.join)(journal.backupDirectory, mutation.path);
    if ((0, import_node_fs4.existsSync)(target)) (0, import_node_fs4.rmSync)(target, { recursive: true, force: true });
    if (mutation.hadOriginal && (0, import_node_fs4.existsSync)(backup)) {
      (0, import_node_fs4.mkdirSync)((0, import_node_path4.dirname)(target), { recursive: true });
      (0, import_node_fs4.renameSync)(backup, target);
    }
  }
  (0, import_node_fs4.rmSync)(journal.stageDirectory, { recursive: true, force: true });
  (0, import_node_fs4.rmSync)(journal.backupDirectory, { recursive: true, force: true });
  (0, import_node_fs4.rmSync)(journalPath(projectDirectory), { force: true });
}
function recoverInterruptedMutation(projectDirectory) {
  const path = journalPath(projectDirectory);
  if (!(0, import_node_fs4.existsSync)(path)) return false;
  restoreJournal(projectDirectory, JSON.parse((0, import_node_fs4.readFileSync)(path, "utf8")));
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
  const projectDirectory = (0, import_node_path4.resolve)(input.projectDirectory);
  const releaseLock = acquireLock(projectDirectory);
  try {
    recoverInterruptedMutation(projectDirectory);
    const id = (0, import_node_crypto2.randomUUID)();
    const metadata = metadataDirectory(projectDirectory);
    const stageDirectory = (0, import_node_path4.join)(metadata, `.stage-${id}`);
    const backupDirectory = (0, import_node_path4.join)(metadata, `.backup-${id}`);
    (0, import_node_fs4.mkdirSync)(stageDirectory, { recursive: true, mode: 448 });
    (0, import_node_fs4.mkdirSync)(backupDirectory, { recursive: true, mode: 448 });
    try {
      const uniquePaths = /* @__PURE__ */ new Set();
      for (const mutation of input.mutations) {
        if (uniquePaths.has(mutation.path)) {
          throw new Error(`Mutation plan contains duplicate target: ${mutation.path}`);
        }
        uniquePaths.add(mutation.path);
        const target = resolveProjectPath(projectDirectory, mutation.path);
        const exists = (0, import_node_fs4.existsSync)(target);
        if (mutation.type === "write") {
          if (mutation.expectedSha256 === null && exists) {
            throw new Error(`Refusing to overwrite unmanaged file: ${mutation.path}`);
          }
          if (typeof mutation.expectedSha256 === "string" && (!exists || hashFile(target) !== mutation.expectedSha256)) {
            throw new Error(`File changed since planning: ${mutation.path}`);
          }
          const staged = (0, import_node_path4.join)(stageDirectory, mutation.path);
          (0, import_node_fs4.mkdirSync)((0, import_node_path4.dirname)(staged), { recursive: true });
          (0, import_node_fs4.writeFileSync)(staged, mutation.content, "utf8");
          (0, import_node_fs4.chmodSync)(staged, mutation.executable ? 493 : 420);
        } else if (!exists || hashFile(target) !== mutation.expectedSha256) {
          throw new Error(`Managed file changed before delete: ${mutation.path}`);
        }
      }
    } catch (error) {
      (0, import_node_fs4.rmSync)(stageDirectory, { recursive: true, force: true });
      (0, import_node_fs4.rmSync)(backupDirectory, { recursive: true, force: true });
      throw error;
    }
    const journal = {
      id,
      backupDirectory,
      stageDirectory,
      mutations: input.mutations.map((mutation) => ({
        type: mutation.type,
        path: mutation.path,
        hadOriginal: (0, import_node_fs4.existsSync)(resolveProjectPath(projectDirectory, mutation.path))
      }))
    };
    (0, import_node_fs4.writeFileSync)(journalPath(projectDirectory), JSON.stringify(journal, null, 2), { mode: 384 });
    try {
      for (const mutation of input.mutations) {
        const target = resolveProjectPath(projectDirectory, mutation.path);
        const backup = (0, import_node_path4.join)(backupDirectory, mutation.path);
        if ((0, import_node_fs4.existsSync)(target)) {
          (0, import_node_fs4.mkdirSync)((0, import_node_path4.dirname)(backup), { recursive: true });
          (0, import_node_fs4.renameSync)(target, backup);
        }
        if (mutation.type === "write") {
          const staged = (0, import_node_path4.join)(stageDirectory, mutation.path);
          (0, import_node_fs4.mkdirSync)((0, import_node_path4.dirname)(target), { recursive: true });
          (0, import_node_fs4.renameSync)(staged, target);
        }
      }
      const nextState = input.nextState ?? withTrackedMutations(input.state, input.mutations);
      (0, import_node_fs4.rmSync)(stageDirectory, { recursive: true, force: true });
      (0, import_node_fs4.rmSync)(backupDirectory, { recursive: true, force: true });
      (0, import_node_fs4.rmSync)(journalPath(projectDirectory), { force: true });
      return nextState;
    } catch (error) {
      restoreJournal(projectDirectory, journal);
      throw error;
    }
  } finally {
    releaseLock();
  }
}

// src/version.ts
function currentLaunchStackVersion() {
  if (process.env.LAUNCHSTACK_VERSION_OVERRIDE) return process.env.LAUNCHSTACK_VERSION_OVERRIDE;
  return true ? "3.0.0" : "0.0.0-dev";
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
  if (!(0, import_node_fs5.existsSync)(path)) throw new Error("Cannot install package-backed capability without package.json");
  const existingText = (0, import_node_fs5.readFileSync)(path, "utf8");
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
  const existing = (0, import_node_fs5.existsSync)(absolute) ? (0, import_node_fs5.readFileSync)(absolute, "utf8") : "";
  const known = new Set(existing.split(/\r?\n/).map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1]).filter((value) => Boolean(value)));
  const additions = vars.filter((item) => !known.has(item.name)).sort((a, b) => a.name.localeCompare(b.name)).map((item) => `${item.name}=${item.example ?? ""}`);
  if (!additions.length) return null;
  const prefix = existing && !existing.endsWith("\n") ? `${existing}
` : existing;
  return { type: "write", path, content: `${prefix}${additions.join("\n")}
`, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: (0, import_node_fs5.existsSync)(absolute) ? hashFile(absolute) : null };
}
function fileMutations(projectDirectory, state, extensions) {
  const output = [];
  for (const item of extensions) {
    for (const file of item.files ?? []) {
      const absolute = resolveProjectPath(projectDirectory, file.path);
      const tracked = state.managedFiles[file.path];
      if (tracked && tracked.owner !== item.id) throw new Error(`File ${file.path} is owned by ${tracked.owner}`);
      if ((0, import_node_fs5.existsSync)(absolute)) {
        const current = hashFile(absolute);
        if (!tracked) throw new Error(`Refusing to overwrite user-owned file: ${file.path}`);
        if (tracked.sha256 !== current) throw new Error(`Managed file has local modifications: ${file.path}`);
        if ((0, import_node_fs5.readFileSync)(absolute, "utf8") === file.content) continue;
        output.push({ type: "write", path: file.path, content: file.content, owner: item.id, version: item.version, expectedSha256: current, executable: file.executable });
      } else output.push({ type: "write", path: file.path, content: file.content, owner: item.id, version: item.version, expectedSha256: null, executable: file.executable });
    }
    if (item.composeServices && Object.keys(item.composeServices).length) {
      const path = `.launchstack/generated/compose/${item.id}.json`;
      const absolute = resolveProjectPath(projectDirectory, path);
      const tracked = state.managedFiles[path];
      if ((0, import_node_fs5.existsSync)(absolute) && (!tracked || tracked.owner !== item.id || tracked.sha256 !== hashFile(absolute))) throw new Error(`Compose fragment has local modifications: ${path}`);
      const content = `${JSON.stringify({ services: item.composeServices }, null, 2)}
`;
      if (!(0, import_node_fs5.existsSync)(absolute) || (0, import_node_fs5.readFileSync)(absolute, "utf8") !== content) output.push({ type: "write", path, content, owner: item.id, version: item.version, expectedSha256: (0, import_node_fs5.existsSync)(absolute) ? hashFile(absolute) : null });
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
    const existing = (0, import_node_fs5.existsSync)(absolute) ? (0, import_node_fs5.readFileSync)(absolute, "utf8") : null;
    if (existing === item.content) continue;
    output.push({
      type: "write",
      path: item.path,
      content: item.content,
      owner: "launchstack:metadata",
      version: currentLaunchStackVersion(),
      expectedSha256: (0, import_node_fs5.existsSync)(absolute) ? hashFile(absolute) : null
    });
  }
  return output;
}
function planExtensionInstall(input) {
  const projectDirectory = (0, import_node_path5.resolve)(input.projectDirectory);
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

// src/commands/add.ts
var addCommand = new import_commander.Command("add").description("Add a production capability to an existing LaunchStack project").argument("[capability]", "Capability ID").argument("[provider]", "Optional provider, for example google for oauth").option("--list").option("--dry-run").option("--json").option("-d, --directory <path>").action((capability, provider, options) => {
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
var import_commander2 = require("commander");

// src/project/reconcile.ts
var import_node_fs7 = require("fs");
var import_node_path7 = require("path");

// src/extensions/remove.ts
var import_node_fs6 = require("fs");
var import_node_path6 = require("path");
function metadataWrite(projectDirectory, path, content) {
  const absolute = resolveProjectPath(projectDirectory, path);
  return { type: "write", path, content, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: (0, import_node_fs6.existsSync)(absolute) ? hashFile(absolute) : null };
}
function planExtensionRemoval(input) {
  const projectDirectory = (0, import_node_path6.resolve)(input.projectDirectory);
  const manifest = loadProjectManifest(projectDirectory);
  const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  if (!state.extensions[input.extension.id]) throw new Error(`${input.extension.id} is not installed.`);
  const mutations = [];
  for (const [path, managed] of Object.entries(state.managedFiles)) {
    if (managed.owner !== input.extension.id) continue;
    const absolute = resolveProjectPath(projectDirectory, path);
    if (!(0, import_node_fs6.existsSync)(absolute)) throw new Error(`Managed plugin file is missing: ${path}`);
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
  const projectDirectory = (0, import_node_path7.resolve)(projectDirectoryInput);
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

// src/project/upgrade.ts
var import_node_fs8 = require("fs");
var import_node_path8 = require("path");
var V3_TEMPLATE_VERSION = "3.0.0";
function readText(projectDirectory, path) {
  const absolute = resolveProjectPath(projectDirectory, path);
  if (!(0, import_node_fs8.existsSync)(absolute)) throw new Error(`Expected project file is missing: ${path}`);
  return { content: (0, import_node_fs8.readFileSync)(absolute, "utf8"), hash: hashFile(absolute) };
}
function inferLegacyProject(projectDirectory) {
  const packagePath = resolveProjectPath(projectDirectory, "package.json");
  if (!(0, import_node_fs8.existsSync)(packagePath)) throw new Error("No launchstack.json or package.json was found; this does not look like a LaunchStack project.");
  const parsed = JSON.parse((0, import_node_fs8.readFileSync)(packagePath, "utf8"));
  if (typeof parsed.name !== "string" || typeof parsed.version !== "string") throw new Error("Legacy package.json does not contain a valid name/version.");
  if (!(0, import_node_fs8.existsSync)(resolveProjectPath(projectDirectory, "src/app.ts")) || !(0, import_node_fs8.existsSync)(resolveProjectPath(projectDirectory, "src/routes/index.ts"))) throw new Error("Legacy project is missing LaunchStack architecture files.");
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
  return { type: "write", path, content, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: (0, import_node_fs8.existsSync)(absolute) ? hashFile(absolute) : null };
}
function planUpgrade(projectDirectoryInput) {
  const projectDirectory = (0, import_node_path8.resolve)(projectDirectoryInput);
  const hasManifest = (0, import_node_fs8.existsSync)(resolveProjectPath(projectDirectory, "launchstack.json"));
  const legacy = hasManifest ? null : inferLegacyProject(projectDirectory);
  const manifest = hasManifest ? loadProjectManifest(projectDirectory) : createProjectManifest({ name: legacy?.name ?? "legacy-project", templateVersion: legacy?.version ?? "2.0.0" });
  const fromVersion = manifest.project.templateVersion;
  const state = hasManifest ? loadProjectState(projectDirectory, { templateVersion: fromVersion, cliVersion: currentLaunchStackVersion() }) : emptyProjectState(fromVersion, currentLaunchStackVersion());
  const actions = [];
  const conflicts = [];
  const mutations = [];
  if (!/^2\./.test(fromVersion) && fromVersion !== V3_TEMPLATE_VERSION) conflicts.push(`No ordered migration is registered from template ${fromVersion}.`);
  const generatedRoutesPath = "src/routes/launchstack.generated.ts";
  if (!(0, import_node_fs8.existsSync)(resolveProjectPath(projectDirectory, generatedRoutesPath))) {
    mutations.push({ type: "write", path: generatedRoutesPath, content: `import type { FastifyInstance } from "fastify";

/* launchstack-routes: [] */
export async function registerGeneratedRoutes(app: FastifyInstance): Promise<void> { void app; }
`, owner: "launchstack:core", version: V3_TEMPLATE_VERSION, expectedSha256: null });
    actions.push({ id: "v3:route-registry", kind: "write", target: generatedRoutesPath, detail: "create generated route ownership boundary" });
  }
  const capabilitiesPath = "src/launchstack/capabilities/index.ts";
  if (!(0, import_node_fs8.existsSync)(resolveProjectPath(projectDirectory, capabilitiesPath))) {
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
  return applyFileMutations({ projectDirectory: plan.projectDirectory, mutations: [...plan.mutations, metadataMutation(plan.projectDirectory, "launchstack.json", serializeProjectManifest(plan.nextManifest)), metadataMutation(plan.projectDirectory, ".launchstack/state.json", serializeProjectState(plan.nextState))], state: (0, import_node_fs8.existsSync)(resolveProjectPath(plan.projectDirectory, ".launchstack/state.json")) ? loadProjectState(plan.projectDirectory) : emptyProjectState(plan.fromVersion, currentLaunchStackVersion()), nextState: plan.nextState });
}

// src/commands/project.ts
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
var diffCommand = new import_commander2.Command("diff").description("Show drift in LaunchStack-managed project files").option("-d, --directory <path>").option("--json").action((options) => {
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
var planCommand = new import_commander2.Command("plan").description("Plan reconciliation from launchstack.json").option("-d, --directory <path>").option("--json").action((options) => {
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
var applyCommand = new import_commander2.Command("apply").description("Apply declared LaunchStack state").option("-d, --directory <path>").option("--allow-remove").option("--json").action(applyAction);
var reconcileCommand = new import_commander2.Command("reconcile").description("Reconcile project state with launchstack.json").option("-d, --directory <path>").option("--allow-remove").option("--json").action(applyAction);
var upgradeCommand = new import_commander2.Command("upgrade").description("Safely adopt or upgrade a LaunchStack project").option("-d, --directory <path>").option("--plan").option("--json").action((options) => {
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
var import_commander3 = require("commander");

// src/audit/run.ts
var import_node_fs9 = require("fs");
var import_node_child_process = require("child_process");
var import_node_path9 = require("path");
var readIfPresent = (root, path) => {
  const absolute = (0, import_node_path9.join)(root, path);
  return (0, import_node_fs9.existsSync)(absolute) ? (0, import_node_fs9.readFileSync)(absolute, "utf8") : void 0;
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
    return (0, import_node_child_process.execFileSync)("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\0").filter(Boolean);
  } catch {
    return [];
  }
}
var finding = (ruleId, severity, title, detail, verified, path) => ({ ruleId, severity, title, detail, verified, path });
var SECRET_FILE_PATTERNS = [/^\.env(?:\..+)?$/, /(^|\/)\.env(?:\..+)?$/, /(^|\/)secrets?\.json$/i, /(^|\/).*\.pem$/i, /(^|\/).*\.p12$/i, /(^|\/)id_rsa$/i];
function runProductionAudit(projectDirectoryInput) {
  const root = (0, import_node_path9.resolve)(projectDirectoryInput);
  const findings = [];
  const pkg = packageJson(root);
  if (!(0, import_node_fs9.existsSync)((0, import_node_path9.join)(root, "package-lock.json"))) findings.push(finding("LS001", "high", "Dependency graph is not locked", "package-lock.json is missing; production installs are not reproducible.", true, "package-lock.json"));
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
  if (!(0, import_node_fs9.existsSync)((0, import_node_path9.join)(root, "src/routes/health.ts")) || !(0, import_node_fs9.existsSync)((0, import_node_path9.join)(root, "src/routes/readiness.ts"))) findings.push(finding("LS008", "medium", "Health/readiness coverage is incomplete", "Production services should expose both liveness and readiness endpoints.", true));
  const swagger = readIfPresent(root, "src/plugins/swagger.ts") ?? "";
  if (swagger && !/NODE_ENV|SWAGGER|DOCS|enabled/i.test(swagger)) findings.push(finding("LS009", "medium", "Swagger exposure has no visible production policy", "Gate public production API documentation explicitly or document the choice.", false, "src/plugins/swagger.ts"));
  const tsconfig = readIfPresent(root, "tsconfig.json") ?? "";
  if (/"sourceMap"\s*:\s*true|"inlineSourceMap"\s*:\s*true/.test(tsconfig)) findings.push(finding("LS011", "low", "Source maps are enabled", "Ensure production source maps are private.", true, "tsconfig.json"));
  if (envExample && /NODE_ENV=development|LOG_LEVEL=debug/.test(envExample)) findings.push(finding("LS012", "low", "Development defaults are documented", "Deployment configuration should override development defaults.", true, ".env.example"));
  if ((0, import_node_fs9.existsSync)((0, import_node_path9.join)(root, "launchstack.json"))) try {
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

// src/commands/audit.ts
var auditCommand = new import_commander3.Command("audit").description("Audit a LaunchStack project for production-readiness risks").option("-d, --directory <path>").option("--production", "Enable the production policy profile").option("--json").option("--fail-on <severity>", "low, medium, high, critical", "none").action((options) => {
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
var import_node_fs11 = require("fs");
var import_node_path10 = require("path");
var import_commander4 = require("commander");

// src/client/generate.ts
var import_node_fs10 = require("fs");

// src/client/openapi.ts
var import_node_crypto3 = require("crypto");
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
  return raw.map(({ preferredName, ...item }) => ({ ...item, name: (counts.get(preferredName) ?? 0) > 1 ? `${preferredName}_${(0, import_node_crypto3.createHash)("sha256").update(`${item.method} ${item.path}`).digest("hex").slice(0, 8)}` : preferredName }));
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
async function loadOpenApiSource(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(1e4) });
    if (!response.ok) throw new Error(`OpenAPI request failed with ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) throw new Error(`OpenAPI endpoint returned unsupported content type: ${contentType || "unknown"}`);
    return parseOpenApiDocument(await response.json());
  }
  return parseOpenApiDocument(JSON.parse((0, import_node_fs10.readFileSync)(source, "utf8")));
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

// src/commands/client-generate.ts
var TARGETS = /* @__PURE__ */ new Set(["typescript", "react", "react-native"]);
var clientGenerateCommand = new import_commander4.Command("generate").description("Generate a typed client from an OpenAPI JSON document").option("--schema <path-or-url>", "OpenAPI JSON file or HTTPS endpoint", "./openapi.json").option("--target <target>", "typescript, react, or react-native", "typescript").option("-o, --output <path>", "Output TypeScript file", "./src/generated/launchstack-client.ts").option("--check", "Fail if output differs without writing").action(async (options) => {
  try {
    if (!TARGETS.has(options.target)) throw new Error(`Unsupported client target: ${options.target}`);
    const source = /^https?:\/\//i.test(options.schema) ? options.schema : (0, import_node_path10.resolve)(options.schema);
    if (/^http:\/\//i.test(source)) throw new Error("Remote OpenAPI schemas must use HTTPS.");
    const generated = generateTypeScriptClient(await loadOpenApiSource(source), options.target);
    const output = (0, import_node_path10.resolve)(options.output);
    if (options.check) {
      if (!(0, import_node_fs11.existsSync)(output) || (0, import_node_fs11.readFileSync)(output, "utf8") !== generated) {
        console.error(`Generated client is stale: ${output}`);
        process.exitCode = 1;
        return;
      }
      console.log(`Generated client is current: ${output}`);
      return;
    }
    (0, import_node_fs11.mkdirSync)((0, import_node_path10.dirname)(output), { recursive: true });
    (0, import_node_fs11.writeFileSync)(output, generated, "utf8");
    console.log(`Generated ${options.target} client: ${output}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
});
var clientCommand = new import_commander4.Command("client").description("Generate and verify typed API clients").addCommand(clientGenerateCommand);

// src/commands/create.ts
var import_node_fs17 = require("fs");
var import_node_path16 = require("path");
var import_commander5 = require("commander");

// src/generator/generate.ts
var import_node_fs16 = require("fs");
var import_node_path15 = require("path");
var import_node_crypto4 = require("crypto");

// src/docker-assets.ts
var import_node_fs12 = require("fs");
var import_node_path11 = require("path");
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
  const hasLockfile = options.hasLockfile ?? (0, import_node_fs12.existsSync)((0, import_node_path11.join)(projectDirectory, "package-lock.json"));
  const prisma = options.prisma ?? (0, import_node_fs12.existsSync)((0, import_node_path11.join)(projectDirectory, "prisma", "schema.prisma"));
  (0, import_node_fs12.writeFileSync)(
    (0, import_node_path11.join)(projectDirectory, "Dockerfile"),
    renderDockerfile({
      ...options,
      hasLockfile,
      prisma
    })
  );
  (0, import_node_fs12.writeFileSync)(
    (0, import_node_path11.join)(projectDirectory, ".dockerignore"),
    renderDockerIgnore()
  );
}

// src/generator/files.ts
var import_node_fs13 = require("fs");
var import_node_path12 = require("path");
var RENAMED_TEMPLATE_FILES = {
  "_gitignore": ".gitignore",
  "_dockerignore": ".dockerignore",
  "_npmrc": ".npmrc",
  "_env": ".env",
  "_env.example": ".env.example"
};
function ensureDestinationAvailable(destinationDirectory, overwrite = false) {
  if (!(0, import_node_fs13.existsSync)(destinationDirectory)) {
    return;
  }
  const contents = (0, import_node_fs13.readdirSync)(destinationDirectory);
  if (contents.length > 0 && !overwrite) {
    throw new Error(
      `Destination is not empty: ${destinationDirectory}. Use --force to overwrite it.`
    );
  }
}
function copyDirectory(sourceDirectory, destinationDirectory, overwriteRenamedFiles = false) {
  if (!(0, import_node_fs13.existsSync)(sourceDirectory)) {
    throw new Error(`Template directory not found: ${sourceDirectory}`);
  }
  (0, import_node_fs13.mkdirSync)(destinationDirectory, { recursive: true });
  (0, import_node_fs13.cpSync)(sourceDirectory, destinationDirectory, {
    recursive: true,
    force: true
  });
  renameTemplateFiles(destinationDirectory, overwriteRenamedFiles);
}
function renameTemplateFiles(directory2, overwriteRenamedFiles) {
  for (const entry of (0, import_node_fs13.readdirSync)(directory2)) {
    const currentPath = (0, import_node_path12.resolve)(directory2, entry);
    const stats = (0, import_node_fs13.statSync)(currentPath);
    if (stats.isDirectory()) {
      renameTemplateFiles(currentPath, overwriteRenamedFiles);
      continue;
    }
    const replacementName = RENAMED_TEMPLATE_FILES[(0, import_node_path12.basename)(currentPath)];
    if (!replacementName) {
      continue;
    }
    const replacementPath = (0, import_node_path12.resolve)((0, import_node_path12.dirname)(currentPath), replacementName);
    if ((0, import_node_fs13.existsSync)(replacementPath)) {
      if (overwriteRenamedFiles) {
        (0, import_node_fs13.unlinkSync)(replacementPath);
        (0, import_node_fs13.renameSync)(currentPath, replacementPath);
        continue;
      }
      const existingContent = (0, import_node_fs13.readFileSync)(replacementPath);
      const sourceContent = (0, import_node_fs13.readFileSync)(currentPath);
      if (!existingContent.equals(sourceContent)) {
        throw new Error(
          `Cannot rename template file because the destination exists: ${replacementPath}`
        );
      }
      (0, import_node_fs13.unlinkSync)(currentPath);
      continue;
    }
    (0, import_node_fs13.renameSync)(currentPath, replacementPath);
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
var import_node_fs14 = require("fs");
var import_node_path13 = require("path");
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
    (0, import_node_path13.resolve)(runtimeDirectory, ".."),
    (0, import_node_path13.resolve)(runtimeDirectory, "../.."),
    (0, import_node_path13.resolve)(process.cwd(), ".."),
    (0, import_node_path13.resolve)(process.cwd(), "../..")
  ];
  for (const candidate of candidates) {
    if ((0, import_node_fs14.existsSync)((0, import_node_path13.resolve)(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error("Could not locate the LaunchStack package root.");
}
function getTemplateDirectory(templateName) {
  const runtimeDirectory = getRuntimeDirectory();
  const packageRoot = getPackageRoot();
  const candidates = [
    (0, import_node_path13.resolve)(runtimeDirectory, "templates", templateName),
    (0, import_node_path13.resolve)(packageRoot, "dist", "templates", templateName),
    (0, import_node_path13.resolve)(packageRoot, "src", "templates", templateName),
    (0, import_node_path13.resolve)(packageRoot, "templates", templateName)
  ];
  const templateDirectory = candidates.find(
    (candidate) => (0, import_node_fs14.existsSync)(candidate)
  );
  if (!templateDirectory) {
    throw new Error(
      `Template "${templateName}" could not be found in the LaunchStack installation.`
    );
  }
  return templateDirectory;
}

// src/generator/template.ts
var import_node_fs15 = require("fs");
var import_node_path14 = require("path");
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
  const name = (0, import_node_path14.basename)(path);
  return TEXT_FILENAMES.has(name) || TEXT_EXTENSIONS.has((0, import_node_path14.extname)(name).toLowerCase());
}
function renderDirectory(directory2, variables) {
  if (!(0, import_node_fs15.existsSync)(directory2)) {
    throw new Error(`Directory not found: ${directory2}`);
  }
  for (const entry of (0, import_node_fs15.readdirSync)(directory2)) {
    const path = (0, import_node_path14.join)(directory2, entry);
    const stats = (0, import_node_fs15.statSync)(path);
    if (stats.isDirectory()) {
      renderDirectory(path, variables);
      continue;
    }
    if (!isTextTemplateFile(path)) {
      continue;
    }
    const content = (0, import_node_fs15.readFileSync)(path, "utf8");
    const rendered = renderTemplate(content, variables);
    if (rendered !== content) {
      (0, import_node_fs15.writeFileSync)(path, rendered);
    }
  }
}

// src/generator/generate.ts
function commitStagedProject(stagedDirectory, destinationDirectory, overwrite) {
  if (!(0, import_node_fs16.existsSync)(destinationDirectory)) {
    (0, import_node_fs16.renameSync)(stagedDirectory, destinationDirectory);
    return;
  }
  if (!overwrite) {
    if ((0, import_node_fs16.readdirSync)(destinationDirectory).length === 0) {
      (0, import_node_fs16.rmSync)(destinationDirectory, {
        recursive: true,
        force: true
      });
      (0, import_node_fs16.renameSync)(stagedDirectory, destinationDirectory);
      return;
    }
    throw new Error(`Destination already exists: ${destinationDirectory}`);
  }
  if ((0, import_node_path15.resolve)(destinationDirectory) === (0, import_node_path15.resolve)(process.cwd())) {
    throw new Error(
      "Refusing to replace the current working directory with --force. Choose a parent directory instead."
    );
  }
  const backupDirectory = (0, import_node_path15.join)(
    (0, import_node_path15.dirname)(destinationDirectory),
    `.${(0, import_node_path15.basename)(destinationDirectory)}.launchstack-backup-${(0, import_node_crypto4.randomUUID)()}`
  );
  (0, import_node_fs16.renameSync)(destinationDirectory, backupDirectory);
  try {
    (0, import_node_fs16.renameSync)(stagedDirectory, destinationDirectory);
    (0, import_node_fs16.rmSync)(backupDirectory, {
      recursive: true,
      force: true
    });
  } catch (error) {
    if ((0, import_node_fs16.existsSync)(destinationDirectory)) {
      (0, import_node_fs16.rmSync)(destinationDirectory, {
        recursive: true,
        force: true
      });
    }
    (0, import_node_fs16.renameSync)(backupDirectory, destinationDirectory);
    throw error;
  }
}
function generateProject(options) {
  validateProjectName(options.projectName);
  const destinationDirectory = (0, import_node_path15.resolve)(options.destinationDirectory);
  const overwrite = options.overwrite ?? false;
  ensureDestinationAvailable(destinationDirectory, overwrite);
  const templateDirectory = getTemplateDirectory(options.template);
  const parentDirectory = (0, import_node_path15.dirname)(destinationDirectory);
  (0, import_node_fs16.mkdirSync)(parentDirectory, { recursive: true });
  const stagedDirectory = (0, import_node_fs16.mkdtempSync)(
    (0, import_node_path15.join)(parentDirectory, `.${(0, import_node_path15.basename)(destinationDirectory)}.launchstack-stage-`)
  );
  try {
    if (overwrite && (0, import_node_fs16.existsSync)(destinationDirectory)) {
      (0, import_node_fs16.cpSync)(destinationDirectory, stagedDirectory, {
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
    if ((0, import_node_fs16.existsSync)(stagedDirectory)) {
      (0, import_node_fs16.rmSync)(stagedDirectory, {
        recursive: true,
        force: true
      });
    }
    throw error;
  }
  return destinationDirectory;
}

// src/generator/install.ts
var import_node_child_process2 = require("child_process");
function installDependencies(projectDirectory) {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  (0, import_node_child_process2.execFileSync)(npmExecutable, ["install"], {
    cwd: projectDirectory,
    stdio: "inherit"
  });
}

// src/commands/create.ts
var createCommand = new import_commander5.Command("create").description("Create a new backend API project").argument("<project-name>", "Name of the project to create").option(
  "-d, --directory <path>",
  "Directory where the project should be created"
).option("-f, --force", "Allow replacing a non-empty destination after staging succeeds").option("--no-install", "Skip dependency installation").action((projectName, options) => {
  try {
    const destinationDirectory = options.directory ? (0, import_node_path16.resolve)(options.directory) : (0, import_node_path16.resolve)(process.cwd(), projectName);
    const destinationAlreadyExists = (0, import_node_fs17.existsSync)(destinationDirectory);
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
      const relativeDestination = (0, import_node_path16.relative)(process.cwd(), destinationDirectory) || ".";
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
var import_node_child_process5 = require("child_process");
var import_commander6 = require("commander");

// src/config.ts
var import_node_fs19 = require("fs");
var import_node_path18 = require("path");
var import_zod3 = require("zod");

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
var import_node_fs18 = require("fs");
var import_node_path17 = require("path");
var import_node_crypto5 = require("crypto");
function atomicWriteText(path, content, mode) {
  const directory2 = (0, import_node_path17.dirname)(path);
  (0, import_node_fs18.mkdirSync)(directory2, { recursive: true });
  const temporaryPath = (0, import_node_path17.join)(
    directory2,
    `.${(0, import_node_path17.basename)(path)}.${process.pid}.${(0, import_node_crypto5.randomUUID)()}.tmp`
  );
  try {
    (0, import_node_fs18.writeFileSync)(temporaryPath, content, {
      encoding: "utf8",
      flag: "wx",
      ...mode === void 0 ? {} : { mode }
    });
    if (mode !== void 0) {
      (0, import_node_fs18.chmodSync)(temporaryPath, mode);
    }
    (0, import_node_fs18.renameSync)(temporaryPath, path);
    if (mode !== void 0) {
      (0, import_node_fs18.chmodSync)(path, mode);
    }
  } finally {
    if ((0, import_node_fs18.existsSync)(temporaryPath)) {
      (0, import_node_fs18.rmSync)(temporaryPath, { force: true });
    }
  }
}
function readJsonFile(path, fallback) {
  if (!(0, import_node_fs18.existsSync)(path)) {
    return fallback;
  }
  try {
    return JSON.parse((0, import_node_fs18.readFileSync)(path, "utf8"));
  } catch {
    throw new Error(`Invalid JSON in ${(0, import_node_path17.basename)(path)}.`);
  }
}

// src/config.ts
var CONFIG_FILE_NAME = "launchstack.config.json";
var launchStackConfigSchema = import_zod3.z.object({
  appName: import_zod3.z.string().min(1),
  environment: import_zod3.z.enum(["development", "staging", "production"]),
  provider: import_zod3.z.enum(PROVIDER_IDS),
  buildCommand: import_zod3.z.string().min(1),
  outputDirectory: import_zod3.z.string().min(1),
  deployTarget: import_zod3.z.string().min(1)
});
function getConfigPath() {
  return (0, import_node_path18.resolve)(process.cwd(), CONFIG_FILE_NAME);
}
function configExists() {
  return (0, import_node_fs19.existsSync)(getConfigPath());
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
  const raw = (0, import_node_fs19.readFileSync)(getConfigPath(), "utf-8");
  const parsed = JSON.parse(raw);
  return launchStackConfigSchema.parse(parsed);
}

// src/deployment.ts
var import_node_fs20 = require("fs");
var import_node_path19 = require("path");
function resolveVerifiedOutputDirectory(projectDirectory, configuredOutputDirectory) {
  const projectRoot = (0, import_node_path19.resolve)(projectDirectory);
  const outputPath = (0, import_node_path19.resolve)(projectRoot, configuredOutputDirectory);
  const relativePath = (0, import_node_path19.relative)(projectRoot, outputPath);
  if (relativePath === ".." || relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || (0, import_node_path19.isAbsolute)(relativePath)) {
    throw new Error(
      "Configured output directory must stay inside the project directory."
    );
  }
  if (!(0, import_node_fs20.existsSync)(outputPath)) {
    throw new Error(
      `Output directory not found: ${configuredOutputDirectory}`
    );
  }
  if (!(0, import_node_fs20.statSync)(outputPath).isDirectory()) {
    throw new Error(
      `Configured output path is not a directory: ${configuredOutputDirectory}`
    );
  }
  return outputPath;
}

// src/git.ts
var import_node_child_process3 = require("child_process");
function run(args, cwd) {
  return (0, import_node_child_process3.execFileSync)("git", args, {
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

// src/history.ts
var import_node_path20 = require("path");
var STORE_DIR = ".launchstack";
var HISTORY_FILE = "history.json";
function getHistoryPath(projectDirectory = process.cwd()) {
  return (0, import_node_path20.resolve)(
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

// src/stages/manager.ts
var import_node_crypto6 = require("crypto");
var import_node_fs21 = require("fs");
var import_node_path21 = require("path");

// src/stages/docker.ts
var import_node_child_process4 = require("child_process");
function run2(projectDirectory, args, environment = {}) {
  return (0, import_node_child_process4.execFileSync)("docker", args, { cwd: projectDirectory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...environment } });
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
  const suffix = (0, import_node_crypto6.createHash)("sha256").update((0, import_node_path21.resolve)(projectDirectory)).digest("hex").slice(0, 8);
  return `launchstack-${projectName}-${stage}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 63);
}
var stageEnvironment = (stage, values) => ({ ...values ?? {}, LAUNCHSTACK_STAGE: stage });
function stateMutation(projectDirectory, state) {
  const path = ".launchstack/state.json";
  const absolute = resolveProjectPath(projectDirectory, path);
  return { type: "write", path, content: serializeProjectState(state), owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: (0, import_node_fs21.existsSync)(absolute) ? hashFile(absolute) : null };
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
  const projectDirectory = (0, import_node_path21.resolve)(input.projectDirectory);
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
  const projectDirectory = (0, import_node_path21.resolve)(projectDirectoryInput);
  const stage = validateStageName(stageInput);
  const manifest = loadProjectManifest(projectDirectory);
  const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  const stored = state.stages[stage] ?? null;
  if (!stored) return { stage, state: null };
  const check = adapter(stored.provider).inspect({ projectDirectory, resourceId: stored.resourceId });
  return { stage, state: stored, providerExists: check.exists, providerStatus: check.status };
}
function destroyStage(input) {
  const projectDirectory = (0, import_node_path21.resolve)(input.projectDirectory);
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

// src/commands/deploy.ts
var deployCommand = new import_commander6.Command("deploy").description("Build/prepare deployment artifacts or deploy a manifest-declared stage").option("--skip-build").option("--stage <stage>").option("--production").option("--json").action((options) => {
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    if (options.stage) {
      if (!options.skipBuild) (0, import_node_child_process5.execSync)("npm run build", { stdio: "inherit", cwd: process.cwd() });
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
    if (!options.skipBuild) (0, import_node_child_process5.execSync)(config.buildCommand, { stdio: "inherit", cwd: process.cwd() });
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
var import_commander7 = require("commander");
var fail2 = (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
};
var previewCommand = new import_commander7.Command("preview").description("Create or update a non-production preview stage").argument("[stage]", "Preview stage name", "preview").option("-d, --directory <path>").option("--json").action((stage, options) => {
  try {
    const state = createOrUpdateStage({ projectDirectory: options.directory ?? process.cwd(), stage, production: false });
    if (options.json) console.log(JSON.stringify(state, null, 2));
    else console.log(`Preview ${state.name}: ${state.status}`);
  } catch (error) {
    fail2(error);
  }
});
var stageCommand = new import_commander7.Command("stage").description("Inspect named LaunchStack stages");
stageCommand.command("status").argument("<stage>").option("-d, --directory <path>").option("--json").action((stage, options) => {
  try {
    const status = inspectStage(options.directory ?? process.cwd(), stage);
    if (options.json) console.log(JSON.stringify(status, null, 2));
    else console.log(status.state ? `Stage ${stage}: ${status.state.status}` : `Stage ${stage}: absent`);
  } catch (error) {
    fail2(error);
  }
});
var destroyCommand = new import_commander7.Command("destroy").description("Destroy a verified LaunchStack stage resource").option("--stage <stage>").option("-d, --directory <path>").option("--production").option("--json").action((options) => {
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
var import_commander8 = require("commander");

// src/dev/orchestrator.ts
var import_node_child_process6 = require("child_process");
var import_node_net = require("net");
var import_node_path22 = require("path");
var defaultAdapters = { spawn(command, args, options) {
  return (0, import_node_child_process6.spawn)(command, args, { ...options, shell: false });
}, portAvailable(port) {
  return new Promise((done) => {
    const server = (0, import_node_net.createServer)();
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
  const queue2 = services.filter((item) => (indegree.get(item.id) ?? 0) === 0).sort((a, b) => a.id.localeCompare(b.id));
  const ordered = [];
  while (queue2.length) {
    const item = queue2.shift();
    if (!item) break;
    ordered.push(item);
    for (const id of (dependents.get(item.id) ?? []).sort()) {
      const next = (indegree.get(id) ?? 0) - 1;
      indegree.set(id, next);
      if (next === 0) {
        const dependent = byId.get(id);
        if (dependent) {
          queue2.push(dependent);
          queue2.sort((a, b) => a.id.localeCompare(b.id));
        }
      }
    }
  }
  if (ordered.length !== services.length) throw new Error("Development service dependency cycle detected.");
  return ordered;
}
function createDevPlan(projectDirectoryInput) {
  const projectDirectory = (0, import_node_path22.resolve)(projectDirectoryInput);
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
var devCommand = new import_commander8.Command("dev").description("Start LaunchStack-managed local development services").option("-d, --directory <path>").option("--service <id>", "Start one service plus its dependencies").option("--no-migrate", "Skip the migration process").option("--json").option("--readiness-timeout <ms>", "Readiness timeout", "30000").action(async (options) => {
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
var import_commander9 = require("commander");

// src/release/doctor.ts
var import_node_fs22 = require("fs");
var import_node_path23 = require("path");
function checkFile(projectDirectory, file, label) {
  const path = (0, import_node_path23.resolve)(projectDirectory, file);
  const passed = (0, import_node_fs22.existsSync)(path);
  return {
    name: label,
    passed,
    detail: passed ? `${file} found` : `${file} is missing`
  };
}
function checkPackageScripts(projectDirectory) {
  const packagePath = (0, import_node_path23.resolve)(
    projectDirectory,
    "package.json"
  );
  if (!(0, import_node_fs22.existsSync)(packagePath)) {
    return {
      name: "Package scripts",
      passed: false,
      detail: "package.json is missing"
    };
  }
  const packageJson2 = JSON.parse(
    (0, import_node_fs22.readFileSync)(packagePath, "utf8")
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
    (script) => !packageJson2.scripts?.[script]
  );
  return {
    name: "Package scripts",
    passed: missingScripts.length === 0,
    detail: missingScripts.length === 0 ? "Required scripts are present" : `Missing scripts: ${missingScripts.join(", ")}`
  };
}
function checkEnvironmentExample(projectDirectory) {
  const path = (0, import_node_path23.resolve)(
    projectDirectory,
    ".env.example"
  );
  if (!(0, import_node_fs22.existsSync)(path)) {
    return {
      name: "Environment example",
      passed: false,
      detail: ".env.example is missing"
    };
  }
  const content = (0, import_node_fs22.readFileSync)(path, "utf8");
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
    projectDirectory: (0, import_node_path23.resolve)(projectDirectory),
    checks
  };
}

// src/commands/doctor.ts
var doctorCommand = new import_commander9.Command("doctor").description("Inspect a generated LaunchStack project for missing production files and configuration").option("-d, --directory <path>", "Project directory to inspect").option("--json", "Print the doctor report as JSON").option("--fix", "Apply deterministic LaunchStack metadata/ownership repairs when safe").action((options) => {
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
var import_node_fs23 = require("fs");
var import_commander10 = require("commander");
function writeFileIfAllowed(path, content, force) {
  if ((0, import_node_fs23.existsSync)(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }
  (0, import_node_fs23.writeFileSync)(path, content);
  console.log(`Created ${path}`);
}
var dockerCommand = new import_commander10.Command("docker").description("Generate Docker deployment files");
dockerCommand.command("init").description("Create hardened Dockerfile, .dockerignore, and docker-compose.yml").option("-f, --force", "Overwrite existing Docker files").action((options) => {
  const config = readConfig();
  const force = Boolean(options.force);
  const hasLockfile = (0, import_node_fs23.existsSync)("package-lock.json");
  const prisma = (0, import_node_fs23.existsSync)("prisma/schema.prisma");
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
var import_commander11 = require("commander");
var allowedEnvironments = ["development", "staging", "production"];
var envCommand = new import_commander11.Command("env").description("View or update the LaunchStack environment").argument("[environment]", "development, staging, or production").action((environment) => {
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
var import_commander12 = require("commander");

// src/generator/module.ts
var import_node_fs24 = require("fs");
var import_node_path24 = require("path");
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
  const projectDirectory = (0, import_node_path24.resolve)(input.projectDirectory);
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
    if ((0, import_node_fs24.existsSync)(absolute)) throw new Error(`Generation collision: ${path} already exists.`);
    mutations.push({ type: "write", path, content, owner, version: currentLaunchStackVersion(), expectedSha256: null });
  }
  const registryPath = "src/routes/launchstack.generated.ts";
  const registryAbsolute = resolveProjectPath(projectDirectory, registryPath);
  const registryCurrent = (0, import_node_fs24.existsSync)(registryAbsolute) ? (0, import_node_fs24.readFileSync)(registryAbsolute, "utf8") : `import type { FastifyInstance } from "fastify";

/* launchstack-routes: [] */
export async function registerGeneratedRoutes(app: FastifyInstance): Promise<void> { void app; }
`;
  const names = parseRoutes(registryCurrent);
  if (!names.includes(name)) names.push(name);
  const nextRegistry = renderRoutes(names);
  if (nextRegistry !== registryCurrent) mutations.push({ type: "write", path: registryPath, content: nextRegistry, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: (0, import_node_fs24.existsSync)(registryAbsolute) ? hashFile(registryAbsolute) : null });
  let migrationCommand;
  if (input.kind === "resource") {
    const schemaPath = "prisma/schema.prisma";
    const schemaAbsolute = resolveProjectPath(projectDirectory, schemaPath);
    if (!(0, import_node_fs24.existsSync)(schemaAbsolute)) throw new Error("Cannot generate a CRUD resource without prisma/schema.prisma.");
    const schema = (0, import_node_fs24.readFileSync)(schemaAbsolute, "utf8");
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
  mutations.push({ type: "write", path: statePath, content: serializeProjectState(nextState), owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: (0, import_node_fs24.existsSync)(stateAbsolute) ? hashFile(stateAbsolute) : null });
  return { projectDirectory, kind: input.kind, name, files: mutations.map((mutation) => mutation.path).sort(), mutations, nextState, migrationCommand };
}
function applyModuleGeneration(plan) {
  return applyFileMutations({ projectDirectory: plan.projectDirectory, mutations: plan.mutations, state: loadProjectState(plan.projectDirectory), nextState: plan.nextState });
}

// src/commands/generate.ts
function configure(kind) {
  const command = new import_commander12.Command(kind).argument("<name>").option("-d, --directory <path>").option("--field <name:type...>", "Repeat for resource fields", (value, previous) => [...previous, value], []).option("--dry-run").option("--json");
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
var generateCommand = new import_commander12.Command("generate").description("Generate architecture-aware modules and resources").addCommand(configure("module")).addCommand(configure("resource"));

// src/commands/github.ts
var import_node_fs25 = require("fs");
var import_node_path25 = require("path");
var import_commander13 = require("commander");
function writeWorkflowFile(path, content, force) {
  if ((0, import_node_fs25.existsSync)(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }
  (0, import_node_fs25.mkdirSync)((0, import_node_path25.dirname)(path), { recursive: true });
  atomicWriteText(path, content);
  console.log(`Created ${path}`);
}
var githubCommand = new import_commander13.Command("github").description("Generate GitHub Actions workflows");
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
var import_commander14 = require("commander");
var historyCommand = new import_commander14.Command("history").description("Show recent LaunchStack deployments").option("-l, --limit <number>", "Number of records to show", "10").action((options) => {
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
var import_commander15 = require("commander");
var initCommand = new import_commander15.Command("init").description("Create a LaunchStack config file").option("-n, --name <name>", "Project name").option("-f, --force", "Overwrite existing config file").action((options) => {
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
var import_commander16 = require("commander");

// src/extensions/plugins.ts
var import_node_fs26 = require("fs");
var import_node_path26 = require("path");
var import_zod4 = require("zod");
var fileSchema = import_zod4.z.object({ path: import_zod4.z.string().min(1).max(240), content: import_zod4.z.string().max(1e6), executable: import_zod4.z.boolean().optional() }).strict();
var environmentSchema = import_zod4.z.object({ name: import_zod4.z.string().regex(/^[A-Z][A-Z0-9_]*$/), description: import_zod4.z.string().min(1).max(300), example: import_zod4.z.string().max(500).optional(), required: import_zod4.z.boolean().optional(), secret: import_zod4.z.boolean().optional() }).strict();
var hookSchema = import_zod4.z.object({ name: import_zod4.z.string().min(1).max(80), command: import_zod4.z.string().min(1).max(500), destructive: import_zod4.z.boolean().optional() }).strict();
var pluginManifestSchema = import_zod4.z.object({
  schemaVersion: import_zod4.z.literal(1),
  id: import_zod4.z.string().regex(/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]{0,100}$/),
  version: import_zod4.z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/),
  kind: import_zod4.z.literal("plugin"),
  displayName: import_zod4.z.string().min(1).max(120),
  supportedLaunchStack: import_zod4.z.string().min(1).max(80),
  dependencies: import_zod4.z.array(import_zod4.z.string().min(1).max(120)).max(50).optional(),
  conflicts: import_zod4.z.array(import_zod4.z.string().min(1).max(120)).max(50).optional(),
  files: import_zod4.z.array(fileSchema).max(200).optional(),
  packages: import_zod4.z.object({ dependencies: import_zod4.z.record(import_zod4.z.string(), import_zod4.z.string()).optional(), devDependencies: import_zod4.z.record(import_zod4.z.string(), import_zod4.z.string()).optional() }).strict().optional(),
  environment: import_zod4.z.array(environmentSchema).max(100).optional(),
  composeServices: import_zod4.z.record(import_zod4.z.string(), import_zod4.z.unknown()).optional(),
  doctor: import_zod4.z.array(import_zod4.z.object({ id: import_zod4.z.string().min(1), path: import_zod4.z.string().optional(), env: import_zod4.z.string().optional(), description: import_zod4.z.string().min(1) }).strict()).max(100).optional(),
  auditRequirements: import_zod4.z.array(import_zod4.z.object({ ruleId: import_zod4.z.string().regex(/^LS\d{3}$/), description: import_zod4.z.string().min(1) }).strict()).max(100).optional(),
  hooks: import_zod4.z.array(hookSchema).max(20).optional()
}).strict();
function parsePluginManifest(input, allowHooks = false) {
  const result = pluginManifestSchema.safeParse(input);
  if (!result.success) throw new Error(`Invalid LaunchStack plugin manifest: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  if (!allowHooks && result.data.hooks?.length) throw new Error(`Plugin requests executable hooks (${result.data.hooks.map((hook) => hook.name).join(", ")}). Re-run with --allow-hooks only after reviewing the plugin.`);
  return result.data;
}
function resolvePluginManifestPath(projectDirectory, specifier) {
  if (specifier.includes("\0")) throw new Error("Invalid plugin specifier");
  if (specifier.endsWith(".json") || specifier.startsWith(".") || (0, import_node_path26.isAbsolute)(specifier)) return (0, import_node_path26.resolve)(projectDirectory, specifier);
  const segments = specifier.startsWith("@") ? specifier.split("/") : [specifier];
  if (segments.some((segment) => segment === ".." || segment === "." || !segment)) throw new Error(`Invalid plugin package name: ${specifier}`);
  return (0, import_node_path26.join)((0, import_node_path26.resolve)(projectDirectory), "node_modules", ...segments, "launchstack-plugin.json");
}
function loadPluginManifest(projectDirectory, specifier, options = {}) {
  const path = resolvePluginManifestPath(projectDirectory, specifier);
  if (!(0, import_node_fs26.existsSync)(path)) throw new Error(`Plugin manifest not found at ${path}. Install third-party packages with scripts disabled, review launchstack-plugin.json, then run launchstack plugin add.`);
  try {
    return parsePluginManifest(JSON.parse((0, import_node_fs26.readFileSync)(path, "utf8")), options.allowHooks ?? false);
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
var pluginCommand = new import_commander16.Command("plugin").description("Manage validated LaunchStack extension manifests");
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
var import_commander17 = require("commander");
var providerCommand = new import_commander17.Command("provider").description("View or update the LaunchStack deployment provider").argument("[provider]", providerHelpText()).action((provider) => {
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
var import_commander18 = require("commander");
var rollbackCommand = new import_commander18.Command("rollback").description("Show the latest successful deployment available for rollback").action(() => {
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
var import_commander19 = require("commander");

// src/secrets-store.ts
var import_node_fs27 = require("fs");
var import_node_path27 = require("path");
var STORE_DIR2 = ".launchstack";
var SECRETS_FILE = "secrets.json";
var SECRET_MODE = 384;
var RESERVED_KEYS = /* @__PURE__ */ new Set([
  "__proto__",
  "constructor",
  "prototype"
]);
function getSecretsPath(projectDirectory = process.cwd()) {
  return (0, import_node_path27.resolve)(
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
  const storeDirectory = (0, import_node_path27.resolve)(projectDirectory, STORE_DIR2);
  (0, import_node_fs27.mkdirSync)(storeDirectory, { recursive: true });
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
  return new Promise((resolve24, reject) => {
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
          resolve24(value);
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
var secretsCommand = new import_commander19.Command("secrets").description("Manage local LaunchStack secrets");
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
var import_node_fs28 = require("fs");
var import_node_path28 = require("path");
var import_commander20 = require("commander");
var statusCommand = new import_commander20.Command("status").description("Show LaunchStack project or stage status").option("--stage <stage>", "Show one named stage").option("--json").option("-d, --directory <path>").action((options) => {
  const directory2 = options.directory ?? process.cwd();
  try {
    if (options.stage) {
      const status = inspectStage(directory2, options.stage);
      const output2 = { stage: options.stage, status: status.state?.status ?? "absent", provider: status.state?.provider ?? null, resourceId: status.state?.resourceId ?? null, url: status.state?.url ?? null, sourceCommit: status.state?.sourceCommit ?? null, production: status.state?.production ?? false, providerExists: status.providerExists ?? false, providerStatus: status.providerStatus ?? null };
      if (options.json) console.log(JSON.stringify(output2, null, 2));
      else console.log(`Stage ${options.stage}: ${output2.status}${output2.provider ? ` (${output2.provider})` : ""}`);
      return;
    }
    if ((0, import_node_fs28.existsSync)((0, import_node_path28.join)(directory2, "launchstack.json"))) {
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
var import_commander21 = require("commander");
var validateCommand = new import_commander21.Command("validate").description("Validate the LaunchStack config file").action(() => {
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
var program = new import_commander22.Command();
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
//# sourceMappingURL=cli.js.map