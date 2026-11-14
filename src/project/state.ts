import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { normalizeManagedPath } from "./paths";
import {
  STATE_SCHEMA_VERSION,
  emptyProjectState,
  type DriftEntry,
  type ProjectState,
} from "./types";

const managedFileSchema = z
  .object({
    owner: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    version: z.string().min(1),
    ownership: z.enum(["launchstack", "shared", "extension"]).optional(),
    migrationBaseSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
const extensionSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    kind: z.enum(["capability", "plugin"]),
    source: z.string().optional(),
    installedAt: z.string().min(1),
  })
  .strict();
const stageSchema = z
  .object({
    name: z.string().min(1),
    provider: z.string().min(1),
    resourceId: z.string().min(1),
    status: z.enum(["creating", "ready", "failed", "destroyed"]),
    sourceCommit: z.string().optional(),
    url: z.string().optional(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    production: z.boolean(),
  })
  .strict();
export const projectStateSchema = z
  .object({
    stateVersion: z.literal(STATE_SCHEMA_VERSION),
    templateVersion: z.string().min(1),
    cliVersion: z.string().min(1),
    managedFiles: z.record(z.string(), managedFileSchema),
    extensions: z.record(z.string(), extensionSchema),
    stages: z.record(z.string(), stageSchema),
    updatedAt: z.string().min(1),
  })
  .strict();
export const STATE_DIRECTORY = ".launchstack";
export const STATE_FILENAME = "state.json";
export function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}
const MAX_MANAGED_FILE_BYTES = 256 * 1024 * 1024;

export function hashFile(path: string): string {
  let descriptor: number;
  try {
    descriptor = openSync(
      path,
      constants.O_RDONLY |
        (constants.O_NOFOLLOW ?? 0) |
        (constants.O_NONBLOCK ?? 0),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ELOOP")
      throw new Error("Refusing to hash a symbolic-link managed file.");
    throw error;
  }
  const hash = createHash("sha256");
  const chunk = Buffer.allocUnsafe(64 * 1024);
  try {
    const before = fstatSync(descriptor);
    if (!before.isFile())
      throw new Error("Managed file is not a regular file.");
    if (before.size > MAX_MANAGED_FILE_BYTES)
      throw new Error("Managed file exceeds the 256 MiB hashing limit.");
    let remaining = before.size;
    while (remaining > 0) {
      const bytes = readSync(
        descriptor,
        chunk,
        0,
        Math.min(chunk.length, remaining),
        null,
      );
      if (bytes === 0)
        throw new Error("Managed file changed while it was being hashed.");
      hash.update(chunk.subarray(0, bytes));
      remaining -= bytes;
    }
    const current = lstatSync(path);
    if (
      current.isSymbolicLink() ||
      !current.isFile() ||
      current.dev !== before.dev ||
      current.ino !== before.ino ||
      current.size !== before.size ||
      current.mtimeMs !== before.mtimeMs ||
      current.ctimeMs !== before.ctimeMs
    )
      throw new Error(
        "Managed file identity changed while it was being hashed.",
      );
    return hash.digest("hex");
  } finally {
    closeSync(descriptor);
  }
}
export function parseProjectState(input: unknown): ProjectState {
  const result = projectStateSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Invalid LaunchStack state: ${result.error.issues.map((issue) => `${issue.path.join(".") || "state"}: ${issue.message}`).join("; ")}`,
    );
  for (const path of Object.keys(result.data.managedFiles))
    if (normalizeManagedPath(path) !== path)
      throw new Error(
        `Invalid managed file path in LaunchStack state: ${path}`,
      );
  return result.data as ProjectState;
}
export function loadProjectState(
  projectDirectory: string,
  defaults?: { templateVersion?: string; cliVersion?: string },
): ProjectState {
  const statePath = join(
    resolve(projectDirectory),
    STATE_DIRECTORY,
    STATE_FILENAME,
  );
  if (!existsSync(statePath))
    return emptyProjectState(
      defaults?.templateVersion ?? "unknown",
      defaults?.cliVersion ?? "unknown",
    );
  try {
    return parseProjectState(JSON.parse(readFileSync(statePath, "utf8")));
  } catch (error) {
    throw new Error(
      `Unable to read LaunchStack state: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
export function serializeProjectState(state: ProjectState): string {
  return `${JSON.stringify(parseProjectState(state), null, 2)}\n`;
}
export function detectManagedDrift(
  projectDirectory: string,
  state: ProjectState,
): DriftEntry[] {
  const root = resolve(projectDirectory);
  const entries: DriftEntry[] = [];
  for (const [path, managed] of Object.entries(state.managedFiles)) {
    if (normalizeManagedPath(path) !== path)
      throw new Error(
        `Invalid managed file path in LaunchStack state: ${path}`,
      );
    const absolute = join(root, path);
    let actualSha256: string;
    try {
      actualSha256 = hashFile(absolute);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      entries.push({
        path,
        kind: "missing",
        owner: managed.owner,
        expectedSha256: managed.sha256,
      });
      continue;
    }
    entries.push({
      path,
      kind: actualSha256 === managed.sha256 ? "clean" : "modified",
      owner: managed.owner,
      expectedSha256: managed.sha256,
      actualSha256,
    });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}
