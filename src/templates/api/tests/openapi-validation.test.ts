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

describe("Zod-powered OpenAPI output", () => {
  it("includes request schemas generated from Zod", async () => {
    process.env.NODE_ENV = "test";

    app = await buildApp();
    await app.ready();

    const document = app.swagger();

    const registerOperation =
      document.paths["/api/auth/register"]?.post;

    expect(registerOperation).toBeDefined();
    expect(registerOperation?.requestBody).toBeDefined();

    const loginOperation =
      document.paths["/api/auth/login"]?.post;

    expect(loginOperation).toBeDefined();
    expect(loginOperation?.requestBody).toBeDefined();
  });

  it("includes documented validation responses", async () => {
    process.env.NODE_ENV = "test";

    app = await buildApp();
    await app.ready();

    const document = app.swagger();

    const registerOperation =
      document.paths["/api/auth/register"]?.post;

    expect(
      registerOperation?.responses
    ).toHaveProperty("201");

    expect(
      registerOperation?.responses
    ).toHaveProperty("409");

    const meOperation =
      document.paths["/api/auth/me"]?.get;

    expect(
      meOperation?.security
    ).toEqual([
      {
        bearerAuth: []
      }
    ]);
  });
});
