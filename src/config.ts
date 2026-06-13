import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

export const CONFIG_FILE_NAME = "launchstack.config.json";

export const launchStackConfigSchema = z.object({
  appName: z.string().min(1),
  environment: z.enum(["development", "staging", "production"]),
  provider: z.enum(["vercel", "netlify", "render", "railway", "docker", "custom"]),
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
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

export function readConfig(): LaunchStackProjectConfig {
  const raw = readFileSync(getConfigPath(), "utf-8");
  const parsed = JSON.parse(raw);

  return launchStackConfigSchema.parse(parsed);
}