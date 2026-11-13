"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerController = registerController;
exports.loginController = loginController;
exports.refreshController = refreshController;
exports.logoutController = logoutController;
const api_response_1 = require("../../core/http/api-response");
const auth_service_1 = require("./auth.service");
async function registerController(request, reply) {
    const service = new auth_service_1.AuthService(request.server);
    const result = await service.register(request.body);
    return reply.status(201).send((0, api_response_1.successResponse)(result));
}
async function loginController(request, reply) {
    const service = new auth_service_1.AuthService(request.server);
    const result = await service.login(request.body);
    return reply.send((0, api_response_1.successResponse)(result));
}
async function refreshController(request, reply) {
    const service = new auth_service_1.AuthService(request.server);
    const tokens = await service.refresh(request.body.refreshToken);
    return reply.send((0, api_response_1.successResponse)(tokens));
}
async function logoutController(request, reply) {
    const service = new auth_service_1.AuthService(request.server);
    await service.logout(request.body.refreshToken);
    return reply.status(204).send();
}
