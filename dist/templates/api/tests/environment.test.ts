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
  it("loads valid environment values", () => {
    setRequiredEnvironment();

    const environment = loadEnvironment();

    expect(environment.nodeEnv).toBe("test");
    expect(environment.port).toBe(3000);
    expect(environment.databaseUrl).toContain(
      "postgresql://"
    );
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

  it("rejects placeholder secrets in production", () => {
    setRequiredEnvironment();
    process.env.NODE_ENV = "production";
    process.env.JWT_ACCESS_SECRET =
      "replace-with-a-long-random-access-secret";

    expect(() => loadEnvironment()).toThrow(
      "JWT_ACCESS_SECRET must be replaced"
    );
  });
});
