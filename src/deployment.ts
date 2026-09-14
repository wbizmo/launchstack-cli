import {
  existsSync,
  statSync
} from "node:fs";
import {
  isAbsolute,
  relative,
  resolve
} from "node:path";

export function resolveVerifiedOutputDirectory(
  projectDirectory: string,
  configuredOutputDirectory: string
): string {
  const projectRoot = resolve(projectDirectory);
  const outputPath = resolve(projectRoot, configuredOutputDirectory);
  const relativePath = relative(projectRoot, outputPath);

  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(
      "Configured output directory must stay inside the project directory."
    );
  }

  if (!existsSync(outputPath)) {
    throw new Error(
      `Output directory not found: ${configuredOutputDirectory}`
    );
  }

  if (!statSync(outputPath).isDirectory()) {
    throw new Error(
      `Configured output path is not a directory: ${configuredOutputDirectory}`
    );
  }

  return outputPath;
}
