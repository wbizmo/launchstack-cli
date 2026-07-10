import fp from "fastify-plugin";
import type { FastifyError } from "fastify";

export const errorHandlerPlugin = fp(
  async (app) => {
    app.setErrorHandler((error: FastifyError, request, reply) => {
      request.log.error(
        {
          error,
          requestId: request.id
        },
        "Request failed"
      );

      const statusCode =
        typeof error.statusCode === "number"
          ? error.statusCode
          : 500;

      const message =
        statusCode >= 500
          ? "Internal Server Error"
          : error.message;

      return reply.status(statusCode).send({
        statusCode,
        error:
          statusCode >= 500
            ? "Internal Server Error"
            : error.name,
        message,
        requestId: request.id
      });
    });

    app.setNotFoundHandler((request, reply) => {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: `Route ${request.method}:${request.url} not found`,
        requestId: request.id
      });
    });
  },
  {
    name: "error-handler"
  }
);