#!/usr/bin/env node
"use strict";

// src/cli.ts
var import_commander14 = require("commander");

// src/commands/create.ts
var import_node_fs6 = require("fs");
var import_node_path6 = require("path");
var import_commander = require("commander");

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
function copyDirectory(sourceDirectory, destinationDirectory, overwriteRenamedFiles = false) {
  if (!(0, import_node_fs2.existsSync)(sourceDirectory)) {
    throw new Error(`Template directory not found: ${sourceDirectory}`);
  }
  (0, import_node_fs2.mkdirSync)(destinationDirectory, { recursive: true });
  (0, import_node_fs2.cpSync)(sourceDirectory, destinationDirectory, {
    recursive: true,
    force: true
  });
  renameTemplateFiles(destinationDirectory, overwriteRenamedFiles);
}
function renameTemplateFiles(directory, overwriteRenamedFiles) {
  for (const entry of (0, import_node_fs2.readdirSync)(directory)) {
    const currentPath = (0, import_node_path2.resolve)(directory, entry);
    const stats = (0, import_node_fs2.statSync)(currentPath);
    if (stats.isDirectory()) {
      renameTemplateFiles(currentPath, overwriteRenamedFiles);
      continue;
    }
    const replacementName = RENAMED_TEMPLATE_FILES[(0, import_node_path2.basename)(currentPath)];
    if (!replacementName) {
      continue;
    }
    const replacementPath = (0, import_node_path2.resolve)((0, import_node_path2.dirname)(currentPath), replacementName);
    if ((0, import_node_fs2.existsSync)(replacementPath)) {
      if (overwriteRenamedFiles) {
        (0, import_node_fs2.unlinkSync)(replacementPath);
        (0, import_node_fs2.renameSync)(currentPath, replacementPath);
        continue;
      }
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
    if ((0, import_node_fs5.readdirSync)(destinationDirectory).length === 0) {
      (0, import_node_fs5.rmSync)(destinationDirectory, {
        recursive: true,
        force: true
      });
      (0, import_node_fs5.renameSync)(stagedDirectory, destinationDirectory);
      return;
    }
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

// src/commands/create.ts
var createCommand = new import_commander.Command("create").description("Create a new backend API project").argument("<project-name>", "Name of the project to create").option(
  "-d, --directory <path>",
  "Directory where the project should be created"
).option("-f, --force", "Allow replacing a non-empty destination after staging succeeds").option("--no-install", "Skip dependency installation").action((projectName, options) => {
  try {
    const destinationDirectory = options.directory ? (0, import_node_path6.resolve)(options.directory) : (0, import_node_path6.resolve)(process.cwd(), projectName);
    const destinationAlreadyExists = (0, import_node_fs6.existsSync)(destinationDirectory);
    console.log(`Creating ${projectName}...`);
    const generatedDirectory = generateProject({
      projectName,
      destinationDirectory,
      template: "api",
      overwrite: options.force ?? false
    });
    console.log(`Project files created in ${generatedDirectory}`);
    if (options.install) {
      console.log("Installing dependencies...");
      installDependencies(generatedDirectory);
      console.log("Dependencies installed");
    }
    console.log("");
    console.log("Project created successfully");
    console.log("");
    console.log("Next steps:");
    if (!destinationAlreadyExists || destinationDirectory !== process.cwd()) {
      const relativeDestination = (0, import_node_path6.relative)(process.cwd(), destinationDirectory) || ".";
      console.log(`  cd ${relativeDestination}`);
    }
    if (!options.install) {
      console.log("  npm install");
    }
    console.log("  npm run dev");
  } catch (error) {
    console.error("Project creation failed");
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exitCode = 1;
  }
});

// src/commands/doctor.ts
var import_commander2 = require("commander");

// src/release/doctor.ts
var import_node_fs7 = require("fs");
var import_node_path7 = require("path");
function checkFile(projectDirectory, file, label) {
  const path = (0, import_node_path7.resolve)(projectDirectory, file);
  const passed = (0, import_node_fs7.existsSync)(path);
  return {
    name: label,
    passed,
    detail: passed ? `${file} found` : `${file} is missing`
  };
}
function checkPackageScripts(projectDirectory) {
  const packagePath = (0, import_node_path7.resolve)(
    projectDirectory,
    "package.json"
  );
  if (!(0, import_node_fs7.existsSync)(packagePath)) {
    return {
      name: "Package scripts",
      passed: false,
      detail: "package.json is missing"
    };
  }
  const packageJson = JSON.parse(
    (0, import_node_fs7.readFileSync)(packagePath, "utf8")
  );
  const requiredScripts = [
    "dev",
    "build",
    "start",
    "test",
    "typecheck",
    "prisma:generate",
    "prisma:migrate",
    "prisma:deploy"
  ];
  const missingScripts = requiredScripts.filter(
    (script) => !packageJson.scripts?.[script]
  );
  return {
    name: "Package scripts",
    passed: missingScripts.length === 0,
    detail: missingScripts.length === 0 ? "Required scripts are present" : `Missing scripts: ${missingScripts.join(", ")}`
  };
}
function checkEnvironmentExample(projectDirectory) {
  const path = (0, import_node_path7.resolve)(
    projectDirectory,
    ".env.example"
  );
  if (!(0, import_node_fs7.existsSync)(path)) {
    return {
      name: "Environment example",
      passed: false,
      detail: ".env.example is missing"
    };
  }
  const content = (0, import_node_fs7.readFileSync)(path, "utf8");
  const requiredVariables = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET"
  ];
  const missingVariables = requiredVariables.filter(
    (variable) => !content.includes(`${variable}=`)
  );
  return {
    name: "Environment example",
    passed: missingVariables.length === 0,
    detail: missingVariables.length === 0 ? "Required environment variables are documented" : `Missing variables: ${missingVariables.join(", ")}`
  };
}
function runDoctor(projectDirectory = process.cwd()) {
  const checks = [
    checkFile(
      projectDirectory,
      "package.json",
      "Package manifest"
    ),
    checkFile(
      projectDirectory,
      "tsconfig.json",
      "TypeScript configuration"
    ),
    checkFile(
      projectDirectory,
      "prisma/schema.prisma",
      "Prisma schema"
    ),
    checkFile(
      projectDirectory,
      "src/app.ts",
      "Fastify application"
    ),
    checkFile(
      projectDirectory,
      "src/server.ts",
      "Server entrypoint"
    ),
    checkFile(
      projectDirectory,
      "Dockerfile",
      "Dockerfile"
    ),
    checkFile(
      projectDirectory,
      "docker-compose.yml",
      "Docker Compose"
    ),
    checkFile(
      projectDirectory,
      ".github/workflows/ci.yml",
      "CI workflow"
    ),
    checkPackageScripts(projectDirectory),
    checkEnvironmentExample(projectDirectory)
  ];
  return {
    healthy: checks.every((check) => check.passed),
    projectDirectory: (0, import_node_path7.resolve)(projectDirectory),
    checks
  };
}

// src/commands/doctor.ts
var doctorCommand = new import_commander2.Command("doctor").description(
  "Inspect a generated LaunchStack project for missing production files and configuration"
).option(
  "-d, --directory <path>",
  "Project directory to inspect"
).option(
  "--json",
  "Print the doctor report as JSON"
).action((options) => {
  const report = runDoctor(
    options.directory ?? process.cwd()
  );
  if (options.json) {
    console.log(
      JSON.stringify(report, null, 2)
    );
    process.exitCode = report.healthy ? 0 : 1;
    return;
  }
  console.log(
    `LaunchStack doctor: ${report.projectDirectory}`
  );
  console.log("");
  for (const check of report.checks) {
    const marker = check.passed ? "PASS" : "FAIL";
    console.log(
      `${marker}  ${check.name}: ${check.detail}`
    );
  }
  console.log("");
  if (report.healthy) {
    console.log(
      "Project health check passed."
    );
  } else {
    console.error(
      "Project health check failed."
    );
    process.exitCode = 1;
  }
});

// src/commands/deploy.ts
var import_node_child_process3 = require("child_process");
var import_commander3 = require("commander");

// src/config.ts
var import_node_fs9 = require("fs");
var import_node_path9 = require("path");
var import_zod = require("zod");

// src/providers.ts
var PROVIDER_IDS = [
  "vercel",
  "netlify",
  "render",
  "railway",
  "fly",
  "docker",
  "custom"
];
var PROVIDERS = {
  vercel: {
    id: "vercel",
    label: "Vercel",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  },
  netlify: {
    id: "netlify",
    label: "Netlify",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  },
  render: {
    id: "render",
    label: "Render",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  railway: {
    id: "railway",
    label: "Railway",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  fly: {
    id: "fly",
    label: "Fly.io",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  docker: {
    id: "docker",
    label: "Docker",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  custom: {
    id: "custom",
    label: "Custom",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  }
};
function isProviderId(value) {
  return PROVIDER_IDS.includes(value);
}
function providerHelpText() {
  return PROVIDER_IDS.join(", ");
}

// src/storage.ts
var import_node_fs8 = require("fs");
var import_node_path8 = require("path");
var import_node_crypto2 = require("crypto");
function atomicWriteText(path, content, mode) {
  const directory = (0, import_node_path8.dirname)(path);
  (0, import_node_fs8.mkdirSync)(directory, { recursive: true });
  const temporaryPath = (0, import_node_path8.join)(
    directory,
    `.${(0, import_node_path8.basename)(path)}.${process.pid}.${(0, import_node_crypto2.randomUUID)()}.tmp`
  );
  try {
    (0, import_node_fs8.writeFileSync)(temporaryPath, content, {
      encoding: "utf8",
      flag: "wx",
      ...mode === void 0 ? {} : { mode }
    });
    if (mode !== void 0) {
      (0, import_node_fs8.chmodSync)(temporaryPath, mode);
    }
    (0, import_node_fs8.renameSync)(temporaryPath, path);
    if (mode !== void 0) {
      (0, import_node_fs8.chmodSync)(path, mode);
    }
  } finally {
    if ((0, import_node_fs8.existsSync)(temporaryPath)) {
      (0, import_node_fs8.rmSync)(temporaryPath, { force: true });
    }
  }
}
function readJsonFile(path, fallback) {
  if (!(0, import_node_fs8.existsSync)(path)) {
    return fallback;
  }
  try {
    return JSON.parse((0, import_node_fs8.readFileSync)(path, "utf8"));
  } catch {
    throw new Error(`Invalid JSON in ${(0, import_node_path8.basename)(path)}.`);
  }
}

// src/config.ts
var CONFIG_FILE_NAME = "launchstack.config.json";
var launchStackConfigSchema = import_zod.z.object({
  appName: import_zod.z.string().min(1),
  environment: import_zod.z.enum(["development", "staging", "production"]),
  provider: import_zod.z.enum(PROVIDER_IDS),
  buildCommand: import_zod.z.string().min(1),
  outputDirectory: import_zod.z.string().min(1),
  deployTarget: import_zod.z.string().min(1)
});
function getConfigPath() {
  return (0, import_node_path9.resolve)(process.cwd(), CONFIG_FILE_NAME);
}
function configExists() {
  return (0, import_node_fs9.existsSync)(getConfigPath());
}
function createDefaultConfig(appName) {
  return {
    appName,
    environment: "production",
    provider: "custom",
    buildCommand: "npm run build",
    outputDirectory: "dist",
    deployTarget: "https://example.com"
  };
}
function writeConfig(config) {
  const validated = launchStackConfigSchema.parse(config);
  atomicWriteText(
    getConfigPath(),
    `${JSON.stringify(validated, null, 2)}
`
  );
}
function readConfig() {
  const raw = (0, import_node_fs9.readFileSync)(getConfigPath(), "utf-8");
  const parsed = JSON.parse(raw);
  return launchStackConfigSchema.parse(parsed);
}

// src/deployment.ts
var import_node_fs10 = require("fs");
var import_node_path10 = require("path");
function resolveVerifiedOutputDirectory(projectDirectory, configuredOutputDirectory) {
  const projectRoot = (0, import_node_path10.resolve)(projectDirectory);
  const outputPath = (0, import_node_path10.resolve)(projectRoot, configuredOutputDirectory);
  const relativePath = (0, import_node_path10.relative)(projectRoot, outputPath);
  if (relativePath === ".." || relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || (0, import_node_path10.isAbsolute)(relativePath)) {
    throw new Error(
      "Configured output directory must stay inside the project directory."
    );
  }
  if (!(0, import_node_fs10.existsSync)(outputPath)) {
    throw new Error(
      `Output directory not found: ${configuredOutputDirectory}`
    );
  }
  if (!(0, import_node_fs10.statSync)(outputPath).isDirectory()) {
    throw new Error(
      `Configured output path is not a directory: ${configuredOutputDirectory}`
    );
  }
  return outputPath;
}

// src/git.ts
var import_node_child_process2 = require("child_process");
function run(args, cwd) {
  return (0, import_node_child_process2.execFileSync)("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}
function getGitMetadata(cwd = process.cwd()) {
  try {
    const status = run(
      ["status", "--porcelain=v2", "--branch"],
      cwd
    );
    const lines = status.split("\n").filter(Boolean);
    const branch = lines.find((line) => line.startsWith("# branch.head "))?.slice("# branch.head ".length);
    const commitHash = lines.find((line) => line.startsWith("# branch.oid "))?.slice("# branch.oid ".length);
    if (!commitHash || commitHash === "(initial)") {
      return null;
    }
    const commitMessage = run(
      ["log", "-1", "--pretty=%B"],
      cwd
    );
    return {
      branch: !branch || branch === "(detached)" ? "HEAD" : branch,
      commitHash,
      commitMessage,
      dirty: lines.some((line) => !line.startsWith("# "))
    };
  } catch {
    return null;
  }
}

// src/history.ts
var import_node_path11 = require("path");
var STORE_DIR = ".launchstack";
var HISTORY_FILE = "history.json";
function getHistoryPath(projectDirectory = process.cwd()) {
  return (0, import_node_path11.resolve)(
    projectDirectory,
    STORE_DIR,
    HISTORY_FILE
  );
}
function readHistory(projectDirectory = process.cwd()) {
  const records = readJsonFile(
    getHistoryPath(projectDirectory),
    []
  );
  if (!Array.isArray(records)) {
    throw new Error("history.json must contain a JSON array.");
  }
  return records;
}
function writeHistory(records, projectDirectory = process.cwd()) {
  atomicWriteText(
    getHistoryPath(projectDirectory),
    `${JSON.stringify(records, null, 2)}
`
  );
}
function addDeploymentRecord(record, projectDirectory = process.cwd()) {
  const records = readHistory(projectDirectory);
  records.unshift(record);
  writeHistory(records.slice(0, 50), projectDirectory);
}

// src/commands/deploy.ts
var deployCommand = new import_commander3.Command("deploy").description("Build and prepare the configured deployment artifacts").option("--skip-build", "Skip the build command").action((options) => {
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const config = readConfig();
    const git = getGitMetadata();
    const provider = PROVIDERS[config.provider];
    console.log("LaunchStack deployment preparation");
    console.log(`App: ${config.appName}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Provider: ${provider.label}`);
    if (git) {
      console.log(`Branch: ${git.branch}`);
      console.log(`Commit: ${git.commitHash.slice(0, 7)}`);
      if (git.dirty) {
        console.log("Working tree has uncommitted changes");
      }
    }
    console.log("");
    if (!options.skipBuild) {
      console.log(`Running trusted project build command: ${config.buildCommand}`);
      (0, import_node_child_process3.execSync)(config.buildCommand, {
        stdio: "inherit",
        cwd: process.cwd()
      });
    }
    resolveVerifiedOutputDirectory(
      process.cwd(),
      config.outputDirectory
    );
    addDeploymentRecord({
      id: `dep_${Date.now()}`,
      appName: config.appName,
      environment: config.environment,
      provider: config.provider,
      deployTarget: config.deployTarget,
      outputDirectory: config.outputDirectory,
      status: "prepared",
      createdAt,
      git
    });
    console.log("");
    console.log("Build output verified");
    console.log(`Deploy target: ${config.deployTarget}`);
    console.log("");
    if (provider.remoteDeploymentSupported) {
      console.log("Deployment provider confirmed the remote deployment.");
    } else {
      console.log(
        "Artifacts are prepared. LaunchStack has not performed or confirmed a remote deployment for this provider."
      );
    }
  } catch (error) {
    console.log("Deployment preparation failed");
    console.log(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
});

// src/commands/docker.ts
var import_node_fs11 = require("fs");
var import_commander4 = require("commander");
function writeFileIfAllowed(path, content, force) {
  if ((0, import_node_fs11.existsSync)(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }
  (0, import_node_fs11.writeFileSync)(path, content);
  console.log(`Created ${path}`);
}
var dockerCommand = new import_commander4.Command("docker").description("Generate Docker deployment files");
dockerCommand.command("init").description("Create hardened Dockerfile, .dockerignore, and docker-compose.yml").option("-f, --force", "Overwrite existing Docker files").action((options) => {
  const config = readConfig();
  const force = Boolean(options.force);
  const hasLockfile = (0, import_node_fs11.existsSync)("package-lock.json");
  const prisma = (0, import_node_fs11.existsSync)("prisma/schema.prisma");
  const dockerfile = renderDockerfile({
    buildCommand: config.buildCommand,
    outputDirectory: config.outputDirectory,
    hasLockfile,
    prisma
  });
  const compose = `services:
  ${config.appName}:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: ${config.environment}
`;
  writeFileIfAllowed("Dockerfile", dockerfile, force);
  writeFileIfAllowed(".dockerignore", renderDockerIgnore(), force);
  writeFileIfAllowed("docker-compose.yml", compose, force);
});

// src/commands/env.ts
var import_commander5 = require("commander");
var allowedEnvironments = ["development", "staging", "production"];
var envCommand = new import_commander5.Command("env").description("View or update the LaunchStack environment").argument("[environment]", "development, staging, or production").action((environment) => {
  try {
    const config = readConfig();
    if (!environment) {
      console.log(`Current environment: ${config.environment}`);
      return;
    }
    if (!allowedEnvironments.includes(environment)) {
      console.log("Invalid environment. Use development, staging, or production.");
      process.exit(1);
    }
    config.environment = environment;
    writeConfig(config);
    console.log(`Environment updated to ${config.environment}`);
  } catch (error) {
    console.log("Could not update environment");
    if (error instanceof Error) {
      console.log(error.message);
    }
    process.exit(1);
  }
});

// src/commands/github.ts
var import_node_fs12 = require("fs");
var import_node_path12 = require("path");
var import_commander6 = require("commander");
function writeWorkflowFile(path, content, force) {
  if ((0, import_node_fs12.existsSync)(path) && !force) {
    console.log(`${path} already exists. Use --force to overwrite.`);
    return;
  }
  (0, import_node_fs12.mkdirSync)((0, import_node_path12.dirname)(path), { recursive: true });
  atomicWriteText(path, content);
  console.log(`Created ${path}`);
}
var githubCommand = new import_commander6.Command("github").description("Generate GitHub Actions workflows");
githubCommand.command("init").description("Create a lockfile-first CI workflow").option("-f, --force", "Overwrite existing workflow").action((options) => {
  const config = readConfig();
  const workflow = `name: CI

on:
  push:
    branches:
      - main
  pull_request:

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run project checks when available
        run: npm run check --if-present

      - name: Build project
        run: ${config.buildCommand}
`;
  writeWorkflowFile(
    ".github/workflows/ci.yml",
    workflow,
    Boolean(options.force)
  );
});

// src/commands/history.ts
var import_commander7 = require("commander");
var historyCommand = new import_commander7.Command("history").description("Show recent LaunchStack deployments").option("-l, --limit <number>", "Number of records to show", "10").action((options) => {
  const records = readHistory();
  const limit = Number(options.limit);
  if (records.length === 0) {
    console.log("No deployment history found");
    return;
  }
  records.slice(0, limit).forEach((record) => {
    console.log(`${record.id}`);
    console.log(`App: ${record.appName}`);
    console.log(`Environment: ${record.environment}`);
    console.log(`Provider: ${record.provider}`);
    console.log(`Status: ${record.status}`);
    console.log(`Created: ${record.createdAt}`);
    if (record.git) {
      console.log(`Branch: ${record.git.branch}`);
      console.log(`Commit: ${record.git.commitHash.slice(0, 7)}`);
      console.log(`Dirty: ${record.git.dirty ? "yes" : "no"}`);
    }
    console.log("");
  });
});

// src/commands/init.ts
var import_commander8 = require("commander");
var initCommand = new import_commander8.Command("init").description("Create a LaunchStack config file").option("-n, --name <name>", "Project name").option("-f, --force", "Overwrite existing config file").action((options) => {
  if (configExists() && !options.force) {
    console.log("launchstack.config.json already exists. Use --force to overwrite.");
    return;
  }
  const appName = options.name || "my-app";
  const config = createDefaultConfig(appName);
  writeConfig(config);
  console.log("Created launchstack.config.json");
});

// src/commands/provider.ts
var import_commander9 = require("commander");
var providerCommand = new import_commander9.Command("provider").description("View or update the LaunchStack deployment provider").argument("[provider]", providerHelpText()).action((provider) => {
  try {
    const config = readConfig();
    if (!provider) {
      const definition = PROVIDERS[config.provider];
      console.log(`Current provider: ${definition.label} (${definition.id})`);
      console.log(
        definition.remoteDeploymentSupported ? "Remote deployment is supported by LaunchStack." : "LaunchStack currently prepares artifacts/presets for this provider; it does not perform the remote deployment."
      );
      return;
    }
    if (!isProviderId(provider)) {
      console.log(`Invalid provider. Use ${providerHelpText()}.`);
      process.exitCode = 1;
      return;
    }
    config.provider = provider;
    writeConfig(config);
    console.log(`Provider updated to ${PROVIDERS[provider].label}`);
  } catch (error) {
    console.log("Could not update provider");
    if (error instanceof Error) {
      console.log(error.message);
    }
    process.exitCode = 1;
  }
});

// src/commands/rollback.ts
var import_commander10 = require("commander");
var rollbackCommand = new import_commander10.Command("rollback").description("Show the latest successful deployment available for rollback").action(() => {
  const records = readHistory();
  const latestSuccess = records.find((record) => record.status === "success");
  if (!latestSuccess) {
    console.log("No successful deployment found for rollback");
    return;
  }
  console.log("Rollback target found");
  console.log(`Deployment: ${latestSuccess.id}`);
  console.log(`App: ${latestSuccess.appName}`);
  console.log(`Environment: ${latestSuccess.environment}`);
  console.log(`Provider: ${latestSuccess.provider}`);
  console.log(`Deploy target: ${latestSuccess.deployTarget}`);
  console.log(`Created: ${latestSuccess.createdAt}`);
});

// src/commands/secrets.ts
var import_commander11 = require("commander");

// src/secrets-store.ts
var import_node_fs13 = require("fs");
var import_node_path13 = require("path");
var STORE_DIR2 = ".launchstack";
var SECRETS_FILE = "secrets.json";
var SECRET_MODE = 384;
var RESERVED_KEYS = /* @__PURE__ */ new Set([
  "__proto__",
  "constructor",
  "prototype"
]);
function getSecretsPath(projectDirectory = process.cwd()) {
  return (0, import_node_path13.resolve)(
    projectDirectory,
    STORE_DIR2,
    SECRETS_FILE
  );
}
function validateSecretKey(key) {
  const normalized = key.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(normalized) || RESERVED_KEYS.has(normalized)) {
    throw new Error(
      "Secret keys must start with a letter or underscore, contain only letters, numbers, underscores, dots, or hyphens, and must not use reserved object keys."
    );
  }
  return normalized;
}
function readSecrets(projectDirectory = process.cwd()) {
  const path = getSecretsPath(projectDirectory);
  const parsed = readJsonFile(path, {});
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("secrets.json must contain a JSON object.");
  }
  const secrets = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of Object.entries(parsed)) {
    validateSecretKey(key);
    if (typeof value !== "string") {
      throw new Error("secrets.json contains a non-string secret value.");
    }
    secrets[key] = value;
  }
  return secrets;
}
function writeSecrets(secrets, projectDirectory = process.cwd()) {
  const storeDirectory = (0, import_node_path13.resolve)(projectDirectory, STORE_DIR2);
  (0, import_node_fs13.mkdirSync)(storeDirectory, { recursive: true });
  atomicWriteText(
    getSecretsPath(projectDirectory),
    `${JSON.stringify(secrets, null, 2)}
`,
    SECRET_MODE
  );
}
function setSecret(key, value, projectDirectory = process.cwd()) {
  const normalizedKey = validateSecretKey(key);
  if (value.length === 0) {
    throw new Error("Secret value must not be empty.");
  }
  const secrets = readSecrets(projectDirectory);
  secrets[normalizedKey] = value;
  writeSecrets(secrets, projectDirectory);
}
function removeSecret(key, projectDirectory = process.cwd()) {
  const normalizedKey = validateSecretKey(key);
  const secrets = readSecrets(projectDirectory);
  if (!(normalizedKey in secrets)) {
    return false;
  }
  delete secrets[normalizedKey];
  writeSecrets(secrets, projectDirectory);
  return true;
}

// src/commands/secrets.ts
async function readSecretFromStdin() {
  let value = "";
  for await (const chunk of process.stdin) {
    value += String(chunk);
  }
  return value.replace(/\r?\n$/, "");
}
async function promptHiddenSecret() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error(
      "Interactive secret entry requires a TTY. Pipe the value and use --stdin instead."
    );
  }
  return new Promise((resolve10, reject) => {
    let value = "";
    const input = process.stdin;
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };
    const onData = (chunk) => {
      const text = String(chunk);
      for (const character of text) {
        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve10(value);
          return;
        }
        if (character === "") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Secret entry cancelled."));
          return;
        }
        if (character === "\x7F" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    process.stdout.write("Secret value: ");
    input.setEncoding("utf8");
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}
var secretsCommand = new import_commander11.Command("secrets").description("Manage local LaunchStack secrets");
secretsCommand.command("add").description("Add or update a local secret without exposing it in process arguments").argument("<key>", "Secret key").option("--stdin", "Read the secret value from standard input").action(async (key, options) => {
  try {
    validateSecretKey(key);
    const value = options.stdin ? await readSecretFromStdin() : await promptHiddenSecret();
    setSecret(key, value);
    console.log(`Secret saved: ${key}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not save secret.");
    process.exitCode = 1;
  }
});
secretsCommand.command("list").description("List local secret keys").action(() => {
  try {
    const keys = Object.keys(readSecrets());
    if (keys.length === 0) {
      console.log("No secrets found");
      return;
    }
    keys.forEach((key) => {
      console.log(`${key}=********`);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not read secrets.");
    process.exitCode = 1;
  }
});
secretsCommand.command("remove").description("Remove a local secret").argument("<key>", "Secret key").action((key) => {
  try {
    if (!removeSecret(key)) {
      console.log(`Secret not found: ${key}`);
      return;
    }
    console.log(`Secret removed: ${key}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not remove secret.");
    process.exitCode = 1;
  }
});

// src/commands/status.ts
var import_commander12 = require("commander");
var statusCommand = new import_commander12.Command("status").description("Show LaunchStack project status").action(() => {
  try {
    const config = readConfig();
    console.log("LaunchStack project status");
    console.log("");
    console.log(`App: ${config.appName}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Provider: ${config.provider}`);
    console.log(`Build command: ${config.buildCommand}`);
    console.log(`Output directory: ${config.outputDirectory}`);
    console.log(`Deploy target: ${config.deployTarget}`);
    console.log("");
    console.log("Config: valid");
  } catch {
    console.log("Config: missing or invalid");
    console.log("Run: launchstack init --name your-app");
  }
});

// src/commands/validate.ts
var import_commander13 = require("commander");
var validateCommand = new import_commander13.Command("validate").description("Validate the LaunchStack config file").action(() => {
  try {
    const config = readConfig();
    console.log("LaunchStack config is valid");
    console.log(`App: ${config.appName}`);
    console.log(`Provider: ${config.provider}`);
    console.log(`Environment: ${config.environment}`);
  } catch (error) {
    console.log("LaunchStack config is invalid");
    if (error instanceof Error) {
      console.log(error.message);
    }
    process.exit(1);
  }
});

// src/cli.ts
var program = new import_commander14.Command();
program.name("launchstack").description(
  "Backend API scaffolding, deployment preparation, and developer workflow CLI"
).version("2.1.0");
program.addCommand(createCommand);
program.addCommand(doctorCommand);
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(deployCommand);
program.addCommand(validateCommand);
program.addCommand(envCommand);
program.addCommand(providerCommand);
program.addCommand(secretsCommand);
program.addCommand(historyCommand);
program.addCommand(rollbackCommand);
program.addCommand(dockerCommand);
program.addCommand(githubCommand);
program.parse();
//# sourceMappingURL=cli.js.map