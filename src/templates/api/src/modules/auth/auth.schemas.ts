import {
  z
} from "zod";
import {
  authResponseSchema,
  tokenResponseSchema,
  userEnvelopeSchema
} from "../../schemas/auth";
import {
  errorResponseSchema
} from "../../schemas/common";

export const registerBodySchema =
  z.object({
    email:
      z.string().email(),
    password:
      z.string().min(8),
    name:
      z.string()
        .trim()
        .min(1)
        .max(100)
        .optional()
  });

export const loginBodySchema =
  z.object({
    email:
      z.string().email(),
    password:
      z.string().min(1)
  });

export const refreshBodySchema =
  z.object({
    refreshToken:
      z.string().min(1)
  });

export const registerSchema = {
  tags: [
    "Authentication"
  ],
  summary:
    "Register a user",
  description:
    "Creates a user account and returns access and refresh tokens.",
  body:
    registerBodySchema,
  response: {
    201:
      authResponseSchema,
    409:
      errorResponseSchema
  }
};

export const loginSchema = {
  tags: [
    "Authentication"
  ],
  summary:
    "Log in a user",
  description:
    "Authenticates credentials and returns access and refresh tokens.",
  body:
    loginBodySchema,
  response: {
    200:
      authResponseSchema,
    401:
      errorResponseSchema
  }
};

export const refreshSchema = {
  tags: [
    "Authentication"
  ],
  summary:
    "Refresh authentication tokens",
  description:
    "Rotates a valid refresh token and returns a new token pair.",
  body:
    refreshBodySchema,
  response: {
    200:
      tokenResponseSchema,
    401:
      errorResponseSchema
  }
};

export const logoutSchema = {
  tags: [
    "Authentication"
  ],
  summary:
    "Log out a user",
  description:
    "Revokes the supplied refresh token.",
  body:
    refreshBodySchema,
  response: {
    204:
      z.null()
  }
};

export const meSchema = {
  tags: [
    "Authentication"
  ],
  summary:
    "Get the authenticated user",
  description:
    "Returns the currently authenticated user's public profile.",
  security: [
    {
      bearerAuth: []
    }
  ],
  response: {
    200:
      userEnvelopeSchema,
    401:
      errorResponseSchema,
    404:
      errorResponseSchema
  }
};
