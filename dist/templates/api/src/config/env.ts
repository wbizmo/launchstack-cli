export type AppEnvironment = {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  logLevel: string;
  corsOrigin: string;
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

export function loadEnvironment(): AppEnvironment {
  return {
    nodeEnv: parseNodeEnvironment(process.env.NODE_ENV),
    host: process.env.HOST ?? "0.0.0.0",
    port: parsePort(process.env.PORT),
    logLevel: process.env.LOG_LEVEL ?? "info",
    corsOrigin: process.env.CORS_ORIGIN ?? "*"
  };
}
