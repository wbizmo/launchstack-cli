import jwt from "@fastify/jwt";
import fp from "fastify-plugin";
import type {
  AccessTokenPayload
} from "../modules/auth/auth.types";

export const authPlugin = fp(
  async (app) => {
    await app.register(jwt, {
      secret: app.config.jwtAccessSecret
    });

    await app.register(jwt, {
      namespace: "refreshJwt",
      secret: app.config.jwtRefreshSecret
    });

    app.decorate(
      "authenticate",
      async (request) => {
        try {
          const payload =
            await request.jwtVerify<AccessTokenPayload>();

          if (payload.type !== "access") {
            throw new Error("Invalid token type.");
          }
        } catch {
          throw app.httpErrors.unauthorized(
            "Authentication is required."
          );
        }
      }
    );
  },
  {
    name: "auth",
    dependencies: [
      "config",
      "sensible"
    ]
  }
);
