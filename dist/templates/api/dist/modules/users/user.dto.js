"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicUserDto = toPublicUserDto;
function toPublicUserDto(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}
