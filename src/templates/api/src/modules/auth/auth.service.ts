import {
  createHash,
  randomUUID
} from "node:crypto";
import {
  Prisma
} from "@prisma/client";
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

function invalidRefreshToken(
  message = "Refresh token is no longer valid."
): ApplicationError {
  return new ApplicationError({
    statusCode: 401,
    code: ErrorCode.AuthenticationRequired,
    message
  });
}

function duplicateEmailError(): ApplicationError {
  return new ApplicationError({
    statusCode: 409,
    code: ErrorCode.ResourceConflict,
    message:
      "An account with this email already exists."
  });
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
    jti: randomUUID(),
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
    app.jwt.sign(
      refreshPayload,
      {
        key:
          app.config.jwtRefreshSecret,
        expiresIn:
          app.config.jwtRefreshExpiresIn
      }
    );

  await repository.createRefreshToken({
    tokenHash:
      hashRefreshToken(refreshToken),
    userId: user.id,
    expiresAt: new Date(
      Date.now() + app.config.jwtRefreshExpiresInMs
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
      throw duplicateEmailError();
    }

    const passwordHash =
      await bcrypt.hash(
        input.password,
        PASSWORD_ROUNDS
      );

    let createdUser;

    try {
      createdUser =
        await this.repository.createUser({
          email,
          name:
            input.name?.trim() || null,
          passwordHash
        });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw duplicateEmailError();
      }

      throw error;
    }

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
        this.app.jwt.verify<
          RefreshTokenPayload
        >(
          refreshToken,
          {
            key:
              this.app.config.jwtRefreshSecret
          }
        );
    } catch {
      throw invalidRefreshToken(
        "Invalid or expired refresh token."
      );
    }

    if (payload.type !== "refresh") {
      throw invalidRefreshToken(
        "Invalid refresh token."
      );
    }

    const tokenHash =
      hashRefreshToken(refreshToken);

    return this.app.prisma.$transaction(
      async (transaction) => {
        const repository =
          new AuthRepository(transaction);
        const storedToken =
          await repository.findRefreshTokenWithUser(
            tokenHash
          );

        if (
          !storedToken ||
          storedToken.revokedAt ||
          storedToken.expiresAt <= new Date()
        ) {
          throw invalidRefreshToken();
        }

        const consumed =
          await repository.consumeRefreshToken(
            tokenHash,
            new Date()
          );

        if (consumed.count !== 1) {
          throw invalidRefreshToken();
        }

        return issueTokens(
          this.app,
          repository,
          toAuthenticatedUser(
            storedToken.user
          )
        );
      }
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
