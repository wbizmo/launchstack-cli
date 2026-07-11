import {
  existsSync,
  readFileSync
} from "node:fs";
import { resolve } from "node:path";

export type DoctorCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

export type DoctorReport = {
  healthy: boolean;
  projectDirectory: string;
  checks: DoctorCheck[];
};

function checkFile(
  projectDirectory: string,
  file: string,
  label: string
): DoctorCheck {
  const path = resolve(projectDirectory, file);
  const passed = existsSync(path);

  return {
    name: label,
    passed,
    detail: passed
      ? `${file} found`
      : `${file} is missing`
  };
}

function checkPackageScripts(
  projectDirectory: string
): DoctorCheck {
  const packagePath = resolve(
    projectDirectory,
    "package.json"
  );

  if (!existsSync(packagePath)) {
    return {
      name: "Package scripts",
      passed: false,
      detail: "package.json is missing"
    };
  }

  const packageJson = JSON.parse(
    readFileSync(packagePath, "utf8")
  ) as {
    scripts?: Record<string, string>;
  };

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
    detail:
      missingScripts.length === 0
        ? "Required scripts are present"
        : `Missing scripts: ${missingScripts.join(", ")}`
  };
}

function checkEnvironmentExample(
  projectDirectory: string
): DoctorCheck {
  const path = resolve(
    projectDirectory,
    ".env.example"
  );

  if (!existsSync(path)) {
    return {
      name: "Environment example",
      passed: false,
      detail: ".env.example is missing"
    };
  }

  const content = readFileSync(path, "utf8");

  const requiredVariables = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET"
  ];

  const missingVariables = requiredVariables.filter(
    (variable) =>
      !content.includes(`${variable}=`)
  );

  return {
    name: "Environment example",
    passed: missingVariables.length === 0,
    detail:
      missingVariables.length === 0
        ? "Required environment variables are documented"
        : `Missing variables: ${missingVariables.join(", ")}`
  };
}

export function runDoctor(
  projectDirectory = process.cwd()
): DoctorReport {
  const checks: DoctorCheck[] = [
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
    projectDirectory: resolve(projectDirectory),
    checks
  };
}
