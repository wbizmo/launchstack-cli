import "dotenv/config";

export type NodeEnvironment =
  | "development"
  | "test"
  | "production";

export type AppEnvironment = {
  nodeEnv: NodeEnvironment;
  host: string;
  port: number;
  logLevel: string;
  corsOrigin: true | string[];
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  jwtAccessExpiresInMs: number;
  jwtRefreshExpiresInMs: number;
  authRateLimitMax: number;
  authRateLimitWindowMs: number;
};

const MAX_TOKEN_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

function parsePositiveInteger(
  name: string,
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? 3000);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0 ||
    parsed > 65535
  ) {
    throw new Error(
      "PORT must be an integer between 1 and 65535."
    );
  }

  return parsed;
}

function parseNodeEnvironment(
  value: string | undefined
): NodeEnvironment {
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

  return value.trim();
}

function validateJwtSecret(
  name: string,
  value: string | undefined,
  environment: NodeEnvironment
): string {
  const secret = requireEnvironmentVariable(name, value);

  if (secret.length < 32) {
    throw new Error(
      `${name} must contain at least 32 characters.`
    );
  }

  if (
    environment === "production" &&
    secret.startsWith("replace-with-")
  ) {
    throw new Error(
      `${name} must be replaced before running in production.`
    );
  }

  return secret;
}

function parseDuration(
  name: string,
  value: string
): {
  raw: string;
  milliseconds: number;
} {
  const match = /^(\d+)([smhd])$/.exec(value.trim());

  if (!match) {
    throw new Error(
      `${name} must be a positive duration using s, m, h, or d.`
    );
  }

  const amount = Number(match[1]);
  const unit = match[2] as "s" | "m" | "h" | "d";
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  } satisfies Record<typeof unit, number>;
  const milliseconds = amount * multipliers[unit];

  if (
    !Number.isSafeInteger(milliseconds) ||
    amount <= 0 ||
    milliseconds > MAX_TOKEN_DURATION_MS
  ) {
    throw new Error(
      `${name} must be greater than zero and no longer than 365 days.`
    );
  }

  return {
    raw: `${amount}${unit}`,
    milliseconds
  };
}

function parseCorsOrigin(
  value: string | undefined,
  environment: NodeEnvironment,
  allowInsecureWildcard: boolean
): true | string[] {
  const configured = value?.trim() || "*";

  if (configured === "*") {
    if (
      environment === "production" &&
      !allowInsecureWildcard
    ) {
      throw new Error(
        "CORS_ORIGIN must contain an explicit production origin allowlist. Set ALLOW_INSECURE_CORS=true only if unrestricted browser origins are intentional."
      );
    }

    return true;
  }

  const origins = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGIN must contain at least one origin.");
  }

  for (const origin of origins) {
    let url: URL;

    try {
      url = new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGIN contains an invalid absolute origin: ${origin}`);
    }

    if (url.origin !== origin || (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1" && url.hostname !== "::1")) {
      throw new Error(`CORS_ORIGIN contains an unsafe origin: ${origin}`);
    }
  }

  return origins;
}

export function loadEnvironment(): AppEnvironment {
  const nodeEnv = parseNodeEnvironment(
    process.env.NODE_ENV
  );
  const accessExpiry = parseDuration(
    "JWT_ACCESS_EXPIRES_IN",
    process.env.JWT_ACCESS_EXPIRES_IN ?? "15m"
  );
  const refreshExpiry = parseDuration(
    "JWT_REFRESH_EXPIRES_IN",
    process.env.JWT_REFRESH_EXPIRES_IN ?? "7d"
  );

  return {
    nodeEnv,
    host: process.env.HOST ?? "0.0.0.0",
    port: parsePort(process.env.PORT),
    logLevel: process.env.LOG_LEVEL ?? "info",
    corsOrigin: parseCorsOrigin(
      process.env.CORS_ORIGIN,
      nodeEnv,
      process.env.ALLOW_INSECURE_CORS === "true"
    ),
    databaseUrl: requireEnvironmentVariable(
      "DATABASE_URL",
      process.env.DATABASE_URL
    ),
    jwtAccessSecret: validateJwtSecret(
      "JWT_ACCESS_SECRET",
      process.env.JWT_ACCESS_SECRET,
      nodeEnv
    ),
    jwtRefreshSecret: validateJwtSecret(
      "JWT_REFRESH_SECRET",
      process.env.JWT_REFRESH_SECRET,
      nodeEnv
    ),
    jwtAccessExpiresIn: accessExpiry.raw,
    jwtRefreshExpiresIn: refreshExpiry.raw,
    jwtAccessExpiresInMs: accessExpiry.milliseconds,
    jwtRefreshExpiresInMs: refreshExpiry.milliseconds,
    authRateLimitMax: parsePositiveInteger(
      "AUTH_RATE_LIMIT_MAX",
      process.env.AUTH_RATE_LIMIT_MAX,
      20
    ),
    authRateLimitWindowMs: parsePositiveInteger(
      "AUTH_RATE_LIMIT_WINDOW_MS",
      process.env.AUTH_RATE_LIMIT_WINDOW_MS,
      60_000
    )
  };
}
