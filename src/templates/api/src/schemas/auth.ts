import {
  z
} from "zod";

export const userRoleSchema = z.enum([
  "USER",
  "ADMIN"
]);

export const userResponseSchema =
  z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    role: userRoleSchema,
    createdAt: z.union([
      z.date(),
      z.string().datetime()
    ]),
    updatedAt: z.union([
      z.date(),
      z.string().datetime()
    ])
  });

export const tokenPairSchema =
  z.object({
    accessToken:
      z.string().min(1),
    refreshToken:
      z.string().min(1)
  });

export const authResultSchema =
  z.object({
    user: userResponseSchema.omit({
      createdAt: true,
      updatedAt: true
    }),
    tokens: tokenPairSchema
  });

export const authResponseSchema =
  z.object({
    data: authResultSchema
  });

export const tokenResponseSchema =
  z.object({
    data: tokenPairSchema
  });

export const userEnvelopeSchema =
  z.object({
    data: userResponseSchema
  });
