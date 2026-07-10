export const registerSchema = {
  tags: ["Authentication"],
  summary: "Register a user",
  description: "Creates a user account and returns access and refresh tokens.",
  body: {
    type: "object",
    additionalProperties: false,
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", examples: ["user@example.com"] },
      password: { type: "string", minLength: 8, examples: ["strong-password"] },
      name: { type: "string", minLength: 1, maxLength: 100, examples: ["Example User"] }
    }
  },
  response: {
    201: { $ref: "AuthResponse#" },
    409: { $ref: "ErrorResponse#" }
  }
} as const;

export const loginSchema = {
  tags: ["Authentication"],
  summary: "Log in a user",
  description: "Authenticates credentials and returns access and refresh tokens.",
  body: {
    type: "object",
    additionalProperties: false,
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 1 }
    }
  },
  response: {
    200: { $ref: "AuthResponse#" },
    401: { $ref: "ErrorResponse#" }
  }
} as const;

export const refreshSchema = {
  tags: ["Authentication"],
  summary: "Refresh authentication tokens",
  description: "Rotates a valid refresh token and returns a new token pair.",
  body: {
    type: "object",
    additionalProperties: false,
    required: ["refreshToken"],
    properties: { refreshToken: { type: "string", minLength: 1 } }
  },
  response: {
    200: { $ref: "TokenPair#" },
    401: { $ref: "ErrorResponse#" }
  }
} as const;

export const logoutSchema = {
  tags: ["Authentication"],
  summary: "Log out a user",
  description: "Revokes the supplied refresh token.",
  body: {
    type: "object",
    additionalProperties: false,
    required: ["refreshToken"],
    properties: { refreshToken: { type: "string", minLength: 1 } }
  },
  response: { 204: { type: "null" } }
} as const;

export const meSchema = {
  tags: ["Authentication"],
  summary: "Get the authenticated user",
  description: "Returns the currently authenticated user's public profile.",
  security: [{ bearerAuth: [] }],
  response: {
    200: { $ref: "UserResponse#" },
    401: { $ref: "ErrorResponse#" }
  }
} as const;
