import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getGitMetadata } from "../git";
import { loadProjectManifest } from "../project/manifest";
import { resolveProjectPath } from "../project/paths";
import { hashFile, loadProjectState, serializeProjectState } from "../project/state";
import { applyFileMutations } from "../project/transaction";
import type { FileMutation, ProjectState, StageState } from "../project/types";
import { currentLaunchStackVersion } from "../version";
import { dockerStageAdapter } from "./docker";
import type { StageProviderAdapter, StageStatus } from "./types";
const ADAPTERS: Record<string, StageProviderAdapter> = { docker: dockerStageAdapter };
export function validateStageName(stage: string): string { if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(stage)) throw new Error("Stage names must use lowercase letters, numbers, and hyphens and be at most 48 characters."); return stage; }
export function stageResourceId(projectDirectory: string, projectName: string, stage: string): string { const directoryHash = createHash("sha256").update(resolve(projectDirectory)).digest("hex").slice(0, 10); const stageHash = createHash("sha256").update(`${resolve(projectDirectory)}\0${stage}`).digest("hex").slice(0, 8); const name = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 16) || "project"; return `ls-${directoryHash}-${name}-${stage.slice(0, 16)}-${stageHash}`; }
const stageEnvironment = (stage: string, values?: Record<string, string>) => ({ ...(values ?? {}), LAUNCHSTACK_STAGE: stage });
function stateMutation(projectDirectory: string, state: ProjectState): FileMutation { const path = ".launchstack/state.json"; const absolute = resolveProjectPath(projectDirectory, path); return { type: "write", path, content: serializeProjectState(state), owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync(absolute) ? hashFile(absolute) : null }; }
function persist(projectDirectory: string, previous: ProjectState, next: ProjectState): ProjectState { return applyFileMutations({ projectDirectory, mutations: [stateMutation(projectDirectory, next)], state: previous, nextState: next }); }
function writeStageState(projectDirectory: string, stage: string, value: StageState, expectedStatus?: StageState["status"]): ProjectState {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const previous = loadProjectState(projectDirectory);
    const current = previous.stages[stage];
    if (current && current.resourceId !== value.resourceId) throw new Error(`Stage ${stage} is already owned by another resource.`);
    if (expectedStatus && current?.status !== expectedStatus) throw new Error(`Stage ${stage} changed while its provider operation was running.`);
    if (value.status === "creating" && current?.status === "creating") throw new Error(`Stage ${stage} is already being created.`);
    const next = structuredClone(previous);
    next.stages[stage] = value;
    next.updatedAt = value.updatedAt;
    try { return persist(projectDirectory, previous, next); }
    catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !error.message.includes("File changed since planning")) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Unable to update state for stage ${stage}.`);
}
function adapter(provider: string): StageProviderAdapter { const value = ADAPTERS[provider]; if (!value) throw new Error(`Provider ${provider} does not implement preview lifecycle operations. Supported: ${Object.keys(ADAPTERS).join(", ")}.`); return value; }
export async function createOrUpdateStage(input: { projectDirectory: string; stage: string; production?: boolean }): Promise<StageState> {
  const projectDirectory = resolve(input.projectDirectory);
  const stage = validateStageName(input.stage);
  const manifest = loadProjectManifest(projectDirectory);
  const desired = manifest.stages[stage];
  const production = input.production === true;
  if (desired?.production === true && !production) throw new Error(`Stage ${stage} is declared production. Re-run with --production.`);
  if (production && desired?.production !== true) throw new Error(`Refusing to infer ${stage} as production. Declare it in launchstack.json first.`);
  const provider = desired?.provider ?? manifest.provider?.id ?? "docker";
  const providerAdapter = adapter(provider);
  const previous = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  const resourceId = stageResourceId(projectDirectory, manifest.project.name, stage);
  const existing = previous.stages[stage];
  if (existing && existing.resourceId !== resourceId) throw new Error(`Stored resource identity for ${stage} does not match this project.`);
  if (existing && existing.provider !== provider) throw new Error(`Stage ${stage} is already owned by ${existing.provider}.`);
  const now = new Date().toISOString();
  const git = getGitMetadata(projectDirectory);
  const creating: StageState = { name: stage, provider, resourceId, status: "creating", sourceCommit: git?.commitHash, url: existing?.url, createdAt: existing?.createdAt ?? now, updatedAt: now, production };
  writeStageState(projectDirectory, stage, creating);
  try {
    const result = await providerAdapter.create({ projectDirectory, stage, resourceId, environment: stageEnvironment(stage, desired?.env), sourceCommit: git?.commitHash, production });
    if (result.resourceId !== resourceId) throw new Error(`Provider returned unexpected resource identity for stage ${stage}.`);
    const ready = { ...creating, status: "ready" as const, url: result.url, updatedAt: new Date().toISOString() };
    writeStageState(projectDirectory, stage, ready, "creating");
    return ready;
  } catch (error) {
    const failed = { ...creating, status: "failed" as const, updatedAt: new Date().toISOString() };
    try { writeStageState(projectDirectory, stage, failed, "creating"); } catch {}
    throw error;
  }
}
export function inspectStage(projectDirectoryInput: string, stageInput: string): StageStatus { const projectDirectory = resolve(projectDirectoryInput); const stage = validateStageName(stageInput); const manifest = loadProjectManifest(projectDirectory); const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() }); const stored = state.stages[stage] ?? null; if (!stored) return { stage, state: null }; const check = adapter(stored.provider).inspect({ projectDirectory, resourceId: stored.resourceId }); return { stage, state: stored, providerExists: check.exists, providerStatus: check.status }; }
export function destroyStage(input: { projectDirectory: string; stage: string; production?: boolean }): void { const projectDirectory = resolve(input.projectDirectory); const stage = validateStageName(input.stage); const manifest = loadProjectManifest(projectDirectory); const previous = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() }); const stored = previous.stages[stage]; if (!stored) throw new Error(`Stage ${stage} is not recorded.`); if (stored.production !== Boolean(input.production)) throw new Error(`Production acknowledgement does not match stored stage ${stage}.`); const expected = stageResourceId(projectDirectory, manifest.project.name, stage); if (stored.resourceId !== expected) throw new Error(`Stored resource identity for ${stage} failed verification; refusing destroy.`); adapter(stored.provider).destroy({ projectDirectory, resourceId: stored.resourceId, environment: stageEnvironment(stage, manifest.stages[stage]?.env) }); const next = structuredClone(previous); delete next.stages[stage]; next.updatedAt = new Date().toISOString(); persist(projectDirectory, previous, next); }
