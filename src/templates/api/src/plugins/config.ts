import fp from "fastify-plugin";
import { loadEnvironment } from "../config/env";

export const configPlugin = fp(
  async (app) => {
    const config = loadEnvironment();

    app.decorate("config", config);
  },
  {
    name: "config"
  }
);
