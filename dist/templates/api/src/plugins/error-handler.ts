import type {
  FastifyError
} from "fastify";
import fp from "fastify-plugin";
import {
  ApplicationError
} from "../core/errors/application-error";
import {
  ErrorCode
} from "../core/errors/error-codes";

function getClientErrorName(
  error: FastifyError
): string {
  const publicError = (
    error as FastifyError & {
      error?: unknown;
    }
  ).error;

  if (
    typeof publicError === "string" &&
    publicError.length > 0
  ) {
    return publicError;
  }

  if (
    typeof error.code === "string" &&
    error.code.length > 0
  ) {
    return error.code;
  }

  if (
    typeof error.name === "string" &&
    error.name.length > 0
  ) {
    return error.name;
  }

  return "Request Error";
}

export const errorHandlerPlugin = fp(
  async (app) => {
    app.setErrorHandler(
      (
        error: FastifyError,
        request,
        reply
      ) => {
        request.log.error(
          {
            error,
            requestId: request.id
          },
          "Request failed"
        );

        if (
          error instanceof
          ApplicationError
        ) {
          return reply
            .status(error.statusCode)
            .send({
              statusCode:
                error.statusCode,
              error: error.code,
              message:
                error.message,
              requestId:
                request.id
            });
        }

        const statusCode =
          typeof error.statusCode ===
          "number"
            ? error.statusCode
            : 500;

        const isServerError =
          statusCode >= 500;

        return reply
          .status(statusCode)
          .send({
            statusCode,
            error:
              isServerError
                ? ErrorCode.InternalError
                : getClientErrorName(error),
            message:
              isServerError
                ? "Internal Server Error"
                : error.message,
            requestId:
              request.id
          });
      }
    );

    app.setNotFoundHandler(
      (request, reply) => {
        return reply.status(404).send({
          statusCode: 404,
          error:
            ErrorCode.ResourceNotFound,
          message:
            `Route ${request.method}:${request.url} not found`,
          requestId: request.id
        });
      }
    );
  },
  {
    name: "error-handler"
  }
);
