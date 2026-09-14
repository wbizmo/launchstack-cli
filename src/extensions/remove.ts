import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadProjectManifest, serializeProjectManifest } from "../project/manifest";
import { resolveProjectPath } from "../project/paths";
import { hashFile, loadProjectState, serializeProjectState } from "../project/state";
import { applyFileMutations } from "../project/transaction";
import type { FileMutation, ProjectManifest, ProjectState } from "../project/types";
import { currentLaunchStackVersion } from "../version";
import type { ExtensionManifest } from "./types";
export type PreparedRemoval = { projectDirectory: string; extension: ExtensionManifest; mutations: FileMutation[]; nextManifest: ProjectManifest; nextState: ProjectState; warnings: string[] };
function metadataWrite(projectDirectory: string, path: string, content: string): FileMutation { const absolute = resolveProjectPath(projectDirectory, path); return { type: "write", path, content, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync(absolute) ? hashFile(absolute) : null }; }
export function planExtensionRemoval(input: { projectDirectory: string; extension: ExtensionManifest }): PreparedRemoval {
  const projectDirectory = resolve(input.projectDirectory); const manifest = loadProjectManifest(projectDirectory); const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  if (!state.extensions[input.extension.id]) throw new Error(`${input.extension.id} is not installed.`);
  const mutations: FileMutation[] = [];
  for (const [path, managed] of Object.entries(state.managedFiles)) { if (managed.owner !== input.extension.id) continue; const absolute = resolveProjectPath(projectDirectory, path); if (!existsSync(absolute)) throw new Error(`Managed plugin file is missing: ${path}`); const current = hashFile(absolute); if (current !== managed.sha256) throw new Error(`Refusing to remove locally modified file: ${path}`); mutations.push({ type: "delete", path, owner: input.extension.id, expectedSha256: current }); }
  const nextManifest = structuredClone(manifest); if (input.extension.kind === "capability") delete nextManifest.capabilities[input.extension.id]; const nextState = structuredClone(state); for (const mutation of mutations) delete nextState.managedFiles[mutation.path]; delete nextState.extensions[input.extension.id]; nextState.cliVersion = currentLaunchStackVersion(); nextState.updatedAt = new Date().toISOString();
  const warnings: string[] = []; if (input.extension.packages) warnings.push("Package dependencies are preserved on removal because other code may still depend on them."); if (input.extension.environment?.length) warnings.push("Environment variable declarations are preserved to avoid deleting user configuration.");
  return { projectDirectory, extension: input.extension, mutations, nextManifest, nextState, warnings };
}
export function applyExtensionRemoval(plan: PreparedRemoval): ProjectState {
  return applyFileMutations({ projectDirectory: plan.projectDirectory, mutations: [...plan.mutations, metadataWrite(plan.projectDirectory, "launchstack.json", serializeProjectManifest(plan.nextManifest)), metadataWrite(plan.projectDirectory, ".launchstack/state.json", serializeProjectState(plan.nextState))], state: loadProjectState(plan.projectDirectory), nextState: plan.nextState });
}
