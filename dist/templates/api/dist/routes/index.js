"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const auth_routes_1 = require("../modules/auth/auth.routes");
const launchstack_generated_1 = require("./launchstack.generated");
const health_1 = require("./health");
const readiness_1 = require("./readiness");
async function registerRoutes(app) {
    await app.register(health_1.healthRoutes);
    await app.register(readiness_1.readinessRoutes);
    await app.register(auth_routes_1.authRoutes, { prefix: "/api/auth" });
    await (0, launchstack_generated_1.registerGeneratedRoutes)(app);
}
