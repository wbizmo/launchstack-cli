import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import { loadEnvironment } from "../src/config/env";

const originalEnvironment = {
  ...process.env
};

afterEach(() => {
  process.env = {
    ...originalEnvironment
  };
});

function setRequiredEnvironment(): void {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    "postgresql://user:password@localhost:5432/test";
  process.env.JWT_ACCESS_SECRET =
    "test-access-secret-that-is-long-enough-123";
  process.env.JWT_REFRESH_SECRET =
    "test-refresh-secret-that-is-long-enough-123";
}

describe("environment configuration", () => {
  it("loads and normalizes valid environment values", () => {
    setRequiredEnvironment();

    const environment = loadEnvironment();

    expect(environment.nodeEnv).toBe("test");
    expect(environment.port).toBe(3000);
    expect(environment.databaseUrl).toContain(
      "postgresql://"
    );
    expect(environment.jwtAccessExpiresInMs).toBe(15 * 60 * 1000);
    expect(environment.jwtRefreshExpiresInMs).toBe(7 * 24 * 60 * 60 * 1000);
    expect(environment.authRateLimitMax).toBe(20);
  });

  it("rejects invalid ports", () => {
    setRequiredEnvironment();
    process.env.PORT = "90000";

    expect(() => loadEnvironment()).toThrow(
      "PORT must be an integer"
    );
  });

  it("rejects short JWT secrets", () => {
    setRequiredEnvironment();
    process.env.JWT_ACCESS_SECRET = "short";

    expect(() => loadEnvironment()).toThrow(
      "JWT_ACCESS_SECRET must contain at least 32 characters."
    );
  });

  it("rejects malformed JWT durations at startup", () => {
    setRequiredEnvironment();
    process.env.JWT_REFRESH_EXPIRES_IN = "7 days";

    expect(() => loadEnvironment()).toThrow(
      "JWT_REFRESH_EXPIRES_IN must be a positive duration"
    );
  });

  it("rejects wildcard CORS in production by default", () => {
    setRequiredEnvironment();
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGIN = "*";

    expect(() => loadEnvironment()).toThrow(
      "CORS_ORIGIN must contain an explicit production origin allowlist"
    );
  });

  it("accepts an explicit production CORS allowlist", () => {
    setRequiredEnvironment();
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGIN = "https://app.example.com,https://admin.example.com";

    expect(loadEnvironment().corsOrigin).toEqual([
      "https://app.example.com",
      "https://admin.example.com"
    ]);
  });

  it("rejects placeholder secrets in production", () => {
    setRequiredEnvironment();
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGIN = "https://app.example.com";
    process.env.JWT_ACCESS_SECRET =
      "replace-with-a-long-random-access-secret";

    expect(() => loadEnvironment()).toThrow(
      "JWT_ACCESS_SECRET must be replaced"
    );
  });
});
