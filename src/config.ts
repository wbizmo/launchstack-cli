import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { PROVIDER_IDS } from "./providers";
import { atomicWriteText } from "./storage";

export const CONFIG_FILE_NAME = "launchstack.config.json";

export const launchStackConfigSchema = z.object({
  appName: z.string().min(1),
  environment: z.enum(["development", "staging", "production"]),
  provider: z.enum(PROVIDER_IDS),
  buildCommand: z.string().min(1),
  outputDirectory: z.string().min(1),
  deployTarget: z.string().min(1)
});

export type LaunchStackProjectConfig = z.infer<typeof launchStackConfigSchema>;

export function getConfigPath() {
  return resolve(process.cwd(), CONFIG_FILE_NAME);
}

export function configExists() {
  return existsSync(getConfigPath());
}

export function createDefaultConfig(appName: string): LaunchStackProjectConfig {
  return {
    appName,
    environment: "production",
    provider: "custom",
    buildCommand: "npm run build",
    outputDirectory: "dist",
    deployTarget: "https://example.com"
  };
}

export function writeConfig(config: LaunchStackProjectConfig) {
  const validated = launchStackConfigSchema.parse(config);
  atomicWriteText(
    getConfigPath(),
    `${JSON.stringify(validated, null, 2)}\n`
  );
}

export function readConfig(): LaunchStackProjectConfig {
  const raw = readFileSync(getConfigPath(), "utf-8");
  const parsed = JSON.parse(raw);

  return launchStackConfigSchema.parse(parsed);
}
