import "fastify";
import type { AppEnvironment } from "../config/env";

declare module "fastify" {
  interface FastifyInstance {
    config: AppEnvironment;
  }
}
