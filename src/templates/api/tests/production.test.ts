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

describe("production readiness", () => {
  it("exposes the readiness endpoint", async () => {
    process.env.NODE_ENV = "test";

    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/ready"
    });

    expect([200, 503]).toContain(response.statusCode);

    const body = response.json<{
      status: "ready" | "not_ready";
      database: "connected" | "unavailable";
      runtime: {
        nodeVersion: string;
        platform: string;
        pid: number;
        startedAt: string;
      };
      timestamp: string;
    }>();

    expect(["ready", "not_ready"]).toContain(body.status);
    expect(body.runtime.nodeVersion).toMatch(/^v/);
    expect(body.runtime.pid).toBeGreaterThan(0);
  });
});
