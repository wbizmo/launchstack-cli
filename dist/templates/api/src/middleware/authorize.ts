import type { UserRole } from "@prisma/client";
import type {
  FastifyReply,
  FastifyRequest
} from "fastify";

export function authorize(...roles: UserRole[]) {
  return async function authorizeRequest(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!roles.includes(request.user.role)) {
      await reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message:
          "You do not have permission to access this resource.",
        requestId: request.id
      });

      return;
    }
  };
}
