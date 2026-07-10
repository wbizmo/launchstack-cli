import { z } from "zod";

export const errorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  requestId: z.string()
});

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  environment: z.string(),
  timestamp: z.string().datetime(),
  uptime: z.number()
});

export const databaseHealthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  database: z.enum(["connected", "unavailable"]),
  timestamp: z.string().datetime()
});
