import { z } from "zod";

export const userRoleSchema = z.enum([
  "USER",
  "ADMIN"
]);

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: userRoleSchema,
  createdAt: z.union([
    z.date(),
    z.string().datetime()
  ]).optional(),
  updatedAt: z.union([
    z.date(),
    z.string().datetime()
  ]).optional()
});

export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1)
});

export const authResponseSchema = z.object({
  user: userResponseSchema,
  tokens: tokenPairSchema
});
