import {
  chmodSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve, relative, sep, isAbsolute } from "node:path";
import { resolveProjectPath } from "./paths";
import { hashFile, sha256 } from "./state";
import type { FileMutation, ProjectState } from "./types";

type Journal = {
  version: 1;
  id: string;
  mutations: Array<{ type: "write" | "delete"; path: string; hadOriginal: boolean }>;
};

const metadataDirectory = (projectDirectory: string) => join(resolve(projectDirectory), ".launchstack");
const journalPath = (projectDirectory: string) => join(metadataDirectory(projectDirectory), "mutation-journal.json");
const MAX_JOURNAL_BYTES = 2 * 1024 * 1024;
const MAX_JOURNAL_MUTATIONS = 10_000;

function ensureMetadataDirectory(projectDirectory: string): string {
  const root = resolve(projectDirectory);
  const directory = metadataDirectory(root);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("LaunchStack metadata directory must be a real directory.");
  }
  const relativePath = relative(root, resolve(directory));
  if (relativePath !== ".launchstack" || isAbsolute(relativePath) || relativePath.startsWith(`..${sep}`)) {
    throw new Error("LaunchStack metadata directory escapes the project.");
  }
  return directory;
}

function assertOwnedDirectory(directory: string, metadata: string): void {
  const stat = lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("Mutation recovery directory is not a LaunchStack-owned directory.");
  }
  const rel = relative(resolve(metadata), resolve(directory));
  if (!rel.startsWith(".stage-") && !rel.startsWith(".backup-")) {
    throw new Error("Mutation recovery directory escapes LaunchStack metadata.");
  }
  if (rel.includes(sep) || rel === ".." || isAbsolute(rel)) {
    throw new Error("Mutation recovery directory escapes LaunchStack metadata.");
  }
}

function parseJournal(value: unknown): Journal {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid mutation recovery journal.");
  const candidate = value as Record<string, unknown>;
  const allowed = new Set(["version", "id", "mutations"]);
  if (Object.keys(candidate).some((key) => !allowed.has(key)) || candidate.version !== 1 || typeof candidate.id !== "string" || !/^[0-9a-f-]{36}$/i.test(candidate.id) || !Array.isArray(candidate.mutations) || candidate.mutations.length > MAX_JOURNAL_MUTATIONS) {
    throw new Error("Invalid mutation recovery journal.");
  }
  const seen = new Set<string>();
  const mutations = candidate.mutations.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Invalid mutation recovery journal entry.");
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).some((key) => !["type", "path", "hadOriginal"].includes(key)) || (item.type !== "write" && item.type !== "delete") || typeof item.path !== "string" || typeof item.hadOriginal !== "boolean") {
      throw new Error("Invalid mutation recovery journal entry.");
    }
    const normalized = item.path.split(/[\\/]+/).filter(Boolean).join("/");
    if (!normalized || normalized !== item.path || seen.has(normalized)) throw new Error("Invalid mutation recovery journal path.");
    seen.add(normalized);
    return { type: item.type, path: normalized, hadOriginal: item.hadOriginal } as Journal["mutations"][number];
  });
  return { version: 1, id: candidate.id, mutations };
}

function readJournal(projectDirectory: string): Journal {
  const metadata = ensureMetadataDirectory(projectDirectory);
  const path = journalPath(projectDirectory);
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > MAX_JOURNAL_BYTES) throw new Error("Mutation recovery journal is not a bounded regular file.");
  return parseJournal(JSON.parse(readFileSync(path, "utf8")) as unknown);
}

function processIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock(projectDirectory: string): () => void {
  const directory = ensureMetadataDirectory(projectDirectory);
  const lockPath = join(directory, "mutation.lock");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = openSync(lockPath, "wx", 0o600);
      const lockId = randomUUID();
      writeFileSync(descriptor, JSON.stringify({ version: 1, id: lockId, pid: process.pid, createdAt: Date.now() }));
      closeSync(descriptor);
      return () => {
        try {
          const current = JSON.parse(readFileSync(lockPath, "utf8")) as { id?: string };
          if (current.id === lockId) unlinkSync(lockPath);
        } catch { /* lock was replaced or already released */ }
      };
    } catch (error) {
      if (!existsSync(lockPath)) throw error;
      let stale = false;
      try {
        const stat = lstatSync(lockPath);
        if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 4096) throw new Error("unsafe lock");
        const contents = readFileSync(lockPath, "utf8");
        const lock = JSON.parse(contents) as { version?: number; id?: string; pid?: number; createdAt?: number };
        if (lock.version !== 1 || typeof lock.id !== "string" || !Number.isInteger(lock.pid) || !Number.isFinite(lock.createdAt)) throw new Error("malformed lock");
        stale = !processIsAlive(lock.pid ?? -1);
        if (stale && readFileSync(lockPath, "utf8") === contents) unlinkSync(lockPath);
      } catch {
        stale = false;
      }
      if (!stale || attempt > 0) {
        throw new Error("Another LaunchStack mutation is already running for this project.");
      }
    }
  }

  throw new Error("Unable to acquire LaunchStack project mutation lock.");
}

