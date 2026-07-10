import type {
  User,
  UserRole
} from "@prisma/client";

export type PublicUserDto = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicUserDto(
  user: Pick<
    User,
    | "id"
    | "email"
    | "name"
    | "role"
    | "createdAt"
    | "updatedAt"
  >
): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
