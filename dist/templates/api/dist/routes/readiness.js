"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readinessRoutes = void 0;
const zod_1 = require("zod");
const runtime_1 = require("../config/runtime");
const readinessResponseSchema = zod_1.z.object({
    status: zod_1.z.enum(["ready", "not_ready"]),
    database: zod_1.z.enum(["connected", "unavailable"]),
    runtime: zod_1.z.object({
        nodeVersion: zod_1.z.string(),
        platform: zod_1.z.string(),
        pid: zod_1.z.number().int(),
        startedAt: zod_1.z.string().datetime()
    }),
    timestamp: zod_1.z.string().datetime()
});
const readinessRoutes = async (app) => {
    app.get("/ready", {
        schema: {
            tags: ["System"],
            summary: "Check application readiness",
            description: "Verifies that the API and database are ready to serve traffic.",
            response: {
                200: readinessResponseSchema,
                503: readinessResponseSchema
            }
        }
    }, async (_request, reply) => {
        try {
            await app.prisma.$queryRaw `SELECT 1`;
            return {
                status: "ready",
                database: "connected",
                runtime: (0, runtime_1.getRuntimeInfo)(),
                timestamp: new Date().toISOString()
            };
        }
        catch {
            return reply.status(503).send({
                status: "not_ready",
                database: "unavailable",
                runtime: (0, runtime_1.getRuntimeInfo)(),
                timestamp: new Date().toISOString()
            });
        }
    });
};
exports.readinessRoutes = readinessRoutes;
