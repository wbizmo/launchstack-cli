"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sensiblePlugin = void 0;
const sensible_1 = __importDefault(require("@fastify/sensible"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
exports.sensiblePlugin = (0, fastify_plugin_1.default)(async (app) => {
    await app.register(sensible_1.default);
}, {
    name: "sensible"
});
