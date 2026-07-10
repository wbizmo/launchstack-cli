import type { FastifyPluginAsync } from "fastify";
import {
  loginSchema,
  refreshSchema,
  registerSchema
} from "./auth.schemas";
import {
  loginUser,
  refreshUserTokens,
  registerUser,
  revokeRefreshToken
} from "./auth.service";
import type {
  LoginInput,
  RefreshInput,
  RegisterInput
} from "./auth.types";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegisterInput }>(
    "/register",
    {
      schema: registerSchema
    },
    async (request, reply) => {
      const result = await registerUser(
        app,
        request.body
      );

      return reply.status(201).send(result);
    }
  );

  app.post<{ Body: LoginInput }>(
    "/login",
    {
      schema: loginSchema
    },
    async (request) => {
      return loginUser(app, request.body);
    }
  );

  app.post<{ Body: RefreshInput }>(
    "/refresh",
    {
      schema: refreshSchema
    },
    async (request) => {
      return refreshUserTokens(
        app,
        request.body.refreshToken
      );
    }
  );

  app.post<{ Body: RefreshInput }>(
    "/logout",
    {
      schema: refreshSchema
    },
    async (request, reply) => {
      await revokeRefreshToken(
        app,
        request.body.refreshToken
      );

      return reply.status(204).send();
    }
  );

  app.get(
    "/me",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      return app.prisma.user.findUniqueOrThrow({
        where: {
          id: request.user.sub
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });
    }
  );
};
