import type {
  Prisma,
  PrismaClient,
  RefreshToken,
  User
} from "@prisma/client";

type AuthDatabase = PrismaClient | Prisma.TransactionClient;

export class AuthRepository {
  constructor(
    private readonly prisma: AuthDatabase
  ) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email
      }
    });
  }

  createUser(input: {
    email: string;
    name: string | null;
    passwordHash: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: input
    });
  }

  createRefreshToken(input: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: input
    });
  }

  findRefreshTokenWithUser(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({
      where: {
        tokenHash
      },
      include: {
        user: true
      }
    });
  }

  consumeRefreshToken(
    tokenHash: string,
    now: Date
  ): Promise<{
    count: number;
  }> {
    return this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now
        }
      },
      data: {
        revokedAt: now
      }
    });
  }

  revokeRefreshTokensByHash(
    tokenHash: string
  ): Promise<{
    count: number;
  }> {
    return this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }
}
