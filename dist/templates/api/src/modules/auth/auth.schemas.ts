export const registerSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email"
      },
      password: {
        type: "string",
        minLength: 8
      },
      name: {
        type: "string",
        minLength: 1,
        maxLength: 100
      }
    }
  }
} as const;

export const loginSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email"
      },
      password: {
        type: "string",
        minLength: 1
      }
    }
  }
} as const;

export const refreshSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["refreshToken"],
    properties: {
      refreshToken: {
        type: "string",
        minLength: 1
      }
    }
  }
} as const;
