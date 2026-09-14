import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { MANIFEST_SCHEMA_URL, MANIFEST_SCHEMA_VERSION, type ProjectManifest } from "./types";

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]));
const capabilitySchema = z.object({ version: z.string().min(1).max(64), provider: z.string().min(1).max(64).optional(), options: z.record(z.string(), jsonValueSchema).optional() }).strict();
const stageSchema = z.object({ provider: z.string().min(1).max(64).optional(), source: z.string().min(1).max(256).optional(), production: z.boolean().optional(), env: z.record(z.string(), z.string()).optional() }).strict();
const suppressionSchema = z.object({ ruleId: z.string().regex(/^LS\d{3}$/), reason: z.string().trim().min(8).max(300) }).strict();

export const projectManifestSchema = z.object({
  $schema: z.literal(MANIFEST_SCHEMA_URL),
  schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
  project: z.object({ name: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/), templateVersion: z.string().min(1).max(64) }).strict(),
  capabilities: z.record(z.string(), capabilitySchema),
  provider: z.object({ id: z.string().min(1).max(64) }).strict().optional(),
  stages: z.record(z.string(), stageSchema),
  audit: z.object({ suppressions: z.array(suppressionSchema).max(100) }).strict().optional()
}).strict();

export const MANIFEST_FILENAME = "launchstack.json";

export function parseProjectManifest(input: unknown): ProjectManifest {
  const result = projectManifestSchema.safeParse(input);
  if (!result.success) {
    const detail = result.error.issues.map((issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`).join("; ");
    throw new Error(`Invalid ${MANIFEST_FILENAME}: ${detail}`);
  }
  return result.data as ProjectManifest;
}

export function loadProjectManifest(projectDirectory: string): ProjectManifest {
  const manifestPath = join(resolve(projectDirectory), MANIFEST_FILENAME);
  try { return parseProjectManifest(JSON.parse(readFileSync(manifestPath, "utf8"))); }
  catch (error) { throw new Error(`Unable to read ${MANIFEST_FILENAME}: ${error instanceof Error ? error.message : String(error)}`); }
}

export function serializeProjectManifest(manifest: ProjectManifest): string { return `${JSON.stringify(parseProjectManifest(manifest), null, 2)}\n`; }
export function createProjectManifest(input: { name: string; templateVersion: string }): ProjectManifest {
  return parseProjectManifest({ $schema: MANIFEST_SCHEMA_URL, schemaVersion: MANIFEST_SCHEMA_VERSION, project: input, capabilities: {}, provider: { id: "docker" }, stages: {} });
}
