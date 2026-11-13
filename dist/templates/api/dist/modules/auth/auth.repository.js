"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
class AuthRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findUserByEmail(email) {
        return this.prisma.user.findUnique({
            where: {
                email
            }
        });
    }
    createUser(input) {
        return this.prisma.user.create({
            data: input
        });
    }
    createRefreshToken(input) {
        return this.prisma.refreshToken.create({
            data: input
        });
    }
    findRefreshTokenWithUser(tokenHash) {
        return this.prisma.refreshToken.findUnique({
            where: {
                tokenHash
            },
            include: {
                user: true
            }
        });
    }
    consumeRefreshToken(tokenHash, now) {
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
    revokeRefreshTokensByHash(tokenHash) {
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
exports.AuthRepository = AuthRepository;
