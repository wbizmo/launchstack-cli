import Fastify, {
  type FastifyInstance
} from "fastify";
import { registerPlugins } from "./plugins";
import { registerRoutes } from "./routes";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    },
    requestIdHeader: "x-request-id"
  });

  await registerPlugins(app);
  await registerRoutes(app);

  return app;
}
