import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  AuthTokens,
  LoginInput,
  RefreshTokenPayload,
  RegisterInput
} from "./auth.types";

const PASSWORD_ROUNDS = 12;

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseRefreshExpiry(value: string): Date {
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error(
      "JWT_REFRESH_EXPIRES_IN must use s, m, h, or d."
    );
  }

  const amountValue = match[1];
  const unitValue = match[2];

  if (!amountValue || !unitValue) {
    throw new Error(
      "JWT_REFRESH_EXPIRES_IN could not be parsed."
    );
  }

  const amount = Number(amountValue);
  const unit = unitValue as "s" | "m" | "h" | "d";

  const multipliers: Record<
    "s" | "m" | "h" | "d",
    number
  > = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return new Date(
    Date.now() + amount * multipliers[unit]
  );
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: AuthenticatedUser["role"];
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

async function issueTokens(
  app: FastifyInstance,
  user: AuthenticatedUser
): Promise<AuthTokens> {
  const accessPayload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: "access"
  };

  const refreshPayload: RefreshTokenPayload = {
    sub: user.id,
    type: "refresh"
  };

  const accessToken = app.jwt.sign(accessPayload, {
    expiresIn: app.config.jwtAccessExpiresIn
  });

  const refreshToken = app.refreshJwt.sign(refreshPayload, {
    expiresIn: app.config.jwtRefreshExpiresIn
  });

  await app.prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt: parseRefreshExpiry(
        app.config.jwtRefreshExpiresIn
      )
    }
  });

  return {
    accessToken,
    refreshToken
  };
}

export async function registerUser(
  app: FastifyInstance,
  input: RegisterInput
): Promise<{
  user: AuthenticatedUser;
  tokens: AuthTokens;
}> {
  const email = input.email.trim().toLowerCase();

  const existingUser = await app.prisma.user.findUnique({
    where: {
      email
    }
  });

  if (existingUser) {
    throw app.httpErrors.conflict(
      "An account with this email already exists."
    );
  }

  const passwordHash = await bcrypt.hash(
    input.password,
    PASSWORD_ROUNDS
  );

  const createdUser = await app.prisma.user.create({
    data: {
      email,
      name: input.name?.trim() || null,
      passwordHash
    }
  });

  const user = toAuthenticatedUser(createdUser);
  const tokens = await issueTokens(app, user);

  return {
    user,
    tokens
  };
}

export async function loginUser(
  app: FastifyInstance,
  input: LoginInput
): Promise<{
  user: AuthenticatedUser;
  tokens: AuthTokens;
}> {
  const email = input.email.trim().toLowerCase();

  const existingUser = await app.prisma.user.findUnique({
    where: {
      email
    }
  });

  if (!existingUser) {
    throw app.httpErrors.unauthorized(
      "Invalid email or password."
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    existingUser.passwordHash
  );

  if (!passwordMatches) {
    throw app.httpErrors.unauthorized(
      "Invalid email or password."
    );
  }

  const user = toAuthenticatedUser(existingUser);
  const tokens = await issueTokens(app, user);

  return {
    user,
    tokens
  };
}

export async function refreshUserTokens(
  app: FastifyInstance,
  refreshToken: string
): Promise<AuthTokens> {
  let payload: RefreshTokenPayload;

  try {
    payload = app.refreshJwt.verify<RefreshTokenPayload>(
      refreshToken
    );
  } catch {
    throw app.httpErrors.unauthorized(
      "Invalid or expired refresh token."
    );
  }

  if (payload.type !== "refresh") {
    throw app.httpErrors.unauthorized(
      "Invalid refresh token."
    );
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken =
    await app.prisma.refreshToken.findUnique({
      where: {
        tokenHash
      },
      include: {
        user: true
      }
    });

  if (
    !storedToken ||
    storedToken.revokedAt ||
    storedToken.expiresAt <= new Date()
  ) {
    throw app.httpErrors.unauthorized(
      "Refresh token is no longer valid."
    );
  }

  await app.prisma.refreshToken.update({
    where: {
      id: storedToken.id
    },
    data: {
      revokedAt: new Date()
    }
  });

  return issueTokens(
    app,
    toAuthenticatedUser(storedToken.user)
  );
}

export async function revokeRefreshToken(
  app: FastifyInstance,
  refreshToken: string
): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);

  await app.prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}
