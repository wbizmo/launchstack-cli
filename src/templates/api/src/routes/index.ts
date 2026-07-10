import type { FastifyInstance } from "fastify";
import { authRoutes } from "../modules/auth/auth.routes";
import { healthRoutes } from "./health";

export async function registerRoutes(
  app: FastifyInstance
): Promise<void> {
  await app.register(healthRoutes);

  await app.register(authRoutes, {
    prefix: "/api/auth"
  });
}
