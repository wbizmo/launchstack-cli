import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

const runDatabaseTests =
  process.env.RUN_DATABASE_TESTS === "1";

let app: FastifyInstance | undefined;

const databaseDescribe = runDatabaseTests
  ? describe
  : describe.skip;

databaseDescribe("authentication concurrency", () => {
  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    app = await buildApp();
    await app.prisma.refreshToken.deleteMany();
    await app.prisma.user.deleteMany();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("returns one 201 and one 409 for concurrent duplicate registrations", async () => {
    const payload = {
      email: "race@example.com",
      password: "strong-password-123"
    };

    const responses = await Promise.all([
      app!.inject({
        method: "POST",
        url: "/api/auth/register",
        payload
      }),
      app!.inject({
        method: "POST",
        url: "/api/auth/register",
        payload
      })
    ]);

    expect(
      responses.map((response) => response.statusCode).sort()
    ).toEqual([
      201,
      409
    ]);
    expect(await app!.prisma.user.count({
      where: {
        email: "race@example.com"
      }
    })).toBe(1);
  });

  it("allows exactly one concurrent refresh-token rotation", async () => {
    const registration = await app!.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "refresh-race@example.com",
        password: "strong-password-123"
      }
    });

    expect(registration.statusCode).toBe(201);

    const registrationBody = registration.json<{
      data: {
        user: {
          id: string;
        };
        tokens: {
          refreshToken: string;
        };
      };
    }>();
    const refreshToken =
      registrationBody.data.tokens.refreshToken;

    const responses = await Promise.all([
      app!.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: {
          refreshToken
        }
      }),
      app!.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: {
          refreshToken
        }
      })
    ]);

    expect(
      responses.map((response) => response.statusCode).sort()
    ).toEqual([
      200,
      401
    ]);

    const activeTokens =
      await app!.prisma.refreshToken.count({
        where: {
          userId: registrationBody.data.user.id,
          revokedAt: null
        }
      });

    expect(activeTokens).toBe(1);

    const replay = await app!.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: {
        refreshToken
      }
    });
    expect(replay.statusCode).toBe(401);
  });
});
