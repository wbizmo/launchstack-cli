// src/generator/files.ts
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync
} from "fs";
import { basename, dirname, resolve } from "path";
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
function copyDirectory(sourceDirectory, destinationDirectory, overwriteRenamedFiles = false) {
  if (!existsSync(sourceDirectory)) {
    throw new Error(`Template directory not found: ${sourceDirectory}`);
  }
  mkdirSync(destinationDirectory, { recursive: true });
  cpSync(sourceDirectory, destinationDirectory, {
    recursive: true,
    force: true
  });
  renameTemplateFiles(destinationDirectory, overwriteRenamedFiles);
}
function renameTemplateFiles(directory, overwriteRenamedFiles) {
  for (const entry of readdirSync(directory)) {
    const currentPath = resolve(directory, entry);
    const stats = statSync(currentPath);
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
      const existingContent = readFileSync(replacementPath);
      const sourceContent = readFileSync(currentPath);
      if (!existingContent.equals(sourceContent)) {
        throw new Error(
          `Cannot rename template file because the destination exists: ${replacementPath}`
        );
      }
      unlinkSync(currentPath);
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
import { basename as basename2, extname, join } from "path";
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
  const name = basename2(path);
  return TEXT_FILENAMES.has(name) || TEXT_EXTENSIONS.has(extname(name).toLowerCase());
}
function renderDirectory(directory, variables) {
  if (!existsSync3(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }
  for (const entry of readdirSync2(directory)) {
    const path = join(directory, entry);
    const stats = statSync2(path);
    if (stats.isDirectory()) {
      renderDirectory(path, variables);
      continue;
    }
    if (!isTextTemplateFile(path)) {
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
import {
  cpSync as cpSync2,
  existsSync as existsSync5,
  mkdirSync as mkdirSync2,
  mkdtempSync,
  readdirSync as readdirSync3,
  renameSync as renameSync2,
  rmSync
} from "fs";
import {
  basename as basename3,
  dirname as dirname2,
  join as join3,
  resolve as resolve3
} from "path";
import { randomUUID } from "crypto";

// src/docker-assets.ts
import { existsSync as existsSync4, writeFileSync as writeFileSync2 } from "fs";
import { join as join2 } from "path";
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
  const hasLockfile = options.hasLockfile ?? existsSync4(join2(projectDirectory, "package-lock.json"));
  const prisma = options.prisma ?? existsSync4(join2(projectDirectory, "prisma", "schema.prisma"));
  writeFileSync2(
    join2(projectDirectory, "Dockerfile"),
    renderDockerfile({
      ...options,
      hasLockfile,
      prisma
    })
  );
  writeFileSync2(
    join2(projectDirectory, ".dockerignore"),
    renderDockerIgnore()
  );
}

// src/generator/generate.ts
function commitStagedProject(stagedDirectory, destinationDirectory, overwrite) {
  if (!existsSync5(destinationDirectory)) {
    renameSync2(stagedDirectory, destinationDirectory);
    return;
  }
  if (!overwrite) {
    if (readdirSync3(destinationDirectory).length === 0) {
      rmSync(destinationDirectory, {
        recursive: true,
        force: true
      });
      renameSync2(stagedDirectory, destinationDirectory);
      return;
    }
    throw new Error(`Destination already exists: ${destinationDirectory}`);
  }
  if (resolve3(destinationDirectory) === resolve3(process.cwd())) {
    throw new Error(
      "Refusing to replace the current working directory with --force. Choose a parent directory instead."
    );
  }
  const backupDirectory = join3(
    dirname2(destinationDirectory),
    `.${basename3(destinationDirectory)}.launchstack-backup-${randomUUID()}`
  );
  renameSync2(destinationDirectory, backupDirectory);
  try {
    renameSync2(stagedDirectory, destinationDirectory);
    rmSync(backupDirectory, {
      recursive: true,
      force: true
    });
  } catch (error) {
    if (existsSync5(destinationDirectory)) {
      rmSync(destinationDirectory, {
        recursive: true,
        force: true
      });
    }
    renameSync2(backupDirectory, destinationDirectory);
    throw error;
  }
}
function generateProject(options) {
  validateProjectName(options.projectName);
  const destinationDirectory = resolve3(options.destinationDirectory);
  const overwrite = options.overwrite ?? false;
  ensureDestinationAvailable(destinationDirectory, overwrite);
  const templateDirectory = getTemplateDirectory(options.template);
  const parentDirectory = dirname2(destinationDirectory);
  mkdirSync2(parentDirectory, { recursive: true });
  const stagedDirectory = mkdtempSync(
    join3(parentDirectory, `.${basename3(destinationDirectory)}.launchstack-stage-`)
  );
  try {
    if (overwrite && existsSync5(destinationDirectory)) {
      cpSync2(destinationDirectory, stagedDirectory, {
        recursive: true,
        force: true
      });
    }
    copyDirectory(
      templateDirectory,
      stagedDirectory,
      overwrite
    );
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
    if (existsSync5(stagedDirectory)) {
      rmSync(stagedDirectory, {
        recursive: true,
        force: true
      });
    }
    throw error;
  }
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
  renderDockerfile,
  renderDockerIgnore,
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
//# sourceMappingURL=chunk-7REMXOP6.mjs.map