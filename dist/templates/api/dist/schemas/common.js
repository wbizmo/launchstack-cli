"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseHealthResponseSchema = exports.healthResponseSchema = exports.errorResponseSchema = void 0;
const zod_1 = require("zod");
exports.errorResponseSchema = zod_1.z.object({
    statusCode: zod_1.z.number().int(),
    error: zod_1.z.string(),
    message: zod_1.z.string(),
    requestId: zod_1.z.string()
});
exports.healthResponseSchema = zod_1.z.object({
    status: zod_1.z.literal("ok"),
    service: zod_1.z.string(),
    environment: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    uptime: zod_1.z.number()
});
exports.databaseHealthResponseSchema = zod_1.z.object({
    status: zod_1.z.enum(["ok", "error"]),
    database: zod_1.z.enum(["connected", "unavailable"]),
    timestamp: zod_1.z.string().datetime()
});
