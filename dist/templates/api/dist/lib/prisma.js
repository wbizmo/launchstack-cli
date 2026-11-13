"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
exports.prisma = globalThis.launchStackPrisma ??
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === "development"
            ? ["warn", "error"]
            : ["error"]
    });
if (process.env.NODE_ENV !== "production") {
    globalThis.launchStackPrisma = exports.prisma;
}
