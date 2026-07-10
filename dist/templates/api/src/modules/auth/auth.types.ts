import type { UserRole } from "@prisma/client";
import type { z } from "zod";
import type {
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema
} from "./auth.schemas";

export type RegisterInput = z.infer<
  typeof registerBodySchema
>;

export type LoginInput = z.infer<
  typeof loginBodySchema
>;

export type RefreshInput = z.infer<
  typeof refreshBodySchema
>;

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  type: "refresh";
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};
