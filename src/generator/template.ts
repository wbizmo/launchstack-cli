import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, extname, join } from "node:path";

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
  ".yml"
]);

const TEXT_FILENAMES = new Set([
  ".dockerignore",
  ".env",
  ".env.example",
  ".gitignore",
  ".npmrc",
  "Dockerfile",
  "LICENSE"
]);

export function renderTemplate(
  content: string,
  variables: TemplateVariables
): string {
  return content.replace(
    /{{([A-Z0-9_]+)}}/g,
    (token, key: string) =>
      Object.prototype.hasOwnProperty.call(variables, key)
        ? variables[key] ?? token
        : token
  );
}

export function isTextTemplateFile(path: string): boolean {
  const name = basename(path);
  return TEXT_FILENAMES.has(name) || TEXT_EXTENSIONS.has(extname(name).toLowerCase());
}

export function renderDirectory(
  directory: string,
  variables: TemplateVariables
): void {
  if (!existsSync(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      renderDirectory(path, variables);
      continue;
    }

    if (!isTextTemplateFile(path)) {
      continue;
    }

    const content = readFileSync(path, "utf8");
    const rendered = renderTemplate(content, variables);

    if (rendered !== content) {
      writeFileSync(path, rendered);
    }
  }
}
