import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

describe("OpenAPI documentation", () => {
  it("exposes Swagger UI", async () => {
    process.env.NODE_ENV = "test";
    app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/docs/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
  });

  it("generates an OpenAPI document", async () => {
    process.env.NODE_ENV = "test";
    app = await buildApp();
    await app.ready();

    const document = app.swagger();

    expect(document.openapi).toBe("3.0.3");
    expect(document.info.title).toBe("{{PROJECT_DISPLAY_NAME}} API");
    expect(document.paths).toHaveProperty("/health");
    expect(document.paths).toHaveProperty("/api/auth/register");
    expect(document.paths).toHaveProperty("/api/auth/login");
    expect(document.paths).toHaveProperty("/api/auth/me");
    expect(document.components?.securitySchemes).toHaveProperty("bearerAuth");
  });
});
