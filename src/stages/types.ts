import type { StageState } from "../project/types";
export type StageCreateInput = { projectDirectory: string; stage: string; resourceId: string; environment: Record<string, string>; sourceCommit?: string; production: boolean };
export type StageCreateResult = { resourceId: string; url?: string };
export type StageProviderAdapter = { id: string; capabilities: { create: boolean; inspect: boolean; update: boolean; destroy: boolean }; create(input: StageCreateInput): StageCreateResult; inspect(input: { projectDirectory: string; resourceId: string }): { exists: boolean; status?: string }; destroy(input: { projectDirectory: string; resourceId: string; environment: Record<string, string> }): void };
export type StageStatus = { stage: string; state: StageState | null; providerExists?: boolean; providerStatus?: string };
