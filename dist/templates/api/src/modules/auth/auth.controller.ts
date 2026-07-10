import type {
  FastifyReply,
  FastifyRequest
} from "fastify";
import {
  successResponse
} from "../../core/http/api-response";
import {
  AuthService
} from "./auth.service";
import type {
  LoginInput,
  RefreshInput,
  RegisterInput
} from "./auth.types";

export async function registerController(
  request: FastifyRequest<{
    Body: RegisterInput;
  }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const service =
    new AuthService(request.server);

  const result = await service.register(
    request.body
  );

  return reply.status(201).send(
    successResponse(result)
  );
}

export async function loginController(
  request: FastifyRequest<{
    Body: LoginInput;
  }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const service =
    new AuthService(request.server);

  const result = await service.login(
    request.body
  );

  return reply.send(
    successResponse(result)
  );
}

export async function refreshController(
  request: FastifyRequest<{
    Body: RefreshInput;
  }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const service =
    new AuthService(request.server);

  const tokens = await service.refresh(
    request.body.refreshToken
  );

  return reply.send(
    successResponse(tokens)
  );
}

export async function logoutController(
  request: FastifyRequest<{
    Body: RefreshInput;
  }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const service =
    new AuthService(request.server);

  await service.logout(
    request.body.refreshToken
  );

  return reply.status(204).send();
}
