import { describe, expect, test } from "vitest";
import { collectOperations, parseOpenApiDocument, schemaToType } from "../src/client/openapi";
import { generateTypeScriptClient } from "../src/client/generate";
describe("v3 OpenAPI client generation", () => {
  test("preserves optional and nullable semantics", () => { expect(schemaToType({ type: ["string", "null"] })).toBe("string | null"); expect(schemaToType({ type: "object", required: ["id"], properties: { id: { type: "string" }, label: { type: "string", nullable: true } } })).toContain('"label"?: string | null'); });
  test("uses stable suffixes for operationId collisions", () => { const doc = parseOpenApiDocument({ openapi: "3.1.0", paths: { "/a": { get: { operationId: "read", responses: {} } }, "/b": { get: { operationId: "read", responses: {} } } } }); const names = collectOperations(doc).map((item) => item.name); expect(names[0]).toMatch(/^read_[a-f0-9]{8}$/); expect(names[1]).toMatch(/^read_[a-f0-9]{8}$/); expect(names[0]).not.toBe(names[1]); });
  test("injects auth without hard-coded token storage", () => { const code = generateTypeScriptClient(parseOpenApiDocument({ openapi: "3.1.0", paths: { "/health": { get: { operationId: "health", responses: { "200": { description: "ok" } } } } } })); expect(code).toContain("tokenProvider"); expect(code).toContain("ApiError"); expect(code).not.toContain("localStorage"); });
});
