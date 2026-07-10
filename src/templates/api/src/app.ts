import Fastify, {
  type FastifyInstance
} from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import { registerPlugins } from "./plugins";
import { registerRoutes } from "./routes";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    },
    requestIdHeader: "x-request-id"
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await registerPlugins(app);
  await registerRoutes(app);

  return app;
}
