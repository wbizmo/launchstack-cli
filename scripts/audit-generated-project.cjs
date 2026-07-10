const {
  existsSync,
  readFileSync
} = require("node:fs");
const { resolve } = require("node:path");

const projectDirectory = process.argv[2];

if (!projectDirectory) {
  console.error(
    "Usage: node scripts/audit-generated-project.cjs <directory>"
  );

  process.exit(1);
}

const requiredFiles = [
  "package.json",
  "tsconfig.json",
  ".gitignore",
  ".env",
  ".env.example",
  "docker-compose.yml",
  "prisma/schema.prisma",
  "src/app.ts",
  "src/server.ts",
  "src/config/env.ts",
  "src/plugins/auth.ts",
  "src/plugins/database.ts",
  "src/plugins/error-handler.ts",
  "src/modules/auth/auth.routes.ts",
  "src/modules/auth/auth.service.ts",
  "src/middleware/authorize.ts",
  "tests/health.test.ts",
  "tests/environment.test.ts"
];

const missingFiles = requiredFiles.filter(
  (file) =>
    !existsSync(resolve(projectDirectory, file))
);

if (missingFiles.length > 0) {
  console.error("Generated project audit failed.");

  for (const file of missingFiles) {
    console.error(`Missing: ${file}`);
  }

  process.exit(1);
}

const packageJson = JSON.parse(
  readFileSync(
    resolve(projectDirectory, "package.json"),
    "utf8"
  )
);

const requiredScripts = [
  "dev",
  "build",
  "start",
  "typecheck",
  "test",
  "check",
  "prisma:generate",
  "prisma:migrate",
  "prisma:deploy"
];

const missingScripts = requiredScripts.filter(
  (script) => !packageJson.scripts?.[script]
);

if (missingScripts.length > 0) {
  console.error("Generated package scripts are incomplete.");

  for (const script of missingScripts) {
    console.error(`Missing script: ${script}`);
  }

  process.exit(1);
}

console.log("Generated project structure audit passed.");
