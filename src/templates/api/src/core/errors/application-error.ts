export type ApplicationErrorOptions = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
};

export class ApplicationError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(options: ApplicationErrorOptions) {
    super(options.message);

    this.name = "ApplicationError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}
