const {
  existsSync,
  readFileSync
} = require("node:fs");
const { resolve } = require("node:path");

const projectDirectory = process.argv[2];

if (!projectDirectory) {
  console.error(
    "Usage: node scripts/final-release-audit.cjs <project-directory>"
  );
  process.exit(1);
}

const requiredFiles = [
  "README.md",
  "CHANGELOG.md",
  "docs/ARCHITECTURE.md",
  "docs/DEPLOYMENT.md",
  "Dockerfile",
  ".dockerignore",
  "docker-compose.yml",
  "docker-compose.production.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/docker.yml",
  "render.yaml",
  "railway.json",
  "fly.toml",
  "prisma/schema.prisma",
  "src/app.ts",
  "src/server.ts",
  "src/routes/health.ts",
  "src/routes/readiness.ts",
  "src/modules/auth/auth.routes.ts",
  "src/modules/auth/auth.controller.ts",
  "src/modules/auth/auth.service.ts",
  "src/modules/auth/auth.repository.ts",
  "src/modules/users/user.service.ts",
  "tests/validation.test.ts",
  "tests/openapi.test.ts",
  "tests/architecture.test.ts",
  "tests/production.test.ts"
];

const missingFiles = requiredFiles.filter(
  (file) =>
    !existsSync(
      resolve(projectDirectory, file)
    )
);

if (missingFiles.length > 0) {
  console.error("Final release audit failed.");

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

const requiredDependencies = [
  "fastify",
  "@fastify/jwt",
  "@fastify/swagger",
  "@fastify/swagger-ui",
  "@prisma/client",
  "zod",
  "fastify-type-provider-zod"
];

const missingDependencies = requiredDependencies.filter(
  (dependency) =>
    !packageJson.dependencies?.[dependency]
);

if (missingDependencies.length > 0) {
  console.error(
    `Missing dependencies: ${missingDependencies.join(", ")}`
  );
  process.exit(1);
}

console.log("Final generated-project release audit passed.");
