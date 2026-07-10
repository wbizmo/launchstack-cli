import "dotenv/config";

export type AppEnvironment = {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  logLevel: string;
  corsOrigin: string;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
};

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? 3000);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return parsed;
}

function parseNodeEnvironment(
  value: string | undefined
): AppEnvironment["nodeEnv"] {
  const environment = value ?? "development";

  if (
    environment !== "development" &&
    environment !== "test" &&
    environment !== "production"
  ) {
    throw new Error(
      "NODE_ENV must be development, test, or production."
    );
  }

  return environment;
}

function requireEnvironmentVariable(
  name: string,
  value: string | undefined
): string {
  if (!value || !value.trim()) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function loadEnvironment(): AppEnvironment {
  return {
    nodeEnv: parseNodeEnvironment(process.env.NODE_ENV),
    host: process.env.HOST ?? "0.0.0.0",
    port: parsePort(process.env.PORT),
    logLevel: process.env.LOG_LEVEL ?? "info",
    corsOrigin: process.env.CORS_ORIGIN ?? "*",
    databaseUrl: requireEnvironmentVariable(
      "DATABASE_URL",
      process.env.DATABASE_URL
    ),
    jwtAccessSecret: requireEnvironmentVariable(
      "JWT_ACCESS_SECRET",
      process.env.JWT_ACCESS_SECRET
    ),
    jwtRefreshSecret: requireEnvironmentVariable(
      "JWT_REFRESH_SECRET",
      process.env.JWT_REFRESH_SECRET
    ),
    jwtAccessExpiresIn:
      process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    jwtRefreshExpiresIn:
      process.env.JWT_REFRESH_EXPIRES_IN ?? "7d"
  };
}
