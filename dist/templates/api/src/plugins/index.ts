import type { FastifyInstance } from "fastify";
import { configPlugin } from "./config";
import { corsPlugin } from "./cors";
import { databasePlugin } from "./database";
import { errorHandlerPlugin } from "./error-handler";
import { sensiblePlugin } from "./sensible";

export async function registerPlugins(
  app: FastifyInstance
): Promise<void> {
  await app.register(configPlugin);
  await app.register(databasePlugin);
  await app.register(sensiblePlugin);
  await app.register(corsPlugin);
  await app.register(errorHandlerPlugin);
}
