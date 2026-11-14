"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitPlugin = void 0;
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
exports.rateLimitPlugin = (0, fastify_plugin_1.default)(async (app) => {
    await app.register(rate_limit_1.default, {
        global: false,
        errorResponseBuilder: (request, context) => ({
            statusCode: 429,
            error: "Too Many Requests",
            message: `Rate limit exceeded, retry in ${context.after}`,
            requestId: request.id
        })
    });
}, {
    name: "rate-limit",
    dependencies: ["config"]
});
