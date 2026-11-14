import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { readRegularFileNoFollow } from "../storage";

const RENAMED_TEMPLATE_FILES: Record<string, string> = {
  _gitignore: ".gitignore",
  _dockerignore: ".dockerignore",
  _npmrc: ".npmrc",
  _env: ".env",
  "_env.example": ".env.example",
};

export function ensureDestinationAvailable(
  destinationDirectory: string,
  overwrite = false,
): void {
  if (!existsSync(destinationDirectory)) {
    return;
  }

  const contents = readdirSync(destinationDirectory);

  if (contents.length > 0 && !overwrite) {
    throw new Error(
      `Destination is not empty: ${destinationDirectory}. Use --force to overwrite it.`,
    );
  }
}

export function copyDirectory(
  sourceDirectory: string,
  destinationDirectory: string,
  overwriteRenamedFiles = false,
): void {
  if (!existsSync(sourceDirectory)) {
    throw new Error(`Template directory not found: ${sourceDirectory}`);
  }

  rejectTemplateLinks(sourceDirectory);

  mkdirSync(destinationDirectory, { recursive: true });

  cpSync(sourceDirectory, destinationDirectory, {
    recursive: true,
    force: true,
  });

  renameTemplateFiles(destinationDirectory, overwriteRenamedFiles);
}

function rejectTemplateLinks(directory: string): void {
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    const stats = lstatSync(path);
    if (stats.isSymbolicLink())
      throw new Error(
        `Template contains an unsupported symbolic link: ${path}`,
      );
    if (stats.isDirectory()) rejectTemplateLinks(path);
  }
}

function renameTemplateFiles(
  directory: string,
  overwriteRenamedFiles: boolean,
): void {
  for (const entry of readdirSync(directory)) {
    const currentPath = resolve(directory, entry);
    const stats = lstatSync(currentPath);

    // The destination may include user-owned content copied for --force.
    // Template links are rejected from sourceDirectory before copying.
    if (stats.isSymbolicLink()) continue;

    if (stats.isDirectory()) {
      renameTemplateFiles(currentPath, overwriteRenamedFiles);
      continue;
    }

    const replacementName = RENAMED_TEMPLATE_FILES[basename(currentPath)];

    if (!replacementName) {
      continue;
    }

    const replacementPath = resolve(dirname(currentPath), replacementName);

    if (existsSync(replacementPath)) {
      if (overwriteRenamedFiles) {
        unlinkSync(replacementPath);
        renameSync(currentPath, replacementPath);
        continue;
      }

      const existingContent = Buffer.from(
        readRegularFileNoFollow(replacementPath, 10_000_000).content,
      );
      const sourceContent = Buffer.from(
        readRegularFileNoFollow(currentPath, 10_000_000).content,
      );

      if (!existingContent.equals(sourceContent)) {
        throw new Error(
          `Cannot rename template file because the destination exists: ${replacementPath}`,
        );
      }

      unlinkSync(currentPath);
      continue;
    }

    renameSync(currentPath, replacementPath);
  }
}
