"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authPlugin = void 0;
const jwt_1 = __importDefault(require("@fastify/jwt"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
exports.authPlugin = (0, fastify_plugin_1.default)(async (app) => {
    await app.register(jwt_1.default, {
        secret: app.config.jwtAccessSecret
    });
    app.decorate("authenticate", async (request) => {
        try {
            const payload = await request.jwtVerify();
            if (payload.type !== "access") {
                throw new Error("Invalid token type.");
            }
        }
        catch {
            throw app.httpErrors.unauthorized("Authentication is required.");
        }
    });
}, {
    name: "auth",
    dependencies: [
        "config",
        "sensible"
    ]
});
