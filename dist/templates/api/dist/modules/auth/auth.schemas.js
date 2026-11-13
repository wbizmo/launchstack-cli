"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meSchema = exports.logoutSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = exports.refreshBodySchema = exports.loginBodySchema = exports.registerBodySchema = void 0;
const zod_1 = require("zod");
const auth_1 = require("../../schemas/auth");
const common_1 = require("../../schemas/common");
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 128;
const REFRESH_TOKEN_MAX_LENGTH = 4096;
exports.registerBodySchema = zod_1.z.object({
    email: zod_1.z.string().email().max(EMAIL_MAX_LENGTH),
    password: zod_1.z.string().min(8).max(PASSWORD_MAX_LENGTH),
    name: zod_1.z.string()
        .trim()
        .min(1)
        .max(100)
        .optional()
});
exports.loginBodySchema = zod_1.z.object({
    email: zod_1.z.string().email().max(EMAIL_MAX_LENGTH),
    password: zod_1.z.string().min(1).max(PASSWORD_MAX_LENGTH)
});
exports.refreshBodySchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1).max(REFRESH_TOKEN_MAX_LENGTH)
});
exports.registerSchema = {
    tags: [
        "Authentication"
    ],
    summary: "Register a user",
    description: "Creates a user account and returns access and refresh tokens.",
    body: exports.registerBodySchema,
    response: {
        201: auth_1.authResponseSchema,
        409: common_1.errorResponseSchema,
        429: common_1.errorResponseSchema
    }
};
exports.loginSchema = {
    tags: [
        "Authentication"
    ],
    summary: "Log in a user",
    description: "Authenticates credentials and returns access and refresh tokens.",
    body: exports.loginBodySchema,
    response: {
        200: auth_1.authResponseSchema,
        401: common_1.errorResponseSchema,
        429: common_1.errorResponseSchema
    }
};
exports.refreshSchema = {
    tags: [
        "Authentication"
    ],
    summary: "Refresh authentication tokens",
    description: "Rotates a valid refresh token and returns a new token pair.",
    body: exports.refreshBodySchema,
    response: {
        200: auth_1.tokenResponseSchema,
        401: common_1.errorResponseSchema,
        429: common_1.errorResponseSchema
    }
};
exports.logoutSchema = {
    tags: [
        "Authentication"
    ],
    summary: "Log out a user",
    description: "Revokes the supplied refresh token.",
    body: exports.refreshBodySchema,
    response: {
        204: zod_1.z.null(),
        429: common_1.errorResponseSchema
    }
};
exports.meSchema = {
    tags: [
        "Authentication"
    ],
    summary: "Get the authenticated user",
    description: "Returns the currently authenticated user's public profile.",
    security: [
        {
            bearerAuth: []
        }
    ],
    response: {
        200: auth_1.userEnvelopeSchema,
        401: common_1.errorResponseSchema,
        404: common_1.errorResponseSchema
    }
};
