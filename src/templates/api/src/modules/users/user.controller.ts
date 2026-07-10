import type {
  FastifyReply,
  FastifyRequest
} from "fastify";
import {
  successResponse
} from "../../core/http/api-response";
import {
  UserService
} from "./user.service";

export async function getCurrentUserController(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const service = new UserService(request.server);
  const user = await service.getById(
    request.user.sub
  );

  return reply.send(
    successResponse(user)
  );
}
