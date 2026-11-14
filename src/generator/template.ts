import { existsSync, lstatSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { atomicWriteText, readRegularFileNoFollow } from "../storage";

export type TemplateVariables = Record<string, string>;

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".example",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const TEXT_FILENAMES = new Set([
  ".dockerignore",
  ".env",
  ".env.example",
  ".gitignore",
  ".npmrc",
  "Dockerfile",
  "LICENSE",
]);

export function renderTemplate(
  content: string,
  variables: TemplateVariables,
): string {
  return content.replace(/{{([A-Z0-9_]+)}}/g, (token, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key)
      ? (variables[key] ?? token)
      : token,
  );
}

export function isTextTemplateFile(path: string): boolean {
  const name = basename(path);
  return (
    TEXT_FILENAMES.has(name) || TEXT_EXTENSIONS.has(extname(name).toLowerCase())
  );
}

export function renderDirectory(
  directory: string,
  variables: TemplateVariables,
): void {
  if (!existsSync(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = lstatSync(path);
    // Existing user projects copied into the staging directory may contain
    // links (notably node_modules/.bin); preserve them without dereferencing.
    if (stats.isSymbolicLink()) continue;

    if (stats.isDirectory()) {
      renderDirectory(path, variables);
      continue;
    }

    if (!isTextTemplateFile(path)) {
      continue;
    }

    const snapshot = readRegularFileNoFollow(path, 16 * 1024 * 1024);
    const content = snapshot.content;
    const rendered = renderTemplate(content, variables);

    if (rendered !== content) {
      atomicWriteText(
        path,
        rendered,
        process.platform === "win32" ? undefined : snapshot.mode & 0o777,
      );
    }
  }
}
