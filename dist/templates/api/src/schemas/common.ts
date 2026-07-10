export const errorResponseSchema = {
  $id: "ErrorResponse",
  type: "object",
  additionalProperties: false,
  required: ["statusCode", "error", "message", "requestId"],
  properties: {
    statusCode: { type: "integer" },
    error: { type: "string" },
    message: { type: "string" },
    requestId: { type: "string" }
  }
} as const;

export const healthResponseSchema = {
  $id: "HealthResponse",
  type: "object",
  additionalProperties: false,
  required: ["status", "service", "environment", "timestamp", "uptime"],
  properties: {
    status: { type: "string", enum: ["ok"] },
    service: { type: "string" },
    environment: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    uptime: { type: "number" }
  }
} as const;

export const databaseHealthResponseSchema = {
  $id: "DatabaseHealthResponse",
  type: "object",
  additionalProperties: false,
  required: ["status", "database", "timestamp"],
  properties: {
    status: { type: "string", enum: ["ok", "error"] },
    database: { type: "string", enum: ["connected", "unavailable"] },
    timestamp: { type: "string", format: "date-time" }
  }
} as const;
