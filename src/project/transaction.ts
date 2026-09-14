import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { resolveProjectPath } from "./paths";
import { hashFile, sha256 } from "./state";
import type { FileMutation, ProjectState } from "./types";

const LOCK_MAX_AGE_MS = 5 * 60 * 1000;
type Journal = { id: string; backupDirectory: string; stageDirectory: string; mutations: Array<{ type: "write" | "delete"; path: string; hadOriginal: boolean }> };
const metadataDirectory = (projectDirectory: string) => join(resolve(projectDirectory), ".launchstack");
function processIsAlive(pid: number): boolean { if (!Number.isInteger(pid) || pid <= 0) return false; try { process.kill(pid, 0); return true; } catch { return false; } }
function acquireLock(projectDirectory: string): () => void {
  const directory = metadataDirectory(projectDirectory); mkdirSync(directory, { recursive: true }); const lockPath = join(directory, "mutation.lock");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { const descriptor = openSync(lockPath, "wx", 0o600); writeFileSync(descriptor, JSON.stringify({ pid: process.pid, createdAt: Date.now() })); closeSync(descriptor); return () => { try { unlinkSync(lockPath); } catch {} }; }
    catch (error) {
      if (!existsSync(lockPath)) throw error;
      let stale = false;
      try { const lock = JSON.parse(readFileSync(lockPath, "utf8")) as { pid?: number; createdAt?: number }; stale = !processIsAlive(lock.pid ?? -1) || Date.now() - (lock.createdAt ?? 0) > LOCK_MAX_AGE_MS; } catch { stale = true; }
      if (!stale || attempt > 0) throw new Error("Another LaunchStack mutation is already running for this project.");
      unlinkSync(lockPath);
    }
  }
  throw new Error("Unable to acquire LaunchStack project mutation lock.");
}
const journalPath = (projectDirectory: string) => join(metadataDirectory(projectDirectory), "mutation-journal.json");
function restoreJournal(projectDirectory: string, journal: Journal): void {
  for (const mutation of [...journal.mutations].reverse()) {
    const target = resolveProjectPath(projectDirectory, mutation.path); const backup = join(journal.backupDirectory, mutation.path);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
    if (mutation.hadOriginal && existsSync(backup)) { mkdirSync(dirname(target), { recursive: true }); renameSync(backup, target); }
  }
  rmSync(journal.stageDirectory, { recursive: true, force: true }); rmSync(journal.backupDirectory, { recursive: true, force: true }); rmSync(journalPath(projectDirectory), { force: true });
}
export function recoverInterruptedMutation(projectDirectory: string): boolean { const path = journalPath(projectDirectory); if (!existsSync(path)) return false; restoreJournal(projectDirectory, JSON.parse(readFileSync(path, "utf8")) as Journal); return true; }
export function withTrackedMutations(state: ProjectState, mutations: FileMutation[]): ProjectState {
  const next = structuredClone(state);
  for (const mutation of mutations) { if (mutation.owner === "launchstack:metadata") continue; if (mutation.type === "write") next.managedFiles[mutation.path] = { owner: mutation.owner, version: mutation.version, sha256: sha256(mutation.content) }; else delete next.managedFiles[mutation.path]; }
  next.updatedAt = new Date().toISOString(); return next;
}
export function applyFileMutations(input: { projectDirectory: string; mutations: FileMutation[]; state: ProjectState; nextState?: ProjectState }): ProjectState {
  const projectDirectory = resolve(input.projectDirectory); const releaseLock = acquireLock(projectDirectory);
  try {
    recoverInterruptedMutation(projectDirectory); const id = randomUUID(); const metadata = metadataDirectory(projectDirectory); const stageDirectory = join(metadata, `.stage-${id}`); const backupDirectory = join(metadata, `.backup-${id}`); mkdirSync(stageDirectory, { recursive: true, mode: 0o700 }); mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
    const uniquePaths = new Set<string>();
    for (const mutation of input.mutations) {
      if (uniquePaths.has(mutation.path)) throw new Error(`Mutation plan contains duplicate target: ${mutation.path}`); uniquePaths.add(mutation.path);
      const target = resolveProjectPath(projectDirectory, mutation.path); const exists = existsSync(target);
      if (mutation.type === "write") {
        if (mutation.expectedSha256 === null && exists) throw new Error(`Refusing to overwrite unmanaged file: ${mutation.path}`);
        if (typeof mutation.expectedSha256 === "string" && (!exists || hashFile(target) !== mutation.expectedSha256)) throw new Error(`File changed since planning: ${mutation.path}`);
        const staged = join(stageDirectory, mutation.path); mkdirSync(dirname(staged), { recursive: true }); writeFileSync(staged, mutation.content, "utf8"); chmodSync(staged, mutation.executable ? 0o755 : 0o644);
      } else if (!exists || hashFile(target) !== mutation.expectedSha256) throw new Error(`Managed file changed before delete: ${mutation.path}`);
    }
    const journal: Journal = { id, backupDirectory, stageDirectory, mutations: input.mutations.map((mutation) => ({ type: mutation.type, path: mutation.path, hadOriginal: existsSync(resolveProjectPath(projectDirectory, mutation.path)) })) };
    writeFileSync(journalPath(projectDirectory), JSON.stringify(journal, null, 2), { mode: 0o600 });
    try {
      for (const mutation of input.mutations) { const target = resolveProjectPath(projectDirectory, mutation.path); const backup = join(backupDirectory, mutation.path); if (existsSync(target)) { mkdirSync(dirname(backup), { recursive: true }); renameSync(target, backup); } if (mutation.type === "write") { const staged = join(stageDirectory, mutation.path); mkdirSync(dirname(target), { recursive: true }); renameSync(staged, target); } }
      const nextState = input.nextState ?? withTrackedMutations(input.state, input.mutations); rmSync(stageDirectory, { recursive: true, force: true }); rmSync(backupDirectory, { recursive: true, force: true }); rmSync(journalPath(projectDirectory), { force: true }); return nextState;
    } catch (error) { restoreJournal(projectDirectory, journal); throw error; }
  } finally { releaseLock(); }
}
