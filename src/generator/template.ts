import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";

export type TemplateVariables = Record<string, string>;

export function renderTemplate(
  content: string,
  variables: TemplateVariables
): string {
  return Object.entries(variables).reduce(
    (rendered, [key, value]) =>
      rendered.split(`{{${key}}}`).join(value),
    content
  );
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

    const content = readFileSync(path, "utf8");
    const rendered = renderTemplate(content, variables);

    if (rendered !== content) {
      writeFileSync(path, rendered);
    }
  }
}
