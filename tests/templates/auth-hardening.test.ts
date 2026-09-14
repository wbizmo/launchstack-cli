import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function templateFile(path: string): string {
  return readFileSync(
    resolve(process.cwd(), "src", "templates", "api", path),
    "utf8"
  );
}

describe("generated auth hardening", () => {
  it("consumes refresh tokens conditionally inside a database transaction", () => {
    const repository = templateFile("src/modules/auth/auth.repository.ts");
    const service = templateFile("src/modules/auth/auth.service.ts");

    expect(repository).toContain("consumeRefreshToken");
    expect(repository).toContain("revokedAt: null");
    expect(repository).toContain("expiresAt:");
    expect(service).toContain("this.app.prisma.$transaction");
    expect(service).toContain("consumed.count !== 1");
  });

  it("maps concurrent duplicate email writes to a conflict", () => {
    const service = templateFile("src/modules/auth/auth.service.ts");

    expect(service).toContain("PrismaClientKnownRequestError");
    expect(service).toContain('error.code === "P2002"');
    expect(service).toContain("statusCode: 409");
  });

  it("adds route rate limiting, input bounds, and secure production CORS", () => {
    const routes = templateFile("src/modules/auth/auth.routes.ts");
    const schemas = templateFile("src/modules/auth/auth.schemas.ts");
    const environment = templateFile("src/config/env.ts");
    const packageJson = JSON.parse(templateFile("package.json")) as {
      dependencies: Record<string, string>;
    };

    expect(routes).toContain("rateLimit");
    expect(schemas).toContain("PASSWORD_MAX_LENGTH");
    expect(schemas).toContain("REFRESH_TOKEN_MAX_LENGTH");
    expect(environment).toContain("ALLOW_INSECURE_CORS");
    expect(environment).toContain("JWT_REFRESH_EXPIRES_IN");
    expect(packageJson.dependencies["@fastify/rate-limit"]).toBeDefined();
    expect(packageJson.dependencies["@fastify/swagger-ui"]).toBe("^6.1.1");
  });
});
