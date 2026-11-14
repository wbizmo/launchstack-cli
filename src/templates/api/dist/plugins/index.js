"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPlugins = registerPlugins;
const auth_1 = require("./auth");
const config_1 = require("./config");
const cors_1 = require("./cors");
const database_1 = require("./database");
const error_handler_1 = require("./error-handler");
const rate_limit_1 = require("./rate-limit");
const sensible_1 = require("./sensible");
const swagger_1 = require("./swagger");
async function registerPlugins(app) {
    await app.register(config_1.configPlugin);
    await app.register(swagger_1.swaggerPlugin);
    await app.register(database_1.databasePlugin);
    await app.register(sensible_1.sensiblePlugin);
    await app.register(rate_limit_1.rateLimitPlugin);
    await app.register(auth_1.authPlugin);
    await app.register(cors_1.corsPlugin);
    await app.register(error_handler_1.errorHandlerPlugin);
}
