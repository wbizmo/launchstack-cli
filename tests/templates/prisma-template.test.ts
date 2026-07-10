import {
  existsSync,
  readFileSync
} from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const templateRoot = resolve(
  process.cwd(),
  "src",
  "templates",
  "api"
);

describe("Prisma and PostgreSQL template", () => {
  it("contains Prisma and database integration files", () => {
    const requiredFiles = [
      "prisma/schema.prisma",
      "docker-compose.yml",
      "src/lib/prisma.ts",
      "src/plugins/database.ts"
    ];

    for (const file of requiredFiles) {
      expect(
        existsSync(resolve(templateRoot, file)),
        `Missing template file: ${file}`
      ).toBe(true);
    }
  });

  it("declares Prisma dependencies", () => {
    const packageJson = JSON.parse(
      readFileSync(
        resolve(templateRoot, "package.json"),
        "utf8"
      )
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(
      packageJson.dependencies["@prisma/client"]
    ).toBeDefined();

    expect(
      packageJson.devDependencies.prisma
    ).toBeDefined();
  });

  it("contains the starter User model", () => {
    const schema = readFileSync(
      resolve(templateRoot, "prisma/schema.prisma"),
      "utf8"
    );

    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain("model User");
    expect(schema).toContain("email");
  });

  it("contains PostgreSQL Docker configuration", () => {
    const compose = readFileSync(
      resolve(templateRoot, "docker-compose.yml"),
      "utf8"
    );

    expect(compose).toContain("postgres:16-alpine");
    expect(compose).toContain("POSTGRES_DB");
    expect(compose).toContain("postgres_data");
  });
});
