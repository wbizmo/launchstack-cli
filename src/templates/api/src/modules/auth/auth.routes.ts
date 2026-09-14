import type {
  FastifyPluginAsync
} from "fastify";
import {
  getCurrentUserController
} from "../users/user.controller";
import {
  loginController,
  logoutController,
  refreshController,
  registerController
} from "./auth.controller";
import {
  loginSchema,
  logoutSchema,
  meSchema,
  refreshSchema,
  registerSchema
} from "./auth.schemas";
import type {
  LoginInput,
  RefreshInput,
  RegisterInput
} from "./auth.types";

export const authRoutes:
FastifyPluginAsync = async (app) => {
  const rateLimit = {
    max: app.config.authRateLimitMax,
    timeWindow: app.config.authRateLimitWindowMs
  };

  app.post<{
    Body: RegisterInput;
  }>(
    "/register",
    {
      schema: registerSchema,
      config: {
        rateLimit
      }
    },
    registerController
  );

  app.post<{
    Body: LoginInput;
  }>(
    "/login",
    {
      schema: loginSchema,
      config: {
        rateLimit
      }
    },
    loginController
  );

  app.post<{
    Body: RefreshInput;
  }>(
    "/refresh",
    {
      schema: refreshSchema,
      config: {
        rateLimit
      }
    },
    refreshController
  );

  app.post<{
    Body: RefreshInput;
  }>(
    "/logout",
    {
      schema: logoutSchema,
      config: {
        rateLimit
      }
    },
    logoutController
  );

  app.get(
    "/me",
    {
      schema: meSchema,
      preHandler: [
        app.authenticate
      ]
    },
    getCurrentUserController
  );
};
