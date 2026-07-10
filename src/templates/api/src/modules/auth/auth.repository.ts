import type {
  PrismaClient,
  RefreshToken,
  User
} from "@prisma/client";

export class AuthRepository {
  constructor(
    private readonly prisma: PrismaClient
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

  revokeRefreshToken(id: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: {
        id
      },
      data: {
        revokedAt: new Date()
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
