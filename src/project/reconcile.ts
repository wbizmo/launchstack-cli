import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { applyExtensionInstall, planExtensionInstall, resolveExtensionOrder } from "../extensions/engine";
import { FIRST_PARTY_EXTENSIONS } from "../extensions/first-party";
import { applyExtensionRemoval, planExtensionRemoval } from "../extensions/remove";
import { loadProjectManifest } from "./manifest";
import { detectManagedDrift, loadProjectState } from "./state";
import type { DriftEntry, LifecycleAction, LifecyclePlan } from "./types";
import { currentLaunchStackVersion } from "../version";
export type ReconciliationPlan = LifecyclePlan & { desiredCapabilities: string[]; installCapabilities: string[]; removeCapabilities: string[]; drift: DriftEntry[] };
export function planReconciliation(projectDirectoryInput: string): ReconciliationPlan {
  const projectDirectory = resolve(projectDirectoryInput); const manifest = loadProjectManifest(projectDirectory); const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() }); const desiredCapabilities = Object.keys(manifest.capabilities).sort(); const installedCapabilities = Object.values(state.extensions).filter((item) => item.kind === "capability").map((item) => item.id).sort(); const installCapabilities = desiredCapabilities.filter((id) => !state.extensions[id] || state.extensions[id]?.version !== manifest.capabilities[id]?.version); const desiredSet = new Set(desiredCapabilities); const removeCapabilities = installedCapabilities.filter((id) => !desiredSet.has(id)); const drift = detectManagedDrift(projectDirectory, state); const conflicts = drift.filter((item) => item.kind === "modified").map((item) => `Managed file has local modifications: ${item.path}`); const actions: LifecycleAction[] = [];
  for (const id of installCapabilities) { if (!FIRST_PARTY_EXTENSIONS[id]) { conflicts.push(`Manifest capability is not available: ${id}`); continue; } actions.push({ id: `capability:${id}:install`, kind: state.extensions[id] ? "upgrade" : "install", target: id, detail: `${state.extensions[id]?.version ?? "absent"} -> ${manifest.capabilities[id]?.version ?? "unknown"}` }); }
  for (const id of removeCapabilities) { if (!FIRST_PARTY_EXTENSIONS[id]) conflicts.push(`Installed capability cannot be removed by this CLI: ${id}`); actions.push({ id: `capability:${id}:remove`, kind: "remove", target: id, detail: "installed capability is absent from desired manifest", destructive: true }); }
  return { projectDirectory, desiredCapabilities, installCapabilities, removeCapabilities, drift, actions, warnings: removeCapabilities.length ? ["Capability removals are destructive and require --allow-remove during apply."] : [], conflicts };
}
export function applyReconciliation(input: { projectDirectory: string; allowRemove?: boolean }): ReconciliationPlan {
  let plan = planReconciliation(input.projectDirectory); if (plan.conflicts.length) throw new Error(`Cannot reconcile project: ${plan.conflicts.join("; ")}`); if (plan.removeCapabilities.length && !input.allowRemove) throw new Error("Reconciliation includes capability removal. Re-run with --allow-remove after reviewing the plan.");
  for (const id of plan.installCapabilities) { const item = FIRST_PARTY_EXTENSIONS[id]; if (!item) throw new Error(`Unknown first-party capability: ${id}`); const desiredVersion = loadProjectManifest(input.projectDirectory).capabilities[id]?.version; if (desiredVersion && desiredVersion !== item.version) throw new Error(`Requested ${id}@${desiredVersion}, but this CLI provides ${item.version}.`); applyExtensionInstall(planExtensionInstall({ projectDirectory: input.projectDirectory, requested: [id], registry: FIRST_PARTY_EXTENSIONS })); }
  if (plan.removeCapabilities.length) { const ordered = resolveExtensionOrder(plan.removeCapabilities, FIRST_PARTY_EXTENSIONS).reverse(); for (const item of ordered) { if (!plan.removeCapabilities.includes(item.id)) continue; const fresh = planReconciliation(input.projectDirectory); if (fresh.removeCapabilities.includes(item.id)) applyExtensionRemoval(planExtensionRemoval({ projectDirectory: input.projectDirectory, extension: item })); } }
  plan = planReconciliation(input.projectDirectory); return plan;
}
export function projectHasManifest(projectDirectory: string): boolean { return existsSync(resolve(projectDirectory, "launchstack.json")); }
