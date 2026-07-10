import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const templateRoot = resolve(process.cwd(), "src", "templates", "api");

describe("Swagger and OpenAPI template", () => {
  it("contains documentation files", () => {
    const requiredFiles = [
      "src/plugins/swagger.ts",
      "src/schemas/common.ts",
      "src/schemas/auth.ts",
      "tests/openapi.test.ts"
    ];

    for (const file of requiredFiles) {
      expect(existsSync(resolve(templateRoot, file)), `Missing OpenAPI template file: ${file}`).toBe(true);
    }
  });

  it("declares Swagger dependencies", () => {
    const packageJson = JSON.parse(readFileSync(resolve(templateRoot, "package.json"), "utf8"));
    expect(packageJson.dependencies["@fastify/swagger"]).toBeDefined();
    expect(packageJson.dependencies["@fastify/swagger-ui"]).toBeDefined();
  });

  it("configures bearer authentication", () => {
    const source = readFileSync(resolve(templateRoot, "src/plugins/swagger.ts"), "utf8");
    expect(source).toContain("bearerAuth");
    expect(source).toContain('routePrefix: "/docs"');
  });

  it("documents authentication routes", () => {
    const source = readFileSync(resolve(templateRoot, "src/modules/auth/auth.schemas.ts"), "utf8");
    expect(source).toContain('tags: ["Authentication"]');
    expect(source).toContain("security");
  });
});
