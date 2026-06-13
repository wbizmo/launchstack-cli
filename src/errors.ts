export class LaunchStackError extends Error {
  public status?: number;
  public details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "LaunchStackError";
    this.status = status;
    this.details = details;
  }
}