function restoreJournal(projectDirectory: string, journal: Journal): void {
  const metadata = ensureMetadataDirectory(projectDirectory);
  const stageDirectory = join(metadata, `.stage-${journal.id}`);
  const backupDirectory = join(metadata, `.backup-${journal.id}`);
  if (existsSync(stageDirectory)) assertOwnedDirectory(stageDirectory, metadata);
  if (existsSync(backupDirectory)) assertOwnedDirectory(backupDirectory, metadata);
  for (const mutation of journal.mutations) {
    const target = resolveProjectPath(projectDirectory, mutation.path);
    const backup = join(backupDirectory, mutation.path);
    if (existsSync(backup)) resolveProjectPath(backupDirectory, mutation.path);
    if (mutation.hadOriginal && !existsSync(backup) && !existsSync(target)) {
      throw new Error(`Cannot safely recover original file: ${mutation.path}`);
    }
  }
  for (const mutation of [...journal.mutations].reverse()) {
    const target = resolveProjectPath(projectDirectory, mutation.path);
    const backup = join(backupDirectory, mutation.path);
    if (existsSync(backup)) {
      if (existsSync(target)) rmSync(target, { recursive: true, force: true });
      mkdirSync(dirname(target), { recursive: true });
      renameSync(backup, target);
    } else if (!mutation.hadOriginal && existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
    }
  }
  if (existsSync(stageDirectory)) rmSync(stageDirectory, { recursive: true, force: true });
  if (existsSync(backupDirectory)) rmSync(backupDirectory, { recursive: true, force: true });
  rmSync(journalPath(projectDirectory), { force: true });
}

export function recoverInterruptedMutation(projectDirectory: string): boolean {
  const path = journalPath(projectDirectory);
  if (!existsSync(path)) return false;
  restoreJournal(projectDirectory, readJournal(projectDirectory));
  return true;
}

export function withTrackedMutations(state: ProjectState, mutations: FileMutation[]): ProjectState {
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
  next.updatedAt = new Date().toISOString();
  return next;
}

export function applyFileMutations(input: {
  projectDirectory: string;
  mutations: FileMutation[];
  state: ProjectState;
  nextState?: ProjectState;
}): ProjectState {
  const projectDirectory = resolve(input.projectDirectory);
  const releaseLock = acquireLock(projectDirectory);
  try {
    recoverInterruptedMutation(projectDirectory);
    const id = randomUUID();
    const metadata = ensureMetadataDirectory(projectDirectory);
    const stageDirectory = join(metadata, `.stage-${id}`);
    const backupDirectory = join(metadata, `.backup-${id}`);
    mkdirSync(stageDirectory, { recursive: true, mode: 0o700 });
    mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });

    try {
      const uniquePaths = new Set<string>();
      for (const mutation of input.mutations) {
        if (uniquePaths.has(mutation.path)) {
          throw new Error(`Mutation plan contains duplicate target: ${mutation.path}`);
        }
        uniquePaths.add(mutation.path);
        const target = resolveProjectPath(projectDirectory, mutation.path);
        const exists = existsSync(target);
        if (mutation.type === "write") {
          if (mutation.expectedSha256 === null && exists) {
            throw new Error(`Refusing to overwrite unmanaged file: ${mutation.path}`);
          }
          if (
            typeof mutation.expectedSha256 === "string" &&
            (!exists || hashFile(target) !== mutation.expectedSha256)
          ) {
            throw new Error(`File changed since planning: ${mutation.path}`);
          }
          const staged = join(stageDirectory, mutation.path);
          mkdirSync(dirname(staged), { recursive: true });
          writeFileSync(staged, mutation.content, "utf8");
          chmodSync(staged, mutation.executable ? 0o755 : 0o644);
        } else if (!exists || hashFile(target) !== mutation.expectedSha256) {
          throw new Error(`Managed file changed before delete: ${mutation.path}`);
        }
      }
    } catch (error) {
      rmSync(stageDirectory, { recursive: true, force: true });
      rmSync(backupDirectory, { recursive: true, force: true });
      throw error;
    }

    const journal: Journal = {
      version: 1,
      id,
      mutations: input.mutations.map((mutation) => ({
        type: mutation.type,
        path: mutation.path,
        hadOriginal: existsSync(resolveProjectPath(projectDirectory, mutation.path))
      }))
    };
    writeFileSync(journalPath(projectDirectory), JSON.stringify(journal, null, 2), { mode: 0o600, flag: "wx" });

    try {
      for (const mutation of input.mutations) {
        const target = resolveProjectPath(projectDirectory, mutation.path);
        const backup = join(backupDirectory, mutation.path);
        if (existsSync(target)) {
          mkdirSync(dirname(backup), { recursive: true });
          renameSync(target, backup);
        }
        if (mutation.type === "write") {
          const staged = join(stageDirectory, mutation.path);
          mkdirSync(dirname(target), { recursive: true });
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
