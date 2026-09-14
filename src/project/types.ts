export const MANIFEST_SCHEMA_URL = "https://launchstack.dev/schemas/project-v1.json";
export const MANIFEST_SCHEMA_VERSION = 1 as const;
export const STATE_SCHEMA_VERSION = 1 as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type CapabilitySelection = {
  version: string;
  provider?: string;
  options?: Record<string, JsonValue>;
};

export type AuditSuppression = { ruleId: string; reason: string };
export type DesiredStage = {
  provider?: string;
  source?: string;
  production?: boolean;
  env?: Record<string, string>;
};

export type ProjectManifest = {
  $schema: typeof MANIFEST_SCHEMA_URL;
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  project: { name: string; templateVersion: string };
  capabilities: Record<string, CapabilitySelection>;
  provider?: { id: string };
  stages: Record<string, DesiredStage>;
  audit?: { suppressions: AuditSuppression[] };
};

export type ManagedFileState = { owner: string; sha256: string; version: string };
export type InstalledExtensionState = {
  id: string;
  version: string;
  kind: "capability" | "plugin";
  source?: string;
  installedAt: string;
};
export type StageState = {
  name: string;
  provider: string;
  resourceId: string;
  status: "creating" | "ready" | "failed" | "destroyed";
  sourceCommit?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
  production: boolean;
};
export type ProjectState = {
  stateVersion: typeof STATE_SCHEMA_VERSION;
  templateVersion: string;
  cliVersion: string;
  managedFiles: Record<string, ManagedFileState>;
  extensions: Record<string, InstalledExtensionState>;
  stages: Record<string, StageState>;
  updatedAt: string;
};
export type DriftKind = "clean" | "missing" | "modified" | "unmanaged";
export type DriftEntry = {
  path: string;
  kind: DriftKind;
  owner?: string;
  expectedSha256?: string;
  actualSha256?: string;
};
export type PlannedWrite = {
  type: "write";
  path: string;
  content: string;
  owner: string;
  version: string;
  expectedSha256?: string | null;
  executable?: boolean;
};
export type PlannedDelete = {
  type: "delete";
  path: string;
  owner: string;
  expectedSha256: string;
};
export type FileMutation = PlannedWrite | PlannedDelete;
export type LifecycleAction = {
  id: string;
  kind: "install" | "upgrade" | "remove" | "write" | "delete" | "package" | "environment" | "compose" | "stage";
  target: string;
  detail: string;
  destructive?: boolean;
};
export type LifecyclePlan = {
  projectDirectory: string;
  actions: LifecycleAction[];
  warnings: string[];
  conflicts: string[];
};

export function emptyProjectState(templateVersion: string, cliVersion: string, now = new Date().toISOString()): ProjectState {
  return { stateVersion: STATE_SCHEMA_VERSION, templateVersion, cliVersion, managedFiles: {}, extensions: {}, stages: {}, updatedAt: now };
}
