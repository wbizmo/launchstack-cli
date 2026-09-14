import rateLimit from "@fastify/rate-limit";
import fp from "fastify-plugin";

export const rateLimitPlugin = fp(
  async (app) => {
    await app.register(rateLimit, {
      global: false,
      errorResponseBuilder: (request, context) => ({
        statusCode: 429,
        error: "Too Many Requests",
        message: `Rate limit exceeded, retry in ${context.after}`,
        requestId: request.id
      })
    });
  },
  {
    name: "rate-limit",
    dependencies: ["config"]
  }
);
