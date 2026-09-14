import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { STATE_SCHEMA_VERSION, emptyProjectState, type DriftEntry, type ProjectState } from "./types";

const managedFileSchema = z.object({ owner: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/), version: z.string().min(1) }).strict();
const extensionSchema = z.object({ id: z.string().min(1), version: z.string().min(1), kind: z.enum(["capability", "plugin"]), source: z.string().optional(), installedAt: z.string().min(1) }).strict();
const stageSchema = z.object({ name: z.string().min(1), provider: z.string().min(1), resourceId: z.string().min(1), status: z.enum(["creating", "ready", "failed", "destroyed"]), sourceCommit: z.string().optional(), url: z.string().optional(), createdAt: z.string().min(1), updatedAt: z.string().min(1), production: z.boolean() }).strict();
export const projectStateSchema = z.object({ stateVersion: z.literal(STATE_SCHEMA_VERSION), templateVersion: z.string().min(1), cliVersion: z.string().min(1), managedFiles: z.record(z.string(), managedFileSchema), extensions: z.record(z.string(), extensionSchema), stages: z.record(z.string(), stageSchema), updatedAt: z.string().min(1) }).strict();
export const STATE_DIRECTORY = ".launchstack";
export const STATE_FILENAME = "state.json";
export function sha256(content: string | Buffer): string { return createHash("sha256").update(content).digest("hex"); }
export function hashFile(path: string): string { return sha256(readFileSync(path)); }
export function parseProjectState(input: unknown): ProjectState {
  const result = projectStateSchema.safeParse(input);
  if (!result.success) throw new Error(`Invalid LaunchStack state: ${result.error.issues.map((issue) => `${issue.path.join(".") || "state"}: ${issue.message}`).join("; ")}`);
  return result.data as ProjectState;
}
export function loadProjectState(projectDirectory: string, defaults?: { templateVersion?: string; cliVersion?: string }): ProjectState {
  const statePath = join(resolve(projectDirectory), STATE_DIRECTORY, STATE_FILENAME);
  if (!existsSync(statePath)) return emptyProjectState(defaults?.templateVersion ?? "unknown", defaults?.cliVersion ?? "unknown");
  try { return parseProjectState(JSON.parse(readFileSync(statePath, "utf8"))); }
  catch (error) { throw new Error(`Unable to read LaunchStack state: ${error instanceof Error ? error.message : String(error)}`); }
}
export function serializeProjectState(state: ProjectState): string { return `${JSON.stringify(parseProjectState(state), null, 2)}\n`; }
export function detectManagedDrift(projectDirectory: string, state: ProjectState): DriftEntry[] {
  const root = resolve(projectDirectory);
  const entries: DriftEntry[] = [];
  for (const [path, managed] of Object.entries(state.managedFiles)) {
    const absolute = join(root, path);
    if (!existsSync(absolute)) { entries.push({ path, kind: "missing", owner: managed.owner, expectedSha256: managed.sha256 }); continue; }
    const actualSha256 = hashFile(absolute);
    entries.push({ path, kind: actualSha256 === managed.sha256 ? "clean" : "modified", owner: managed.owner, expectedSha256: managed.sha256, actualSha256 });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}
