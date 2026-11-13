import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  linkSync,
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
import { normalizeManagedPath, resolveProjectPath } from "./paths";
import { hashFile, sha256 } from "./state";
import type { FileMutation, ProjectState } from "./types";

type Journal = {
  version: 1;
  id: string;
  state: "prepared" | "committing" | "committed";
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
  const allowed = new Set(["version", "id", "state", "mutations"]);
  if (Object.keys(candidate).some((key) => !allowed.has(key)) || candidate.version !== 1 || typeof candidate.id !== "string" || !/^[0-9a-f-]{36}$/i.test(candidate.id) || !["prepared", "committing", "committed"].includes(candidate.state as string) || !Array.isArray(candidate.mutations) || candidate.mutations.length > MAX_JOURNAL_MUTATIONS) {
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
    if (!normalized || normalized !== item.path || normalizeManagedPath(item.path) !== item.path || seen.has(normalized)) throw new Error("Invalid mutation recovery journal path.");
    seen.add(normalized);
    return { type: item.type, path: normalized, hadOriginal: item.hadOriginal } as Journal["mutations"][number];
  });
  const sortedPaths = mutations.map((item) => item.path).sort();
  for (let index = 1; index < sortedPaths.length; index += 1) {
    if (sortedPaths[index] === sortedPaths[index - 1] || sortedPaths[index]?.startsWith(`${sortedPaths[index - 1]}/`)) throw new Error("Invalid overlapping mutation recovery journal paths.");
  }
  return { version: 1, id: candidate.id, state: candidate.state as Journal["state"], mutations };
}

function readJournal(projectDirectory: string): Journal {
  ensureMetadataDirectory(projectDirectory);
  const path = journalPath(projectDirectory);
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > MAX_JOURNAL_BYTES) throw new Error("Mutation recovery journal is not a bounded regular file.");
  const contents = readFileSync(path, "utf8");
  if (Buffer.byteLength(contents) > MAX_JOURNAL_BYTES) throw new Error("Mutation recovery journal exceeds the size limit.");
  return parseJournal(JSON.parse(contents) as unknown);
}

function processStartToken(pid: number): string | undefined {
  if (process.platform !== "linux") return undefined;
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    const fields = stat.slice(close + 2).trim().split(/\s+/);
    return fields[19];
  } catch {
    return undefined;
  }
}

