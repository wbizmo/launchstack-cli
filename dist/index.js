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
function validateBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new LaunchStackError("LaunchStack base URL must be a valid absolute URL.");
  }
  if (url.username || url.password) {
    throw new LaunchStackError("LaunchStack base URL must not contain embedded credentials.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new LaunchStackError("LaunchStack API endpoints must use HTTPS. Plain HTTP is allowed only for loopback development endpoints.");
  }
  url.hash = "";
  url.search = "";
  return url;
}
var LaunchStackClient = class {
  constructor(config) {
    if (!config.apiKey) {
      throw new LaunchStackError("LaunchStack API key is required.");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = validateBaseUrl(config.baseUrl ?? "https://api.launchstack.dev/v1");
  }
  async request(path, options = {}) {
    const normalizedBase = this.baseUrl.toString().endsWith("/") ? this.baseUrl.toString() : `${this.baseUrl.toString()}/`;
    const relativePath = path.replace(/^\/+/, "");
    const target = new URL(relativePath, normalizedBase);
    if (target.origin !== this.baseUrl.origin) {
      throw new LaunchStackError("Refusing to send LaunchStack credentials to a different origin.");
    }
    const response = await fetch(target, {
      ...options,
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers
      }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      throw new LaunchStackError("LaunchStack API redirects are refused to prevent credential forwarding across origins.", response.status);
    }
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
    return this.request(`/launches/${encodeURIComponent(id)}`);
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
var import_node_fs5 = require("fs");
var import_node_path5 = require("path");
var import_node_crypto = require("crypto");

// src/docker-assets.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
function packageInstallCommand(hasLockfile, productionOnly = false) {
  if (hasLockfile) {
    return productionOnly ? "npm ci --omit=dev" : "npm ci";
  }
  return productionOnly ? "npm install --omit=dev" : "npm install";
}
function dockerJsonCommand(command) {
  return JSON.stringify(command);
}
function renderDockerfile(options) {
  const install = packageInstallCommand(options.hasLockfile);
  const productionInstall = packageInstallCommand(options.hasLockfile, true);
  const startCommand = options.startCommand ?? ["npm", "start"];
  const port = options.port ?? 3e3;
  const packageFiles = options.hasLockfile ? "COPY package.json package-lock.json ./" : "COPY package.json ./";
  const prismaCopy = options.prisma ? "COPY prisma ./prisma\n" : "";
  const prismaRuntimeCopy = options.prisma ? "COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma\nCOPY --from=build /app/node_modules/@prisma ./node_modules/@prisma\n" : "";
  return `FROM node:20-alpine AS dependencies

WORKDIR /app

${packageFiles}
${prismaCopy}
RUN ${install}

FROM node:20-alpine AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN ${options.buildCommand}

FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

${packageFiles}
${prismaCopy}
RUN ${productionInstall} && npm cache clean --force

COPY --from=build /app/${options.outputDirectory} ./${options.outputDirectory}
${prismaRuntimeCopy}
USER node

EXPOSE ${port}

CMD ${dockerJsonCommand(startCommand)}
`;
}
function renderDockerIgnore() {
  return `node_modules
dist
coverage
.git
.github
.env
.env.*
!.env.example
.launchstack
*.log
npm-debug.log*
docker-compose*.yml
`;
}
function writeCanonicalDockerAssets(projectDirectory, options) {
  const hasLockfile = options.hasLockfile ?? (0, import_node_fs.existsSync)((0, import_node_path.join)(projectDirectory, "package-lock.json"));
  const prisma = options.prisma ?? (0, import_node_fs.existsSync)((0, import_node_path.join)(projectDirectory, "prisma", "schema.prisma"));
  (0, import_node_fs.writeFileSync)(
    (0, import_node_path.join)(projectDirectory, "Dockerfile"),
    renderDockerfile({
      ...options,
      hasLockfile,
      prisma
    })
  );
  (0, import_node_fs.writeFileSync)(
    (0, import_node_path.join)(projectDirectory, ".dockerignore"),
    renderDockerIgnore()
  );
}

// src/generator/files.ts
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");
var RENAMED_TEMPLATE_FILES = {
  "_gitignore": ".gitignore",
  "_dockerignore": ".dockerignore",
  "_npmrc": ".npmrc",
  "_env": ".env",
  "_env.example": ".env.example"
};
function ensureDestinationAvailable(destinationDirectory, overwrite = false) {
  if (!(0, import_node_fs2.existsSync)(destinationDirectory)) {
    return;
  }
  const contents = (0, import_node_fs2.readdirSync)(destinationDirectory);
  if (contents.length > 0 && !overwrite) {
    throw new Error(
      `Destination is not empty: ${destinationDirectory}. Use --force to overwrite it.`
    );
  }
}
function copyDirectory(sourceDirectory, destinationDirectory) {
  if (!(0, import_node_fs2.existsSync)(sourceDirectory)) {
    throw new Error(`Template directory not found: ${sourceDirectory}`);
  }
  (0, import_node_fs2.mkdirSync)(destinationDirectory, { recursive: true });
  (0, import_node_fs2.cpSync)(sourceDirectory, destinationDirectory, {
    recursive: true,
    force: true
  });
  renameTemplateFiles(destinationDirectory);
}
function renameTemplateFiles(directory) {
  for (const entry of (0, import_node_fs2.readdirSync)(directory)) {
    const currentPath = (0, import_node_path2.resolve)(directory, entry);
    const stats = (0, import_node_fs2.statSync)(currentPath);
    if (stats.isDirectory()) {
      renameTemplateFiles(currentPath);
      continue;
    }
    const replacementName = RENAMED_TEMPLATE_FILES[(0, import_node_path2.basename)(currentPath)];
    if (!replacementName) {
      continue;
    }
    const replacementPath = (0, import_node_path2.resolve)((0, import_node_path2.dirname)(currentPath), replacementName);
    if ((0, import_node_fs2.existsSync)(replacementPath)) {
      const existingContent = (0, import_node_fs2.readFileSync)(replacementPath);
      const sourceContent = (0, import_node_fs2.readFileSync)(currentPath);
      if (!existingContent.equals(sourceContent)) {
        throw new Error(
          `Cannot rename template file because the destination exists: ${replacementPath}`
        );
      }
      (0, import_node_fs2.unlinkSync)(currentPath);
      continue;
    }
    (0, import_node_fs2.renameSync)(currentPath, replacementPath);
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
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");
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
    (0, import_node_path3.resolve)(runtimeDirectory, ".."),
    (0, import_node_path3.resolve)(runtimeDirectory, "../.."),
    (0, import_node_path3.resolve)(process.cwd(), ".."),
    (0, import_node_path3.resolve)(process.cwd(), "../..")
  ];
  for (const candidate of candidates) {
    if ((0, import_node_fs3.existsSync)((0, import_node_path3.resolve)(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error("Could not locate the LaunchStack package root.");
}
function getTemplateDirectory(templateName) {
  const runtimeDirectory = getRuntimeDirectory();
  const packageRoot = getPackageRoot();
  const candidates = [
    (0, import_node_path3.resolve)(runtimeDirectory, "templates", templateName),
    (0, import_node_path3.resolve)(packageRoot, "dist", "templates", templateName),
    (0, import_node_path3.resolve)(packageRoot, "src", "templates", templateName),
    (0, import_node_path3.resolve)(packageRoot, "templates", templateName)
  ];
  const templateDirectory = candidates.find(
    (candidate) => (0, import_node_fs3.existsSync)(candidate)
  );
  if (!templateDirectory) {
    throw new Error(
      `Template "${templateName}" could not be found in the LaunchStack installation.`
    );
  }
  return templateDirectory;
}

// src/generator/template.ts
var import_node_fs4 = require("fs");
var import_node_path4 = require("path");
var TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
  ".cjs",
  ".css",
  ".example",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);
var TEXT_FILENAMES = /* @__PURE__ */ new Set([
  ".dockerignore",
  ".env",
  ".env.example",
  ".gitignore",
  ".npmrc",
  "Dockerfile",
  "LICENSE"
]);
function renderTemplate(content, variables) {
  return content.replace(
    /{{([A-Z0-9_]+)}}/g,
    (token, key) => Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] ?? token : token
  );
}
function isTextTemplateFile(path) {
  const name = (0, import_node_path4.basename)(path);
  return TEXT_FILENAMES.has(name) || TEXT_EXTENSIONS.has((0, import_node_path4.extname)(name).toLowerCase());
}
function renderDirectory(directory, variables) {
  if (!(0, import_node_fs4.existsSync)(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }
  for (const entry of (0, import_node_fs4.readdirSync)(directory)) {
    const path = (0, import_node_path4.join)(directory, entry);
    const stats = (0, import_node_fs4.statSync)(path);
    if (stats.isDirectory()) {
      renderDirectory(path, variables);
      continue;
    }
    if (!isTextTemplateFile(path)) {
      continue;
    }
    const content = (0, import_node_fs4.readFileSync)(path, "utf8");
    const rendered = renderTemplate(content, variables);
    if (rendered !== content) {
      (0, import_node_fs4.writeFileSync)(path, rendered);
    }
  }
}

// src/generator/generate.ts
function commitStagedProject(stagedDirectory, destinationDirectory, overwrite) {
  if (!(0, import_node_fs5.existsSync)(destinationDirectory)) {
    (0, import_node_fs5.renameSync)(stagedDirectory, destinationDirectory);
    return;
  }
  if (!overwrite) {
    throw new Error(`Destination already exists: ${destinationDirectory}`);
  }
  if ((0, import_node_path5.resolve)(destinationDirectory) === (0, import_node_path5.resolve)(process.cwd())) {
    throw new Error(
      "Refusing to replace the current working directory with --force. Choose a parent directory instead."
    );
  }
  const backupDirectory = (0, import_node_path5.join)(
    (0, import_node_path5.dirname)(destinationDirectory),
    `.${(0, import_node_path5.basename)(destinationDirectory)}.launchstack-backup-${(0, import_node_crypto.randomUUID)()}`
  );
  (0, import_node_fs5.renameSync)(destinationDirectory, backupDirectory);
  try {
    (0, import_node_fs5.renameSync)(stagedDirectory, destinationDirectory);
    (0, import_node_fs5.rmSync)(backupDirectory, {
      recursive: true,
      force: true
    });
  } catch (error) {
    if ((0, import_node_fs5.existsSync)(destinationDirectory)) {
      (0, import_node_fs5.rmSync)(destinationDirectory, {
        recursive: true,
        force: true
      });
    }
    (0, import_node_fs5.renameSync)(backupDirectory, destinationDirectory);
    throw error;
  }
}
function generateProject(options) {
  validateProjectName(options.projectName);
  const destinationDirectory = (0, import_node_path5.resolve)(options.destinationDirectory);
  const overwrite = options.overwrite ?? false;
  ensureDestinationAvailable(destinationDirectory, overwrite);
  const templateDirectory = getTemplateDirectory(options.template);
  const parentDirectory = (0, import_node_path5.dirname)(destinationDirectory);
  (0, import_node_fs5.mkdirSync)(parentDirectory, { recursive: true });
  const stagedDirectory = (0, import_node_fs5.mkdtempSync)(
    (0, import_node_path5.join)(parentDirectory, `.${(0, import_node_path5.basename)(destinationDirectory)}.launchstack-stage-`)
  );
  try {
    if (overwrite && (0, import_node_fs5.existsSync)(destinationDirectory)) {
      (0, import_node_fs5.cpSync)(destinationDirectory, stagedDirectory, {
        recursive: true,
        force: true
      });
    }
    copyDirectory(templateDirectory, stagedDirectory);
    renderDirectory(stagedDirectory, {
      PROJECT_NAME: options.projectName,
      PROJECT_DISPLAY_NAME: toDisplayName(options.projectName)
    });
    if (options.template === "api") {
      writeCanonicalDockerAssets(stagedDirectory, {
        buildCommand: "npm run build",
        outputDirectory: "dist",
        hasLockfile: true,
        prisma: true,
        startCommand: ["node", "dist/server.js"],
        port: 3e3
      });
    }
    commitStagedProject(
      stagedDirectory,
      destinationDirectory,
      overwrite
    );
  } catch (error) {
    if ((0, import_node_fs5.existsSync)(stagedDirectory)) {
      (0, import_node_fs5.rmSync)(stagedDirectory, {
        recursive: true,
        force: true
      });
    }
    throw error;
  }
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
//# sourceMappingURL=index.js.map