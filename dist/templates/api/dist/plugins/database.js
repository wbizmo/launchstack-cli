"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databasePlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const prisma_1 = require("../lib/prisma");
exports.databasePlugin = (0, fastify_plugin_1.default)(async (app) => {
    app.decorate("prisma", prisma_1.prisma);
    app.addHook("onClose", async () => {
        await prisma_1.prisma.$disconnect();
    });
}, {
    name: "database",
    dependencies: ["config"]
});
