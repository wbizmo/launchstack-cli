import { PrismaClient } from "@prisma/client";

declare global {
  var launchStackPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.launchStackPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.launchStackPrisma = prisma;
}
