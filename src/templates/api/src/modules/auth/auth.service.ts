import {
  createHash
} from "node:crypto";
import bcrypt from "bcryptjs";
import type {
  FastifyInstance
} from "fastify";
import {
  ApplicationError
} from "../../core/errors/application-error";
import {
  ErrorCode
} from "../../core/errors/error-codes";
import {
  AuthRepository
} from "./auth.repository";
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  AuthTokens,
  LoginInput,
  RefreshTokenPayload,
  RegisterInput
} from "./auth.types";

const PASSWORD_ROUNDS = 12;

function hashRefreshToken(
  token: string
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function parseRefreshExpiry(
  value: string
): Date {
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
  const unit =
    unitValue as "s" | "m" | "h" | "d";

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
  repository: AuthRepository,
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

  const accessToken = app.jwt.sign(
    accessPayload,
    {
      expiresIn:
        app.config.jwtAccessExpiresIn
    }
  );

  const refreshToken =
    app.refreshJwt.sign(
      refreshPayload,
      {
        expiresIn:
          app.config.jwtRefreshExpiresIn
      }
    );

  await repository.createRefreshToken({
    tokenHash:
      hashRefreshToken(refreshToken),
    userId: user.id,
    expiresAt: parseRefreshExpiry(
      app.config.jwtRefreshExpiresIn
    )
  });

  return {
    accessToken,
    refreshToken
  };
}

export class AuthService {
  private readonly repository: AuthRepository;

  constructor(
    private readonly app: FastifyInstance
  ) {
    this.repository =
      new AuthRepository(app.prisma);
  }

  async register(
    input: RegisterInput
  ): Promise<{
    user: AuthenticatedUser;
    tokens: AuthTokens;
  }> {
    const email =
      input.email.trim().toLowerCase();

    const existingUser =
      await this.repository.findUserByEmail(
        email
      );

    if (existingUser) {
      throw new ApplicationError({
        statusCode: 409,
        code: ErrorCode.ResourceConflict,
        message:
          "An account with this email already exists."
      });
    }

    const passwordHash =
      await bcrypt.hash(
        input.password,
        PASSWORD_ROUNDS
      );

    const createdUser =
      await this.repository.createUser({
        email,
        name:
          input.name?.trim() || null,
        passwordHash
      });

    const user =
      toAuthenticatedUser(createdUser);

    const tokens = await issueTokens(
      this.app,
      this.repository,
      user
    );

    return {
      user,
      tokens
    };
  }

  async login(
    input: LoginInput
  ): Promise<{
    user: AuthenticatedUser;
    tokens: AuthTokens;
  }> {
    const email =
      input.email.trim().toLowerCase();

    const existingUser =
      await this.repository.findUserByEmail(
        email
      );

    if (!existingUser) {
      throw new ApplicationError({
        statusCode: 401,
        code: ErrorCode.InvalidCredentials,
        message:
          "Invalid email or password."
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        input.password,
        existingUser.passwordHash
      );

    if (!passwordMatches) {
      throw new ApplicationError({
        statusCode: 401,
        code: ErrorCode.InvalidCredentials,
        message:
          "Invalid email or password."
      });
    }

    const user =
      toAuthenticatedUser(existingUser);

    const tokens = await issueTokens(
      this.app,
      this.repository,
      user
    );

    return {
      user,
      tokens
    };
  }

  async refresh(
    refreshToken: string
  ): Promise<AuthTokens> {
    let payload: RefreshTokenPayload;

    try {
      payload =
        this.app.refreshJwt.verify<
          RefreshTokenPayload
        >(refreshToken);
    } catch {
      throw new ApplicationError({
        statusCode: 401,
        code:
          ErrorCode.AuthenticationRequired,
        message:
          "Invalid or expired refresh token."
      });
    }

    if (payload.type !== "refresh") {
      throw new ApplicationError({
        statusCode: 401,
        code:
          ErrorCode.AuthenticationRequired,
        message:
          "Invalid refresh token."
      });
    }

    const tokenHash =
      hashRefreshToken(refreshToken);

    const storedToken =
      await this.repository
        .findRefreshTokenWithUser(
          tokenHash
        );

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new ApplicationError({
        statusCode: 401,
        code:
          ErrorCode.AuthenticationRequired,
        message:
          "Refresh token is no longer valid."
      });
    }

    await this.repository
      .revokeRefreshToken(
        storedToken.id
      );

    return issueTokens(
      this.app,
      this.repository,
      toAuthenticatedUser(
        storedToken.user
      )
    );
  }

  async logout(
    refreshToken: string
  ): Promise<void> {
    await this.repository
      .revokeRefreshTokensByHash(
        hashRefreshToken(refreshToken)
      );
  }
}
