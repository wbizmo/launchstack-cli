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

describe("JWT authentication template", () => {
  it("contains authentication files", () => {
    const requiredFiles = [
      "src/plugins/auth.ts",
      "src/middleware/authorize.ts",
      "src/modules/auth/auth.routes.ts",
      "src/modules/auth/auth.schemas.ts",
      "src/modules/auth/auth.service.ts",
      "src/modules/auth/auth.types.ts",
      "src/types/jwt.d.ts"
    ];

    for (const file of requiredFiles) {
      expect(
        existsSync(resolve(templateRoot, file)),
        `Missing authentication file: ${file}`
      ).toBe(true);
    }
  });

  it("declares authentication dependencies", () => {
    const packageJson = JSON.parse(
      readFileSync(
        resolve(templateRoot, "package.json"),
        "utf8"
      )
    ) as {
      dependencies: Record<string, string>;
    };

    expect(
      packageJson.dependencies["@fastify/jwt"]
    ).toBeDefined();

    expect(
      packageJson.dependencies.bcryptjs
    ).toBeDefined();
  });

  it("contains role and refresh-token models", () => {
    const schema = readFileSync(
      resolve(templateRoot, "prisma/schema.prisma"),
      "utf8"
    );

    expect(schema).toContain("enum UserRole");
    expect(schema).toContain("model RefreshToken");
    expect(schema).toContain("passwordHash");
  });

  it("registers authentication routes", () => {
    const routes = readFileSync(
      resolve(
        templateRoot,
        "src/modules/auth/auth.routes.ts"
      ),
      "utf8"
    );

    expect(routes).toContain('"/register"');
    expect(routes).toContain('"/login"');
    expect(routes).toContain('"/refresh"');
    expect(routes).toContain('"/logout"');
    expect(routes).toContain('"/me"');
  });
});
