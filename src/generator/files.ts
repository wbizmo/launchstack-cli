import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, join, resolve } from "node:path";

const RENAMED_TEMPLATE_FILES: Record<string, string> = {
  "_gitignore": ".gitignore",
  "_npmrc": ".npmrc",
  "_env.example": ".env.example"
};

export function ensureDestinationAvailable(
  destinationDirectory: string,
  overwrite = false
): void {
  if (!existsSync(destinationDirectory)) {
    return;
  }

  const contents = readdirSync(destinationDirectory);

  if (contents.length > 0 && !overwrite) {
    throw new Error(
      `Destination is not empty: ${destinationDirectory}. Use overwrite to continue.`
    );
  }
}

export function copyDirectory(
  sourceDirectory: string,
  destinationDirectory: string
): void {
  if (!existsSync(sourceDirectory)) {
    throw new Error(`Template directory not found: ${sourceDirectory}`);
  }

  mkdirSync(destinationDirectory, { recursive: true });

  cpSync(sourceDirectory, destinationDirectory, {
    recursive: true,
    force: true
  });

  renameTemplateFiles(destinationDirectory);
}

function renameTemplateFiles(directory: string): void {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      renameTemplateFiles(path);
      continue;
    }

    const replacementName = RENAMED_TEMPLATE_FILES[basename(path)];

    if (!replacementName) {
      continue;
    }

    const content = readFileSync(path);
    const replacementPath = resolve(directory, replacementName);

    writeFileSync(replacementPath, content);

    const { unlinkSync } = require("node:fs") as typeof import("node:fs");
    unlinkSync(path);
  }
}
