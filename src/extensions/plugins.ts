import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import type { ExtensionManifest } from "./types";

const fileSchema = z.object({ path: z.string().min(1).max(240), content: z.string().max(1_000_000), executable: z.boolean().optional() }).strict();
const environmentSchema = z.object({ name: z.string().regex(/^[A-Z][A-Z0-9_]*$/), description: z.string().min(1).max(300), example: z.string().max(500).optional(), required: z.boolean().optional(), secret: z.boolean().optional() }).strict();
const hookSchema = z.object({ name: z.string().min(1).max(80), command: z.string().min(1).max(500), destructive: z.boolean().optional() }).strict();
export const pluginManifestSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().regex(/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]{0,100}$/), version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/), kind: z.literal("plugin"), displayName: z.string().min(1).max(120), supportedLaunchStack: z.string().min(1).max(80),
  dependencies: z.array(z.string().min(1).max(120)).max(50).optional(), conflicts: z.array(z.string().min(1).max(120)).max(50).optional(), files: z.array(fileSchema).max(200).optional(),
  packages: z.object({ dependencies: z.record(z.string(), z.string()).optional(), devDependencies: z.record(z.string(), z.string()).optional() }).strict().optional(), environment: z.array(environmentSchema).max(100).optional(), composeServices: z.record(z.string(), z.unknown()).optional(),
  doctor: z.array(z.object({ id: z.string().min(1), path: z.string().optional(), env: z.string().optional(), description: z.string().min(1) }).strict()).max(100).optional(), auditRequirements: z.array(z.object({ ruleId: z.string().regex(/^LS\d{3}$/), description: z.string().min(1) }).strict()).max(100).optional(), hooks: z.array(hookSchema).max(20).optional()
}).strict();
export function parsePluginManifest(input: unknown, allowHooks = false): ExtensionManifest {
  const result = pluginManifestSchema.safeParse(input); if (!result.success) throw new Error(`Invalid LaunchStack plugin manifest: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  if (!allowHooks && result.data.hooks?.length) throw new Error(`Plugin requests executable hooks (${result.data.hooks.map((hook) => hook.name).join(", ")}). Re-run with --allow-hooks only after reviewing the plugin.`);
  return result.data as ExtensionManifest;
}
export function resolvePluginManifestPath(projectDirectory: string, specifier: string): string {
  if (specifier.includes("\0")) throw new Error("Invalid plugin specifier");
  if (specifier.endsWith(".json") || specifier.startsWith(".") || isAbsolute(specifier)) return resolve(projectDirectory, specifier);
  const segments = specifier.startsWith("@") ? specifier.split("/") : [specifier]; if (segments.some((segment) => segment === ".." || segment === "." || !segment)) throw new Error(`Invalid plugin package name: ${specifier}`);
  return join(resolve(projectDirectory), "node_modules", ...segments, "launchstack-plugin.json");
}
export function loadPluginManifest(projectDirectory: string, specifier: string, options: { allowHooks?: boolean } = {}): ExtensionManifest {
  const path = resolvePluginManifestPath(projectDirectory, specifier); if (!existsSync(path)) throw new Error(`Plugin manifest not found at ${path}. Install third-party packages with scripts disabled, review launchstack-plugin.json, then run launchstack plugin add.`);
  try { return parsePluginManifest(JSON.parse(readFileSync(path, "utf8")), options.allowHooks ?? false); }
  catch (error) { if (error instanceof Error && error.message.startsWith("Invalid LaunchStack")) throw error; throw new Error(`Unable to read plugin manifest: ${error instanceof Error ? error.message : String(error)}`); }
}
