"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  LaunchStackClient: () => LaunchStackClient,
  LaunchStackError: () => LaunchStackError,
  copyDirectory: () => copyDirectory,
  ensureDestinationAvailable: () => ensureDestinationAvailable,
  generateProject: () => generateProject,
  getPackageRoot: () => getPackageRoot,
  getTemplateDirectory: () => getTemplateDirectory,
  installDependencies: () => installDependencies,
  renderDirectory: () => renderDirectory,
  renderTemplate: () => renderTemplate,
  toDisplayName: () => toDisplayName,
  validateProjectName: () => validateProjectName
});
module.exports = __toCommonJS(index_exports);

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
var import_node_path4 = require("path");

// src/generator/files.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
var RENAMED_TEMPLATE_FILES = {
  "_gitignore": ".gitignore",
  "_dockerignore": ".dockerignore",
  "_npmrc": ".npmrc",
  "_env": ".env",
  "_env.example": ".env.example"
};
function ensureDestinationAvailable(destinationDirectory, overwrite = false) {
  if (!(0, import_node_fs.existsSync)(destinationDirectory)) {
    return;
  }
  const contents = (0, import_node_fs.readdirSync)(destinationDirectory);
  if (contents.length > 0 && !overwrite) {
    throw new Error(
      `Destination is not empty: ${destinationDirectory}. Use --force to overwrite it.`
    );
  }
}
function copyDirectory(sourceDirectory, destinationDirectory) {
  if (!(0, import_node_fs.existsSync)(sourceDirectory)) {
    throw new Error(`Template directory not found: ${sourceDirectory}`);
  }
  (0, import_node_fs.mkdirSync)(destinationDirectory, { recursive: true });
  (0, import_node_fs.cpSync)(sourceDirectory, destinationDirectory, {
    recursive: true,
    force: true
  });
  renameTemplateFiles(destinationDirectory);
}
function renameTemplateFiles(directory) {
  for (const entry of (0, import_node_fs.readdirSync)(directory)) {
    const currentPath = (0, import_node_path.join)(directory, entry);
    const stats = (0, import_node_fs.statSync)(currentPath);
    if (stats.isDirectory()) {
      renameTemplateFiles(currentPath);
      continue;
    }
    const replacementName = RENAMED_TEMPLATE_FILES[(0, import_node_path.basename)(currentPath)];
    if (!replacementName) {
      continue;
    }
    const replacementPath = (0, import_node_path.resolve)((0, import_node_path.dirname)(currentPath), replacementName);
    if ((0, import_node_fs.existsSync)(replacementPath)) {
      const existingContent = (0, import_node_fs.readFileSync)(replacementPath);
      const sourceContent = (0, import_node_fs.readFileSync)(currentPath);
      if (!existingContent.equals(sourceContent)) {
        throw new Error(
          `Cannot rename template file because the destination exists: ${replacementPath}`
        );
      }
      continue;
    }
    (0, import_node_fs.renameSync)(currentPath, replacementPath);
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
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");
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
    (0, import_node_path2.resolve)(runtimeDirectory, ".."),
    (0, import_node_path2.resolve)(runtimeDirectory, "../.."),
    (0, import_node_path2.resolve)(process.cwd(), ".."),
    (0, import_node_path2.resolve)(process.cwd(), "../..")
  ];
  for (const candidate of candidates) {
    if ((0, import_node_fs2.existsSync)((0, import_node_path2.resolve)(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error("Could not locate the LaunchStack package root.");
}
function getTemplateDirectory(templateName) {
  const runtimeDirectory = getRuntimeDirectory();
  const packageRoot = getPackageRoot();
  const candidates = [
    (0, import_node_path2.resolve)(runtimeDirectory, "templates", templateName),
    (0, import_node_path2.resolve)(packageRoot, "dist", "templates", templateName),
    (0, import_node_path2.resolve)(packageRoot, "src", "templates", templateName),
    (0, import_node_path2.resolve)(packageRoot, "templates", templateName)
  ];
  const templateDirectory = candidates.find(
    (candidate) => (0, import_node_fs2.existsSync)(candidate)
  );
  if (!templateDirectory) {
    throw new Error(
      `Template "${templateName}" could not be found in the LaunchStack installation.`
    );
  }
  return templateDirectory;
}

// src/generator/template.ts
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");
function renderTemplate(content, variables) {
  return Object.entries(variables).reduce(
    (rendered, [key, value]) => rendered.split(`{{${key}}}`).join(value),
    content
  );
}
function renderDirectory(directory, variables) {
  if (!(0, import_node_fs3.existsSync)(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }
  for (const entry of (0, import_node_fs3.readdirSync)(directory)) {
    const path = (0, import_node_path3.join)(directory, entry);
    const stats = (0, import_node_fs3.statSync)(path);
    if (stats.isDirectory()) {
      renderDirectory(path, variables);
      continue;
    }
    const content = (0, import_node_fs3.readFileSync)(path, "utf8");
    const rendered = renderTemplate(content, variables);
    if (rendered !== content) {
      (0, import_node_fs3.writeFileSync)(path, rendered);
    }
  }
}

// src/generator/generate.ts
function generateProject(options) {
  validateProjectName(options.projectName);
  const destinationDirectory = (0, import_node_path4.resolve)(options.destinationDirectory);
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
var import_node_child_process = require("child_process");
function installDependencies(projectDirectory) {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  (0, import_node_child_process.execFileSync)(npmExecutable, ["install"], {
    cwd: projectDirectory,
    stdio: "inherit"
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LaunchStackClient,
  LaunchStackError,
  copyDirectory,
  ensureDestinationAvailable,
  generateProject,
  getPackageRoot,
  getTemplateDirectory,
  installDependencies,
  renderDirectory,
  renderTemplate,
  toDisplayName,
  validateProjectName
});
