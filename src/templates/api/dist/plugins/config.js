"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const env_1 = require("../config/env");
exports.configPlugin = (0, fastify_plugin_1.default)(async (app) => {
    const config = (0, env_1.loadEnvironment)();
    app.decorate("config", config);
}, {
    name: "config"
});
