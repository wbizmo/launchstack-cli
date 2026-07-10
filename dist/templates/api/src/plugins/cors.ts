import cors from "@fastify/cors";
import fp from "fastify-plugin";

export const corsPlugin = fp(
  async (app) => {
    await app.register(cors, {
      origin:
        app.config.corsOrigin === "*"
          ? true
          : app.config.corsOrigin
    });
  },
  {
    name: "cors",
    dependencies: ["config"]
  }
);
