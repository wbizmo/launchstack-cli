"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUserController = getCurrentUserController;
const api_response_1 = require("../../core/http/api-response");
const user_service_1 = require("./user.service");
async function getCurrentUserController(request, reply) {
    const service = new user_service_1.UserService(request.server);
    const user = await service.getById(request.user.sub);
    return reply.send((0, api_response_1.successResponse)(user));
}
