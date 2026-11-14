"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const application_error_1 = require("../../core/errors/application-error");
const error_codes_1 = require("../../core/errors/error-codes");
const auth_repository_1 = require("./auth.repository");
const PASSWORD_ROUNDS = 12;
function hashRefreshToken(token) {
    return (0, node_crypto_1.createHash)("sha256")
        .update(token)
        .digest("hex");
}
function toAuthenticatedUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
    };
}
function invalidRefreshToken(message = "Refresh token is no longer valid.") {
    return new application_error_1.ApplicationError({
        statusCode: 401,
        code: error_codes_1.ErrorCode.AuthenticationRequired,
        message
    });
}
function duplicateEmailError() {
    return new application_error_1.ApplicationError({
        statusCode: 409,
        code: error_codes_1.ErrorCode.ResourceConflict,
        message: "An account with this email already exists."
    });
}
async function issueTokens(app, repository, user) {
    const accessPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: "access"
    };
    const refreshPayload = {
        sub: user.id,
        jti: (0, node_crypto_1.randomUUID)(),
        type: "refresh"
    };
    const accessToken = app.jwt.sign(accessPayload, {
        expiresIn: app.config.jwtAccessExpiresIn
    });
    const refreshToken = app.jwt.sign(refreshPayload, {
        key: app.config.jwtRefreshSecret,
        expiresIn: app.config.jwtRefreshExpiresIn
    });
    await repository.createRefreshToken({
        tokenHash: hashRefreshToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + app.config.jwtRefreshExpiresInMs)
    });
    return {
        accessToken,
        refreshToken
    };
}
class AuthService {
    constructor(app) {
        this.app = app;
        this.repository =
            new auth_repository_1.AuthRepository(app.prisma);
    }
    async register(input) {
        const email = input.email.trim().toLowerCase();
        const existingUser = await this.repository.findUserByEmail(email);
        if (existingUser) {
            throw duplicateEmailError();
        }
        const passwordHash = await bcryptjs_1.default.hash(input.password, PASSWORD_ROUNDS);
        let createdUser;
        try {
            createdUser =
                await this.repository.createUser({
                    email,
                    name: input.name?.trim() || null,
                    passwordHash
                });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002") {
                throw duplicateEmailError();
            }
            throw error;
        }
        const user = toAuthenticatedUser(createdUser);
        const tokens = await issueTokens(this.app, this.repository, user);
        return {
            user,
            tokens
        };
    }
    async login(input) {
        const email = input.email.trim().toLowerCase();
        const existingUser = await this.repository.findUserByEmail(email);
        if (!existingUser) {
            throw new application_error_1.ApplicationError({
                statusCode: 401,
                code: error_codes_1.ErrorCode.InvalidCredentials,
                message: "Invalid email or password."
            });
        }
        const passwordMatches = await bcryptjs_1.default.compare(input.password, existingUser.passwordHash);
        if (!passwordMatches) {
            throw new application_error_1.ApplicationError({
                statusCode: 401,
                code: error_codes_1.ErrorCode.InvalidCredentials,
                message: "Invalid email or password."
            });
        }
        const user = toAuthenticatedUser(existingUser);
        const tokens = await issueTokens(this.app, this.repository, user);
        return {
            user,
            tokens
        };
    }
    async refresh(refreshToken) {
        let payload;
        try {
            payload =
                this.app.jwt.verify(refreshToken, {
                    key: this.app.config.jwtRefreshSecret
                });
        }
        catch {
            throw invalidRefreshToken("Invalid or expired refresh token.");
        }
        if (payload.type !== "refresh") {
            throw invalidRefreshToken("Invalid refresh token.");
        }
        const tokenHash = hashRefreshToken(refreshToken);
        return this.app.prisma.$transaction(async (transaction) => {
            const repository = new auth_repository_1.AuthRepository(transaction);
            const storedToken = await repository.findRefreshTokenWithUser(tokenHash);
            if (!storedToken ||
                storedToken.revokedAt ||
                storedToken.expiresAt <= new Date()) {
                throw invalidRefreshToken();
            }
            const consumed = await repository.consumeRefreshToken(tokenHash, new Date());
            if (consumed.count !== 1) {
                throw invalidRefreshToken();
            }
            return issueTokens(this.app, repository, toAuthenticatedUser(storedToken.user));
        });
    }
    async logout(refreshToken) {
        await this.repository
            .revokeRefreshTokensByHash(hashRefreshToken(refreshToken));
    }
}
exports.AuthService = AuthService;
