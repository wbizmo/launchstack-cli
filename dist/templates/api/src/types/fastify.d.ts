import type { JWT } from "@fastify/jwt";
import type { PrismaClient } from "@prisma/client";
import type {
  FastifyReply,
  FastifyRequest
} from "fastify";
import "fastify";
import type { AppEnvironment } from "../config/env";

declare module "fastify" {
  interface FastifyInstance {
    config: AppEnvironment;
    prisma: PrismaClient;
    refreshJwt: JWT;
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}
