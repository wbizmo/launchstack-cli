import fp from "fastify-plugin";
import { prisma } from "../lib/prisma";

export const databasePlugin = fp(
  async (app) => {
    app.decorate("prisma", prisma);

    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  },
  {
    name: "database",
    dependencies: ["config"]
  }
);
