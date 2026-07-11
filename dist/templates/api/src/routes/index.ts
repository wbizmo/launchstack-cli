import type { FastifyInstance } from "fastify";
import { authRoutes } from "../modules/auth/auth.routes";
import { healthRoutes } from "./health";
import { readinessRoutes } from "./readiness";

export async function registerRoutes(
  app: FastifyInstance
): Promise<void> {
  await app.register(healthRoutes);
  await app.register(readinessRoutes);

  await app.register(authRoutes, {
    prefix: "/api/auth"
  });
}
