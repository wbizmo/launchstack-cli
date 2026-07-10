import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

describe("Zod request validation", () => {
  it("rejects an invalid registration email", async () => {
    process.env.NODE_ENV = "test";

    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "not-an-email",
        password: "strong-password"
      }
    });

    expect(response.statusCode).toBe(400);

    const body = response.json<{
      statusCode: number;
      error: string;
      message: string;
    }>();

    expect(body.statusCode).toBe(400);
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
    expect(body.message.length).toBeGreaterThan(0);
  });

  it("rejects a registration password shorter than eight characters", async () => {
    process.env.NODE_ENV = "test";

    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "user@example.com",
        password: "short"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects missing login credentials", async () => {
    process.env.NODE_ENV = "test";

    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects an empty refresh token", async () => {
    process.env.NODE_ENV = "test";

    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: {
        refreshToken: ""
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("accepts valid health responses through the serializer", async () => {
    process.env.NODE_ENV = "test";

    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      status: string;
      service: string;
      environment: string;
      timestamp: string;
      uptime: number;
    }>();

    expect(body.status).toBe("ok");
    expect(body.service).toBe("{{PROJECT_NAME}}");
    expect(body.environment).toBe("test");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});
