import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["System"],
        summary: "Check API health",
        description: "Returns the current process status and basic runtime information.",
        response: { 200: { $ref: "HealthResponse#" } }
      }
    },
    async () => ({
      status: "ok",
      service: "{{PROJECT_NAME}}",
      environment: app.config.nodeEnv,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  );

  app.get(
    "/health/database",
    {
      schema: {
        tags: ["System"],
        summary: "Check database connectivity",
        description: "Runs a lightweight query to verify PostgreSQL connectivity.",
        response: {
          200: { $ref: "DatabaseHealthResponse#" },
          503: { $ref: "DatabaseHealthResponse#" }
        }
      }
    },
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
