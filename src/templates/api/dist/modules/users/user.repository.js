"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
class UserRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findById(id) {
        return this.prisma.user.findUnique({
            where: {
                id
            }
        });
    }
    findByEmail(email) {
        return this.prisma.user.findUnique({
            where: {
                email
            }
        });
    }
    create(input) {
        return this.prisma.user.create({
            data: input
        });
    }
}
exports.UserRepository = UserRepository;
