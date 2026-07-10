import type { FastifyInstance } from "fastify";
import {
  ApplicationError
} from "../../core/errors/application-error";
import {
  ErrorCode
} from "../../core/errors/error-codes";
import {
  toPublicUserDto,
  type PublicUserDto
} from "./user.dto";
import {
  UserRepository
} from "./user.repository";

export class UserService {
  private readonly repository: UserRepository;

  constructor(app: FastifyInstance) {
    this.repository = new UserRepository(app.prisma);
  }

  async getById(id: string): Promise<PublicUserDto> {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new ApplicationError({
        statusCode: 404,
        code: ErrorCode.ResourceNotFound,
        message: "User not found."
      });
    }

    return toPublicUserDto(user);
  }
}
