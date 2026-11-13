import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadProjectManifest, serializeProjectManifest } from "../project/manifest";
import { resolveProjectPath } from "../project/paths";
import { hashFile, loadProjectState, serializeProjectState } from "../project/state";
import { applyFileMutations, withTrackedMutations } from "../project/transaction";
import type { FileMutation, ProjectManifest, ProjectState } from "../project/types";
import { currentLaunchStackVersion } from "../version";
import type { ExtensionManifest } from "./types";
import { composeMutation } from "./engine";
export type PreparedRemoval = { projectDirectory: string; extension: ExtensionManifest; mutations: FileMutation[]; nextManifest: ProjectManifest; nextState: ProjectState; warnings: string[] };
function metadataWrite(projectDirectory: string, path: string, content: string): FileMutation { const absolute = resolveProjectPath(projectDirectory, path); return { type: "write", path, content, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync(absolute) ? hashFile(absolute) : null }; }
export function planExtensionRemoval(input: { projectDirectory: string; extension: ExtensionManifest; registry?: Record<string, ExtensionManifest> }): PreparedRemoval {
  const projectDirectory = resolve(input.projectDirectory); const manifest = loadProjectManifest(projectDirectory); const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  if (!state.extensions[input.extension.id]) throw new Error(`${input.extension.id} is not installed.`);
  if (input.registry && input.extension.kind === "capability") {
    const remaining = Object.keys(state.extensions).filter((id) => id !== input.extension.id && state.extensions[id]?.kind === "capability");
    const dependents = remaining.filter((id) => input.registry?.[id]?.dependencies?.includes(input.extension.id));
    if (dependents.length) throw new Error(`Cannot remove ${input.extension.id}; installed capabilities still depend on it: ${dependents.sort().join(", ")}.`);
  }
  const mutations: FileMutation[] = [];
  for (const [path, managed] of Object.entries(state.managedFiles)) { if (managed.owner !== input.extension.id) continue; const absolute = resolveProjectPath(projectDirectory, path); if (!existsSync(absolute)) throw new Error(`Managed plugin file is missing: ${path}`); const current = hashFile(absolute); if (current !== managed.sha256) throw new Error(`Refusing to remove locally modified file: ${path}`); mutations.push({ type: "delete", path, owner: input.extension.id, expectedSha256: current }); }
  if (input.extension.scripts) {
    const packagePath = resolveProjectPath(projectDirectory, "package.json");
    if (existsSync(packagePath)) {
      const packageText = readFileSync(packagePath, "utf8");
      const packageJson = JSON.parse(packageText) as Record<string, unknown>;
      const scripts = { ...((packageJson.scripts ?? {}) as Record<string, string>) };
      let changed = false;
      for (const [name, command] of Object.entries(input.extension.scripts)) {
        if (scripts[name] !== command) continue;
        const inUse = Object.values(state.extensions).some((installed) => installed.id !== input.extension.id && input.registry?.[installed.id]?.scripts?.[name] === command);
        if (!inUse) { delete scripts[name]; changed = true; }
      }
      if (changed) {
        const sortedScripts = Object.fromEntries(Object.entries(scripts).sort(([left], [right]) => left.localeCompare(right)));
        mutations.push({ type: "write", path: "package.json", content: JSON.stringify({ ...packageJson, scripts: sortedScripts }, null, 2) + "\n", owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: hashFile(packagePath) });
      }
    }
  }
  const composeWrite = composeMutation(projectDirectory, state, mutations); if (composeWrite) mutations.push(composeWrite);
  const nextManifest = structuredClone(manifest); if (input.extension.kind === "capability") delete nextManifest.capabilities[input.extension.id]; const nextState = withTrackedMutations(state, mutations); delete nextState.extensions[input.extension.id]; nextState.cliVersion = currentLaunchStackVersion(); nextState.updatedAt = new Date().toISOString();
  const warnings: string[] = []; if (input.extension.packages) warnings.push("Package dependencies are preserved on removal because other code may still depend on them."); if (input.extension.environment?.length) warnings.push("Environment variable declarations are preserved to avoid deleting user configuration.");
  return { projectDirectory, extension: input.extension, mutations, nextManifest, nextState, warnings };
}
export function applyExtensionRemoval(plan: PreparedRemoval): ProjectState {
  return applyFileMutations({ projectDirectory: plan.projectDirectory, mutations: [...plan.mutations, metadataWrite(plan.projectDirectory, "launchstack.json", serializeProjectManifest(plan.nextManifest)), metadataWrite(plan.projectDirectory, ".launchstack/state.json", serializeProjectState(plan.nextState))], state: loadProjectState(plan.projectDirectory), nextState: plan.nextState });
}
