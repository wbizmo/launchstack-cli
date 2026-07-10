import { resolve } from "node:path";
import { copyDirectory, ensureDestinationAvailable } from "./files";
import { toDisplayName, validateProjectName } from "./names";
import { getTemplateDirectory } from "./paths";
import { renderDirectory } from "./template";
import type { GenerateProjectOptions } from "./types";

export function generateProject(options: GenerateProjectOptions): string {
  validateProjectName(options.projectName);

  const destinationDirectory = resolve(options.destinationDirectory);

  ensureDestinationAvailable(
    destinationDirectory,
    options.overwrite ?? false
  );

  const templateDirectory = getTemplateDirectory(options.template);

  copyDirectory(templateDirectory, destinationDirectory);

  renderDirectory(destinationDirectory, {
    PROJECT_NAME: options.projectName,
    PROJECT_DISPLAY_NAME: toDisplayName(options.projectName)
  });

  return destinationDirectory;
}
