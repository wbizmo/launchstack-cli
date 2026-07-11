// src/generator/files.ts
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync
} from "fs";
import { basename, dirname, join, resolve } from "path";
var RENAMED_TEMPLATE_FILES = {
  "_gitignore": ".gitignore",
  "_dockerignore": ".dockerignore",
  "_npmrc": ".npmrc",
  "_env": ".env",
  "_env.example": ".env.example"
};
function ensureDestinationAvailable(destinationDirectory, overwrite = false) {
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
function copyDirectory(sourceDirectory, destinationDirectory) {
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
function renameTemplateFiles(directory) {
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

// src/generator/names.ts
var PROJECT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function validateProjectName(projectName) {
  if (!projectName.trim()) {
    throw new Error("Project name is required.");
  }
  if (!PROJECT_NAME_PATTERN.test(projectName)) {
    throw new Error(
      "Project name must use lowercase letters, numbers, and hyphens only."
    );
  }
}
function toDisplayName(projectName) {
  return projectName.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

// src/generator/paths.ts
import { existsSync as existsSync2 } from "fs";
import { resolve as resolve2 } from "path";
function getRuntimeDirectory() {
  if (typeof __dirname === "string") {
    return __dirname;
  }
  return process.cwd();
}
function getPackageRoot() {
  const runtimeDirectory = getRuntimeDirectory();
  const candidates = [
    process.cwd(),
    runtimeDirectory,
    resolve2(runtimeDirectory, ".."),
    resolve2(runtimeDirectory, "../.."),
    resolve2(process.cwd(), ".."),
    resolve2(process.cwd(), "../..")
  ];
  for (const candidate of candidates) {
    if (existsSync2(resolve2(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error("Could not locate the LaunchStack package root.");
}
function getTemplateDirectory(templateName) {
  const runtimeDirectory = getRuntimeDirectory();
  const packageRoot = getPackageRoot();
  const candidates = [
    resolve2(runtimeDirectory, "templates", templateName),
    resolve2(packageRoot, "dist", "templates", templateName),
    resolve2(packageRoot, "src", "templates", templateName),
    resolve2(packageRoot, "templates", templateName)
  ];
  const templateDirectory = candidates.find(
    (candidate) => existsSync2(candidate)
  );
  if (!templateDirectory) {
    throw new Error(
      `Template "${templateName}" could not be found in the LaunchStack installation.`
    );
  }
  return templateDirectory;
}

// src/generator/template.ts
import {
  existsSync as existsSync3,
  readFileSync as readFileSync2,
  readdirSync as readdirSync2,
  statSync as statSync2,
  writeFileSync
} from "fs";
import { join as join2 } from "path";
function renderTemplate(content, variables) {
  return Object.entries(variables).reduce(
    (rendered, [key, value]) => rendered.split(`{{${key}}}`).join(value),
    content
  );
}
function renderDirectory(directory, variables) {
  if (!existsSync3(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }
  for (const entry of readdirSync2(directory)) {
    const path = join2(directory, entry);
    const stats = statSync2(path);
    if (stats.isDirectory()) {
      renderDirectory(path, variables);
      continue;
    }
    const content = readFileSync2(path, "utf8");
    const rendered = renderTemplate(content, variables);
    if (rendered !== content) {
      writeFileSync(path, rendered);
    }
  }
}

// src/generator/generate.ts
import { resolve as resolve3 } from "path";
function generateProject(options) {
  validateProjectName(options.projectName);
  const destinationDirectory = resolve3(options.destinationDirectory);
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

// src/generator/install.ts
import { execFileSync } from "child_process";
function installDependencies(projectDirectory) {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(npmExecutable, ["install"], {
    cwd: projectDirectory,
    stdio: "inherit"
  });
}

export {
  ensureDestinationAvailable,
  copyDirectory,
  validateProjectName,
  toDisplayName,
  getPackageRoot,
  getTemplateDirectory,
  renderTemplate,
  renderDirectory,
  generateProject,
  installDependencies
};
