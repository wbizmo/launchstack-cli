import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getRuntimeInfo } from "../config/runtime";

const readinessResponseSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  database: z.enum(["connected", "unavailable"]),
  runtime: z.object({
    nodeVersion: z.string(),
    platform: z.string(),
    pid: z.number().int(),
    startedAt: z.string().datetime()
  }),
  timestamp: z.string().datetime()
});

export const readinessRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/ready",
    {
      schema: {
        tags: ["System"],
        summary: "Check application readiness",
        description:
          "Verifies that the API and database are ready to serve traffic.",
        response: {
          200: readinessResponseSchema,
          503: readinessResponseSchema
        }
      }
    },
    async (_request, reply) => {
      try {
        await app.prisma.$queryRaw`SELECT 1`;

        return {
          status: "ready" as const,
          database: "connected" as const,
          runtime: getRuntimeInfo(),
          timestamp: new Date().toISOString()
        };
      } catch {
        return reply.status(503).send({
          status: "not_ready" as const,
          database: "unavailable" as const,
          runtime: getRuntimeInfo(),
          timestamp: new Date().toISOString()
        });
      }
    }
  );
};
