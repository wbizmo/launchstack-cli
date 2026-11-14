"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userEnvelopeSchema = exports.tokenResponseSchema = exports.authResponseSchema = exports.authResultSchema = exports.tokenPairSchema = exports.userResponseSchema = exports.userRoleSchema = void 0;
const zod_1 = require("zod");
exports.userRoleSchema = zod_1.z.enum([
    "USER",
    "ADMIN"
]);
exports.userResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string().nullable(),
    role: exports.userRoleSchema,
    createdAt: zod_1.z.union([
        zod_1.z.date(),
        zod_1.z.string().datetime()
    ]),
    updatedAt: zod_1.z.union([
        zod_1.z.date(),
        zod_1.z.string().datetime()
    ])
});
exports.tokenPairSchema = zod_1.z.object({
    accessToken: zod_1.z.string().min(1),
    refreshToken: zod_1.z.string().min(1)
});
exports.authResultSchema = zod_1.z.object({
    user: exports.userResponseSchema.omit({
        createdAt: true,
        updatedAt: true
    }),
    tokens: exports.tokenPairSchema
});
exports.authResponseSchema = zod_1.z.object({
    data: exports.authResultSchema
});
exports.tokenResponseSchema = zod_1.z.object({
    data: exports.tokenPairSchema
});
exports.userEnvelopeSchema = zod_1.z.object({
    data: exports.userResponseSchema
});
