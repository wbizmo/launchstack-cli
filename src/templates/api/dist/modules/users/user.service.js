"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const application_error_1 = require("../../core/errors/application-error");
const error_codes_1 = require("../../core/errors/error-codes");
const user_dto_1 = require("./user.dto");
const user_repository_1 = require("./user.repository");
class UserService {
    constructor(app) {
        this.repository = new user_repository_1.UserRepository(app.prisma);
    }
    async getById(id) {
        const user = await this.repository.findById(id);
        if (!user) {
            throw new application_error_1.ApplicationError({
                statusCode: 404,
                code: error_codes_1.ErrorCode.ResourceNotFound,
                message: "User not found."
            });
        }
        return (0, user_dto_1.toPublicUserDto)(user);
    }
}
exports.UserService = UserService;
