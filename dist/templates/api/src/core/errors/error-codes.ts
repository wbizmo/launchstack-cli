export const ErrorCode = {
  ValidationFailed: "VALIDATION_FAILED",
  AuthenticationRequired: "AUTHENTICATION_REQUIRED",
  InvalidCredentials: "INVALID_CREDENTIALS",
  ResourceNotFound: "RESOURCE_NOT_FOUND",
  ResourceConflict: "RESOURCE_CONFLICT",
  Forbidden: "FORBIDDEN",
  InternalError: "INTERNAL_ERROR"
} as const;

export type ErrorCode =
  (typeof ErrorCode)[keyof typeof ErrorCode];
