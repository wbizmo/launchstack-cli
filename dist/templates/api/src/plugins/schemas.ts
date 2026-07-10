import fp from "fastify-plugin";
import { authResponseSchema, tokenPairSchema, userResponseSchema } from "../schemas/auth";
import { databaseHealthResponseSchema, errorResponseSchema, healthResponseSchema } from "../schemas/common";

export const schemasPlugin = fp(
  async (app) => {
    app.addSchema(errorResponseSchema);
    app.addSchema(healthResponseSchema);
    app.addSchema(databaseHealthResponseSchema);
    app.addSchema(userResponseSchema);
    app.addSchema(tokenPairSchema);
    app.addSchema(authResponseSchema);
  },
  { name: "schemas" }
);
