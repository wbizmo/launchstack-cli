import { existsSync } from "node:fs";
import { resolve } from "node:path";

function findPackageRoot(): string {
  const candidates = [
    process.cwd(),
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

export function getPackageRoot(): string {
  return findPackageRoot();
}

export function getTemplateDirectory(templateName: string): string {
  const packageRoot = getPackageRoot();

  const candidates = [
    resolve(packageRoot, "src", "templates", templateName),
    resolve(packageRoot, "dist", "templates", templateName),
    resolve(packageRoot, "templates", templateName)
  ];

  const templateDirectory = candidates.find((candidate) =>
    existsSync(candidate)
  );

  if (!templateDirectory) {
    throw new Error(`Template directory not found: ${templateName}`);
  }

  return templateDirectory;
}
