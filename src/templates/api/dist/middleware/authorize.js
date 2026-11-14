"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = authorize;
function authorize(...roles) {
    return async function authorizeRequest(request, reply) {
        if (!roles.includes(request.user.role)) {
            await reply.status(403).send({
                statusCode: 403,
                error: "Forbidden",
                message: "You do not have permission to access this resource.",
                requestId: request.id
            });
            return;
        }
    };
}
