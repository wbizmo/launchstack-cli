import "@fastify/jwt";
import type { UserRole } from "@prisma/client";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      email?: string;
      role?: UserRole;
      type: "access" | "refresh";
    };
    user: {
      sub: string;
      email: string;
      role: UserRole;
      type: "access";
    };
  }
}
