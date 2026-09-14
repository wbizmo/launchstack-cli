import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync
} from "node:fs";
import {
  basename,
  dirname,
  join,
  resolve
} from "node:path";
import { randomUUID } from "node:crypto";
import { copyDirectory, ensureDestinationAvailable } from "./files";
import { toDisplayName, validateProjectName } from "./names";
import { getTemplateDirectory } from "./paths";
import { renderDirectory } from "./template";
import type { GenerateProjectOptions } from "./types";

function commitStagedProject(
  stagedDirectory: string,
  destinationDirectory: string,
  overwrite: boolean
): void {
  if (!existsSync(destinationDirectory)) {
    renameSync(stagedDirectory, destinationDirectory);
    return;
  }

  if (!overwrite) {
    throw new Error(`Destination already exists: ${destinationDirectory}`);
  }

  if (resolve(destinationDirectory) === resolve(process.cwd())) {
    throw new Error(
      "Refusing to replace the current working directory with --force. Choose a parent directory instead."
    );
  }

  const backupDirectory = join(
    dirname(destinationDirectory),
    `.${basename(destinationDirectory)}.launchstack-backup-${randomUUID()}`
  );

  renameSync(destinationDirectory, backupDirectory);

  try {
    renameSync(stagedDirectory, destinationDirectory);
    rmSync(backupDirectory, {
      recursive: true,
      force: true
    });
  } catch (error) {
    if (existsSync(destinationDirectory)) {
      rmSync(destinationDirectory, {
        recursive: true,
        force: true
      });
    }

    renameSync(backupDirectory, destinationDirectory);
    throw error;
  }
}

export function generateProject(options: GenerateProjectOptions): string {
  validateProjectName(options.projectName);

  const destinationDirectory = resolve(options.destinationDirectory);
  const overwrite = options.overwrite ?? false;

  ensureDestinationAvailable(destinationDirectory, overwrite);

  const templateDirectory = getTemplateDirectory(options.template);
  const parentDirectory = dirname(destinationDirectory);
  mkdirSync(parentDirectory, { recursive: true });

  const stagedDirectory = mkdtempSync(
    join(parentDirectory, `.${basename(destinationDirectory)}.launchstack-stage-`)
  );

  try {
    copyDirectory(templateDirectory, stagedDirectory);

    renderDirectory(stagedDirectory, {
      PROJECT_NAME: options.projectName,
      PROJECT_DISPLAY_NAME: toDisplayName(options.projectName)
    });

    commitStagedProject(
      stagedDirectory,
      destinationDirectory,
      overwrite
    );
  } catch (error) {
    if (existsSync(stagedDirectory)) {
      rmSync(stagedDirectory, {
        recursive: true,
        force: true
      });
    }

    throw error;
  }

  return destinationDirectory;
}
