import { existsSync } from "node:fs";
import { resolve } from "node:path";

function getRuntimeDirectory(): string {
  if (typeof __dirname === "string") {
    return __dirname;
  }

  return process.cwd();
}

export function getPackageRoot(): string {
  const runtimeDirectory = getRuntimeDirectory();

  const candidates = [
    process.cwd(),
    runtimeDirectory,
    resolve(runtimeDirectory, ".."),
    resolve(runtimeDirectory, "../.."),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "../..")
  ];

  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, "package.json"))) {
      return candidate;
    }
  }

  throw new Error("Could not locate the LaunchStack package root.");
}

export function getTemplateDirectory(templateName: string): string {
  const runtimeDirectory = getRuntimeDirectory();
  const packageRoot = getPackageRoot();

  const candidates = [
    resolve(runtimeDirectory, "templates", templateName),
    resolve(packageRoot, "dist", "templates", templateName),
    resolve(packageRoot, "src", "templates", templateName),
    resolve(packageRoot, "templates", templateName)
  ];

  const templateDirectory = candidates.find((candidate) =>
    existsSync(candidate)
  );

  if (!templateDirectory) {
    throw new Error(
      `Template "${templateName}" could not be found in the LaunchStack installation.`
    );
  }

  return templateDirectory;
}
