"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsPlugin = void 0;
const cors_1 = __importDefault(require("@fastify/cors"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
exports.corsPlugin = (0, fastify_plugin_1.default)(async (app) => {
    await app.register(cors_1.default, {
        origin: app.config.corsOrigin
    });
}, {
    name: "cors",
    dependencies: ["config"]
});
