import type { FastifyPluginAsync } from "fastify";
import {
  databaseHealthResponseSchema,
  healthResponseSchema
} from "../schemas/common";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["System"],
        summary: "Check API health",
        description:
          "Returns the current process status and basic runtime information.",
        response: {
          200: healthResponseSchema
        }
      }
    },
    async () => {
      return {
        status: "ok" as const,
        service: "{{PROJECT_NAME}}",
        environment: app.config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
    }
  );

  app.get(
    "/health/database",
    {
      schema: {
        tags: ["System"],
        summary: "Check database connectivity",
        description:
          "Runs a lightweight query to verify PostgreSQL connectivity.",
        response: {
          200: databaseHealthResponseSchema,
          503: databaseHealthResponseSchema
        }
      }
    },
    async (_request, reply) => {
      try {
        await app.prisma.$queryRaw`SELECT 1`;

        return {
          status: "ok" as const,
          database: "connected" as const,
          timestamp: new Date().toISOString()
        };
      } catch {
        return reply.status(503).send({
          status: "error" as const,
          database: "unavailable" as const,
          timestamp: new Date().toISOString()
        });
      }
    }
  );
};
