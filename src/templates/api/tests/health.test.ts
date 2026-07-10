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

describe("health endpoint", () => {
  it("returns API health information", async () => {
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
    expect(typeof body.timestamp).toBe("string");
    expect(typeof body.uptime).toBe("number");
  });

  it("returns a structured 404 response", async () => {
    process.env.NODE_ENV = "test";

    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/missing"
    });

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      statusCode: 404,
      error: "Not Found"
    });
  });
});
