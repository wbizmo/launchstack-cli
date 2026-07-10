import "fastify";
import type { PrismaClient } from "@prisma/client";
import type { AppEnvironment } from "../config/env";

declare module "fastify" {
  interface FastifyInstance {
    config: AppEnvironment;
    prisma: PrismaClient;
  }
}
