import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["System"],
        summary: "Check API health",
        response: {
          200: {
            type: "object",
            required: [
              "status",
              "service",
              "environment",
              "timestamp",
              "uptime"
            ],
            properties: {
              status: {
                type: "string"
              },
              service: {
                type: "string"
              },
              environment: {
                type: "string"
              },
              timestamp: {
                type: "string"
              },
              uptime: {
                type: "number"
              }
            }
          }
        }
      }
    },
    async () => {
      return {
        status: "ok",
        service: "{{PROJECT_NAME}}",
        environment: app.config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
    }
  );

  app.get(
    "/health/database",
    {},
    async (_request, reply) => {
      try {
        await app.prisma.$queryRaw`SELECT 1`;

        return {
          status: "ok",
          database: "connected",
          timestamp: new Date().toISOString()
        };
      } catch {
        return reply.status(503).send({
          status: "error",
          database: "unavailable",
          timestamp: new Date().toISOString()
        });
      }
    }
  );
};
