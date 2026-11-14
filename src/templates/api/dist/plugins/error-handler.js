"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandlerPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const application_error_1 = require("../core/errors/application-error");
const error_codes_1 = require("../core/errors/error-codes");
function getClientErrorName(error) {
    const publicError = error.error;
    if (typeof publicError === "string" &&
        publicError.length > 0) {
        return publicError;
    }
    if (typeof error.code === "string" &&
        error.code.length > 0) {
        return error.code;
    }
    if (typeof error.name === "string" &&
        error.name.length > 0) {
        return error.name;
    }
    return "Request Error";
}
exports.errorHandlerPlugin = (0, fastify_plugin_1.default)(async (app) => {
    app.setErrorHandler((error, request, reply) => {
        request.log.error({
            error,
            requestId: request.id
        }, "Request failed");
        if (error instanceof
            application_error_1.ApplicationError) {
            return reply
                .status(error.statusCode)
                .send({
                statusCode: error.statusCode,
                error: error.code,
                message: error.message,
                requestId: request.id
            });
        }
        const statusCode = typeof error.statusCode ===
            "number"
            ? error.statusCode
            : 500;
        const isServerError = statusCode >= 500;
        return reply
            .status(statusCode)
            .send({
            statusCode,
            error: isServerError
                ? error_codes_1.ErrorCode.InternalError
                : getClientErrorName(error),
            message: isServerError
                ? "Internal Server Error"
                : error.message,
            requestId: request.id
        });
    });
    app.setNotFoundHandler((request, reply) => {
        return reply.status(404).send({
            statusCode: 404,
            error: error_codes_1.ErrorCode.ResourceNotFound,
            message: `Route ${request.method}:${request.url} not found`,
            requestId: request.id
        });
    });
}, {
    name: "error-handler"
});
