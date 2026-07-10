export const userResponseSchema = {
  $id: "UserResponse",
  type: "object",
  additionalProperties: false,
  required: ["id", "email", "name", "role"],
  properties: {
    id: { type: "string" },
    email: { type: "string", format: "email" },
    name: { anyOf: [{ type: "string" }, { type: "null" }] },
    role: { type: "string", enum: ["USER", "ADMIN"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" }
  }
} as const;

export const tokenPairSchema = {
  $id: "TokenPair",
  type: "object",
  additionalProperties: false,
  required: ["accessToken", "refreshToken"],
  properties: {
    accessToken: { type: "string" },
    refreshToken: { type: "string" }
  }
} as const;

export const authResponseSchema = {
  $id: "AuthResponse",
  type: "object",
  additionalProperties: false,
  required: ["user", "tokens"],
  properties: {
    user: { $ref: "UserResponse#" },
    tokens: { $ref: "TokenPair#" }
  }
} as const;
