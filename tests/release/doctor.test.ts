import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import { runDoctor } from "../../src/release/doctor";

const directories: string[] = [];

function createProjectDirectory(): string {
  const directory = mkdtempSync(
    join(tmpdir(), "launchstack-doctor-")
  );

  directories.push(directory);

  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, {
      recursive: true,
      force: true
    });
  }
});

describe("LaunchStack doctor", () => {
  it("reports missing project files", () => {
    const directory = createProjectDirectory();
    const report = runDoctor(directory);

    expect(report.healthy).toBe(false);
    expect(
      report.checks.some(
        (check) => !check.passed
      )
    ).toBe(true);
  });

  it("passes for a complete generated structure", () => {
    const directory = createProjectDirectory();

    const files = [
      "tsconfig.json",
      "prisma/schema.prisma",
      "src/app.ts",
      "src/server.ts",
      "Dockerfile",
      "docker-compose.yml",
      ".github/workflows/ci.yml"
    ];

    for (const file of files) {
      const path = join(directory, file);
      mkdirSync(
        join(path, ".."),
        {
          recursive: true
        }
      );
      writeFileSync(path, "");
    }

    writeFileSync(
      join(directory, ".env.example"),
      [
        "DATABASE_URL=value",
        "JWT_ACCESS_SECRET=value",
        "JWT_REFRESH_SECRET=value"
      ].join("\n")
    );

    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({
        scripts: {
          dev: "dev",
          build: "build",
          start: "start",
          test: "test",
          typecheck: "typecheck",
          "prisma:generate": "generate",
          "prisma:migrate": "migrate",
          "prisma:deploy": "deploy"
        }
      })
    );

    const report = runDoctor(directory);

    expect(report.healthy).toBe(true);
  });
});
