"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const user_controller_1 = require("../users/user.controller");
const auth_controller_1 = require("./auth.controller");
const auth_schemas_1 = require("./auth.schemas");
const authRoutes = async (app) => {
    const rateLimit = {
        max: app.config.authRateLimitMax,
        timeWindow: app.config.authRateLimitWindowMs
    };
    app.post("/register", {
        schema: auth_schemas_1.registerSchema,
        config: {
            rateLimit
        }
    }, auth_controller_1.registerController);
    app.post("/login", {
        schema: auth_schemas_1.loginSchema,
        config: {
            rateLimit
        }
    }, auth_controller_1.loginController);
    app.post("/refresh", {
        schema: auth_schemas_1.refreshSchema,
        config: {
            rateLimit
        }
    }, auth_controller_1.refreshController);
    app.post("/logout", {
        schema: auth_schemas_1.logoutSchema,
        config: {
            rateLimit
        }
    }, auth_controller_1.logoutController);
    app.get("/me", {
        schema: auth_schemas_1.meSchema,
        preHandler: [
            app.authenticate
        ]
    }, user_controller_1.getCurrentUserController);
};
exports.authRoutes = authRoutes;
