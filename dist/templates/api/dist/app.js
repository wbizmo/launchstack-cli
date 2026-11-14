"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const plugins_1 = require("./plugins");
const capabilities_1 = require("./launchstack/capabilities");
const routes_1 = require("./routes");
async function buildApp() {
    const app = (0, fastify_1.default)({ logger: { level: process.env.LOG_LEVEL ?? "info" }, requestIdHeader: "x-request-id" }).withTypeProvider();
    app.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
    app.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
    await (0, plugins_1.registerPlugins)(app);
    await (0, capabilities_1.registerLaunchStackCapabilities)(app);
    await (0, routes_1.registerRoutes)(app);
    return app;
}
