import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const RENAMED_TEMPLATE_FILES: Record<string, string> = {
  "_gitignore": ".gitignore",
  "_npmrc": ".npmrc",
  "_env": ".env",
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
      `Destination is not empty: ${destinationDirectory}. Use --force to overwrite it.`
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
    const currentPath = join(directory, entry);
    const stats = statSync(currentPath);

    if (stats.isDirectory()) {
      renameTemplateFiles(currentPath);
      continue;
    }

    const replacementName = RENAMED_TEMPLATE_FILES[basename(currentPath)];

    if (!replacementName) {
      continue;
    }

    const replacementPath = resolve(dirname(currentPath), replacementName);

    if (existsSync(replacementPath)) {
      const existingContent = readFileSync(replacementPath);
      const sourceContent = readFileSync(currentPath);

      if (!existingContent.equals(sourceContent)) {
        throw new Error(
          `Cannot rename template file because the destination exists: ${replacementPath}`
        );
      }

      continue;
    }

    renameSync(currentPath, replacementPath);
  }
}