function processIsAlive(pid: number, expectedStartToken?: string): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    if (expectedStartToken && processStartToken(pid) !== expectedStartToken) return false;
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function syncFile(path: string): void {
  const descriptor = openSync(path, "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function waitForLockRetry(): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
}

function syncDirectory(path: string): void {
  if (process.platform === "win32") return;
  let descriptor: number | undefined;
  try {
    descriptor = openSync(path, "r");
    fsyncSync(descriptor);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EINVAL" && code !== "ENOTSUP" && code !== "EISDIR") throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function collectDirectoryChain(directories: Set<string>, path: string, stopAt: string): void {
  const stop = resolve(stopAt);
  let current = resolve(path);
  while (current === stop || current.startsWith(`${stop}${sep}`)) {
    directories.add(current);
    if (current === stop) return;
    current = dirname(current);
  }
  throw new Error("Cannot sync a directory outside the transaction boundary.");
}

function syncDirectories(directories: Set<string>): void {
  for (const directory of [...directories].sort((left, right) => right.length - left.length)) syncDirectory(directory);
}

function writeJournal(projectDirectory: string, journal: Journal): void {
  const path = journalPath(projectDirectory);
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(journal, null, 2), { mode: 0o600, flag: "wx" });
  syncFile(temporary);
  renameSync(temporary, path);
  syncDirectory(metadataDirectory(projectDirectory));
}

function acquireLock(projectDirectory: string): () => void {
  const directory = ensureMetadataDirectory(projectDirectory);
  const lockPath = join(directory, "mutation.lock");

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const lockId = randomUUID();
    const temporaryLockPath = join(directory, `.mutation-lock-${lockId}.tmp`);
    const startToken = processStartToken(process.pid);
    writeFileSync(temporaryLockPath, JSON.stringify({ version: 1, id: lockId, pid: process.pid, processStartToken: startToken, createdAt: Date.now() }), { mode: 0o600, flag: "wx" });
    syncFile(temporaryLockPath);
    try {
      linkSync(temporaryLockPath, lockPath);
      unlinkSync(temporaryLockPath);
      syncDirectory(directory);
      return () => {
        try {
          const current = JSON.parse(readFileSync(lockPath, "utf8")) as { id?: string };
          if (current.id === lockId) unlinkSync(lockPath);
        } catch { /* lock was replaced or already released */ }
      };
    } catch (error) {
      try { unlinkSync(temporaryLockPath); } catch { /* already removed */ }
      if (!existsSync(lockPath)) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw error;
      }
      let stale = false;
      try {
        const stat = lstatSync(lockPath);
        if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 4096) throw new Error("unsafe lock");
        const contents = readFileSync(lockPath, "utf8");
        const lock = JSON.parse(contents) as { version?: number; id?: string; pid?: number; processStartToken?: string; createdAt?: number };
        if (lock.version !== 1 || typeof lock.id !== "string" || !Number.isInteger(lock.pid) || !Number.isFinite(lock.createdAt) || (lock.processStartToken !== undefined && typeof lock.processStartToken !== "string")) throw new Error("malformed lock");
        stale = !processIsAlive(lock.pid ?? -1, lock.processStartToken);
        if (stale && readFileSync(lockPath, "utf8") === contents) unlinkSync(lockPath);
      } catch {
        if (!existsSync(lockPath)) continue;
        throw new Error("Another LaunchStack mutation is already running; its lock identity cannot be verified.");
      }
      if (!stale) {
        if (attempt === 99) throw new Error("Another LaunchStack mutation is already running for this project.");
        waitForLockRetry();
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
  if (journal.state === "committed") {
    if (existsSync(stageDirectory)) rmSync(stageDirectory, { recursive: true, force: true });
    if (existsSync(backupDirectory)) rmSync(backupDirectory, { recursive: true, force: true });
    rmSync(journalPath(projectDirectory), { force: true });
    syncDirectory(metadata);
    return;
  }
  for (const mutation of journal.mutations) {
    const target = resolveProjectPath(projectDirectory, mutation.path);
    const backup = join(backupDirectory, mutation.path);
    if (existsSync(backup)) resolveProjectPath(backupDirectory, mutation.path);
    if (mutation.hadOriginal && !existsSync(backup) && !existsSync(target)) {
      throw new Error(`Cannot safely recover original file: ${mutation.path}`);
    }
  }
  const restoredDirectories = new Set<string>();
  for (const mutation of [...journal.mutations].reverse()) {
    const target = resolveProjectPath(projectDirectory, mutation.path);
    const backup = join(backupDirectory, mutation.path);
    if (existsSync(backup)) {
      if (existsSync(target)) rmSync(target, { recursive: true, force: true });
      mkdirSync(dirname(target), { recursive: true });
      renameSync(backup, target);
      collectDirectoryChain(restoredDirectories, dirname(target), projectDirectory);
    } else if (!mutation.hadOriginal && existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
      collectDirectoryChain(restoredDirectories, dirname(target), projectDirectory);
    }
  }
  syncDirectories(restoredDirectories);
  if (existsSync(stageDirectory)) rmSync(stageDirectory, { recursive: true, force: true });
  if (existsSync(backupDirectory)) rmSync(backupDirectory, { recursive: true, force: true });
  rmSync(journalPath(projectDirectory), { force: true });
  syncDirectory(metadata);
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
    syncDirectory(metadata);

    const stagedDirectories = new Set<string>();
    try {
      const normalizedPaths = input.mutations.map((mutation) => {
        const normalized = normalizeManagedPath(mutation.path);
        if (normalized !== mutation.path || normalized.startsWith(".launchstack/mutation.lock") || normalized.startsWith(".launchstack/mutation-journal.json") || normalized.split("/").some((segment) => segment.startsWith(".stage-") || segment.startsWith(".backup-"))) {
          throw new Error(`Mutation plan contains a non-canonical or reserved path: ${mutation.path}`);
        }
        if (mutation.type === "write" && mutation.expectedSha256 === undefined) throw new Error(`Write mutation lacks a compare-and-swap precondition: ${normalized}`);
        return normalized;
      }).sort();
      for (let index = 0; index < normalizedPaths.length; index += 1) {
        if (normalizedPaths[index] === normalizedPaths[index - 1]) throw new Error(`Mutation plan contains duplicate target: ${normalizedPaths[index]}`);
        if (normalizedPaths[index]?.startsWith(`${normalizedPaths[index - 1]}/`)) throw new Error(`Mutation plan contains overlapping paths: ${normalizedPaths[index - 1]} and ${normalizedPaths[index]}`);
      }
      for (const mutation of input.mutations) {
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
          syncFile(staged);
          collectDirectoryChain(stagedDirectories, dirname(staged), stageDirectory);
        } else if (!exists || hashFile(target) !== mutation.expectedSha256) {
          throw new Error(`Managed file changed before delete: ${mutation.path}`);
        }
      }
      syncDirectories(stagedDirectories);
    } catch (error) {
      rmSync(stageDirectory, { recursive: true, force: true });
      rmSync(backupDirectory, { recursive: true, force: true });
      throw error;
    }

    const journal: Journal = {
      version: 1,
      id,
      state: "prepared",
      mutations: input.mutations.map((mutation) => ({
        type: mutation.type,
        path: mutation.path,
        hadOriginal: existsSync(resolveProjectPath(projectDirectory, mutation.path))
      }))
    };
    writeJournal(projectDirectory, journal);

    try {
      journal.state = "committing";
      writeJournal(projectDirectory, journal);
      const committedDirectories = new Set<string>();
      for (const mutation of input.mutations) {
        const target = resolveProjectPath(projectDirectory, mutation.path);
        const backup = join(backupDirectory, mutation.path);
        if (existsSync(target)) {
          mkdirSync(dirname(backup), { recursive: true });
          renameSync(target, backup);
          collectDirectoryChain(committedDirectories, dirname(target), projectDirectory);
          collectDirectoryChain(committedDirectories, dirname(backup), backupDirectory);
        }
        if (mutation.type === "write") {
          const staged = join(stageDirectory, mutation.path);
          mkdirSync(dirname(target), { recursive: true });
          renameSync(staged, target);
          collectDirectoryChain(committedDirectories, dirname(staged), stageDirectory);
          collectDirectoryChain(committedDirectories, dirname(target), projectDirectory);
        }
      }
      syncDirectories(committedDirectories);
      const nextState = input.nextState ?? withTrackedMutations(input.state, input.mutations);
      journal.state = "committed";
      writeJournal(projectDirectory, journal);
      try {
        rmSync(stageDirectory, { recursive: true, force: true });
        rmSync(backupDirectory, { recursive: true, force: true });
        rmSync(journalPath(projectDirectory), { force: true });
        syncDirectory(metadata);
      } catch {
        // The committed journal lets the next operation safely finish cleanup.
      }
      return nextState;
    } catch (error) {
      try {
        restoreJournal(projectDirectory, readJournal(projectDirectory));
      } catch {
        // Leave the journal and owned recovery directories intact for a safe retry.
      }
      throw error;
    }
  } finally {
    releaseLock();
  }
}
