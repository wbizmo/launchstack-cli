import {
  __require
} from "./chunk-Y6FXYEAI.mjs";

// src/errors.ts
var LaunchStackError = class extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "LaunchStackError";
    this.status = status;
    this.details = details;
  }
};

// src/client.ts
var LaunchStackClient = class {
  constructor(config) {
    if (!config.apiKey) {
      throw new LaunchStackError("LaunchStack API key is required.");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.launchstack.dev/v1";
  }
  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers
      }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new LaunchStackError(
        data?.message || "LaunchStack request failed.",
        response.status,
        data
      );
    }
    return data;
  }
  listLaunches() {
    return this.request("/launches");
  }
  getLaunch(id) {
    return this.request(`/launches/${id}`);
  }
  createLaunch(input) {
    return this.request("/launches", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  listDeployments() {
    return this.request("/deployments");
  }
  createDeployment(input) {
    return this.request("/deployments", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  listChangelog() {
    return this.request("/changelog");
  }
  createChangelog(input) {
    return this.request("/changelog", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};

// src/generator/generate.ts
import { resolve as resolve3 } from "path";

// src/generator/files.ts
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "fs";
import { basename, join, resolve } from "path";
var RENAMED_TEMPLATE_FILES = {
  "_gitignore": ".gitignore",
  "_npmrc": ".npmrc",
  "_env.example": ".env.example"
};
function ensureDestinationAvailable(destinationDirectory, overwrite = false) {
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
    const { unlinkSync } = __require("fs");
    unlinkSync(path);
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
function findPackageRoot() {
  const candidates = [
    process.cwd(),
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
function getPackageRoot() {
  return findPackageRoot();
}
function getTemplateDirectory(templateName) {
  const packageRoot = getPackageRoot();
  const candidates = [
    resolve2(packageRoot, "src", "templates", templateName),
    resolve2(packageRoot, "dist", "templates", templateName),
    resolve2(packageRoot, "templates", templateName)
  ];
  const templateDirectory = candidates.find(
    (candidate) => existsSync2(candidate)
  );
  if (!templateDirectory) {
    throw new Error(`Template directory not found: ${templateName}`);
  }
  return templateDirectory;
}

// src/generator/template.ts
import {
  existsSync as existsSync3,
  readFileSync as readFileSync2,
  readdirSync as readdirSync2,
  statSync as statSync2,
  writeFileSync as writeFileSync2
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
      writeFileSync2(path, rendered);
    }
  }
}

// src/generator/generate.ts
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
export {
  LaunchStackClient,
  LaunchStackError,
  copyDirectory,
  ensureDestinationAvailable,
  generateProject,
  renderDirectory,
  renderTemplate,
  toDisplayName,
  validateProjectName
};
