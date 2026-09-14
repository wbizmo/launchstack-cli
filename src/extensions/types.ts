import type { JsonValue } from "../project/types";
export type ExtensionKind = "capability" | "plugin";
export type ExtensionFile = { path: string; content: string; executable?: boolean };
export type ExtensionEnvironmentVariable = { name: string; description: string; example?: string; required?: boolean; secret?: boolean };
export type ExtensionManifest = {
  schemaVersion: 1; id: string; version: string; kind: ExtensionKind; displayName: string; supportedLaunchStack: string;
  dependencies?: string[]; conflicts?: string[]; files?: ExtensionFile[];
  packages?: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  environment?: ExtensionEnvironmentVariable[]; composeServices?: Record<string, JsonValue>;
  doctor?: Array<{ id: string; path?: string; env?: string; description: string }>;
  auditRequirements?: Array<{ ruleId: string; description: string }>;
  hooks?: Array<{ name: string; command: string; destructive?: boolean }>;
};
export type ExtensionPlan = { extensionIds: string[]; actions: Array<{ kind: "file" | "package" | "environment" | "compose" | "metadata"; target: string; detail: string }>; warnings: string[]; noop: boolean };
