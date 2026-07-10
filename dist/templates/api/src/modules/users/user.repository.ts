import type {
  PrismaClient,
  User
} from "@prisma/client";

export type CreateUserRecord = {
  email: string;
  name: string | null;
  passwordHash: string;
};

export class UserRepository {
  constructor(
    private readonly prisma: PrismaClient
  ) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        id
      }
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email
      }
    });
  }

  create(input: CreateUserRecord): Promise<User> {
    return this.prisma.user.create({
      data: input
    });
  }
}
