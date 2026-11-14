import { readFileSync, statSync } from "node:fs";
import { collectOperations, componentTypeNames, parseOpenApiDocument, requestBodySchema, responseSchema, schemaToType, type OpenApiDocument, type OpenApiParameter } from "./openapi";
export type ClientTarget = "typescript" | "react" | "react-native";
const MAX_GENERATED_BYTES = 2_097_152;
function boundedJoin<T>(items: Iterable<T>, separator: string, render: (item: T) => string): string {
  const output: string[] = [];
  let bytes = 0;
  for (const item of items) { const chunk = render(item); bytes += Buffer.byteLength(chunk, "utf8") + (output.length ? Buffer.byteLength(separator, "utf8") : 0); if (bytes > MAX_GENERATED_BYTES) throw new Error("Generated OpenAPI client exceeds the 2 MiB output limit."); output.push(chunk); }
  return output.join(separator);
}
async function readBoundedResponse(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > 1_048_576) throw new Error("OpenAPI response exceeds the 1 MiB size limit.");
  if (!response.body) throw new Error("OpenAPI response has no body.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > 1_048_576) { await reader.cancel(); throw new Error("OpenAPI response exceeds the 1 MiB size limit."); }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
export async function loadOpenApiSource(source: string): Promise<OpenApiDocument> {
  if (/^https?:\/\//i.test(source)) {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Remote OpenAPI schemas require HTTPS without embedded credentials.");
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname === "0.0.0.0" || hostname === "::1") throw new Error("Remote OpenAPI schema host is not allowed.");
    const response = await fetch(url, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("OpenAPI request failed with " + response.status);
    const contentType = response.headers.get("content-type") ?? "";
    if (!/^(application\/json|application\/[^;]+\+json)(;|$)/i.test(contentType)) throw new Error("OpenAPI endpoint returned unsupported content type: " + (contentType || "unknown"));
    let parsed: unknown;
    try { parsed = JSON.parse(await readBoundedResponse(response)); } catch (error) { if (error instanceof SyntaxError) throw new Error("OpenAPI endpoint returned invalid JSON."); throw error; }
    return parseOpenApiDocument(parsed);
  }
  const stats = statSync(source);
  if (!stats.isFile()) throw new Error("OpenAPI schema path must be a regular file.");
  if (stats.size > 1_048_576) throw new Error("OpenAPI file exceeds the 1 MiB size limit.");
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(source, "utf8")); } catch (error) { if (error instanceof SyntaxError) throw new Error("OpenAPI file contains invalid JSON."); throw error; }
  return parseOpenApiDocument(parsed);
}
function renderSchemas(document: OpenApiDocument, names: Record<string, string>): string { return boundedJoin(Object.keys(document.components?.schemas ?? {}).sort(), "\n", (name) => "export type " + names[name] + " = " + schemaToType(document.components?.schemas?.[name], names) + ";"); }
function property(name: string): string { return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name); }
function access(name: string): string { return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? "." + name : "[" + JSON.stringify(name) + "]"; }
function renderInputs(document: OpenApiDocument, names: Record<string, string>, operations: ReturnType<typeof collectOperations>): string {
  return boundedJoin(operations, "\n", (item) => {
    const parameters = item.operation.parameters ?? [];
    const body = requestBodySchema(item.operation);
    if (!parameters.length && !body) return "";
    const name = item.name.charAt(0).toUpperCase() + item.name.slice(1) + "Input";
    const groups: string[] = [];
    for (const location of ["path", "query", "header", "cookie"] as const) {
      const selected = parameters.filter((parameter) => parameter.in === location);
      if (!selected.length) continue;
      const fields = selected.map((parameter) => property(parameter.name) + (location !== "path" && !parameter.required ? "?" : "") + ": " + schemaToType(parameter.schema, names) + ";").join(" ");
      const groupName = location === "cookie" ? "cookies" : location === "header" ? "headers" : location;
      const optional = location !== "path" && selected.every((parameter) => !parameter.required);
      groups.push(groupName + (optional ? "?" : "") + ": { " + fields + " };");
    }
    if (body) groups.push("body" + (item.operation.requestBody?.required ? "" : "?") + ": " + schemaToType(body, names) + ";");
    return "export type " + name + " = { " + groups.join(" ") + " };";
  }).trim();
}
function renderMethod(item: ReturnType<typeof collectOperations>[number], names: Record<string, string>): string {
  const parameters = item.operation.parameters ?? [];
  const body = requestBodySchema(item.operation);
  const hasInput = parameters.length > 0 || Boolean(body);
  const inputName = item.name.charAt(0).toUpperCase() + item.name.slice(1) + "Input";
  const output = schemaToType(responseSchema(item.operation), names);
  const paths = parameters.filter((parameter) => parameter.in === "path").map((parameter) => "path = path.replace(" + JSON.stringify("{" + parameter.name + "}") + ", encodeURIComponent(String(input.path" + access(parameter.name) + ")));").join("\n    ");
  const query = parameters.filter((parameter) => parameter.in === "query").map((parameter) => {
    const value = "input.query?" + access(parameter.name);
    const name = JSON.stringify(parameter.name);
    return "if (" + value + " !== undefined) { const parameterValue = " + value + "; if (Array.isArray(parameterValue)) { for (const item of parameterValue) query.append(" + name + ", String(item)); } else if (parameterValue !== null && typeof parameterValue === \"object\") { for (const [key, item] of Object.entries(parameterValue)) query.append(" + name + " + \"[\" + key + \"]\", String(item)); } else query.set(" + name + ", String(parameterValue)); }";
  }).join("\n    ");
  const headerParameters = parameters.filter((parameter) => parameter.in === "header").map((parameter) => "if (input.headers?" + access(parameter.name) + " !== undefined) headers.set(" + JSON.stringify(parameter.name) + ", String(input.headers" + access(parameter.name) + "));").join("\n    ");
  const cookieParameters = parameters.filter((parameter) => parameter.in === "cookie").map((parameter) => "if (input.cookies?" + access(parameter.name) + " !== undefined) cookies.push(encodeURIComponent(" + JSON.stringify(parameter.name) + ") + \"=\" + encodeURIComponent(String(input.cookies" + access(parameter.name) + ")));").join("\n    ");
  const requestHeaders = headerParameters + (cookieParameters ? "\n    const cookies: string[] = [];\n    " + cookieParameters + "\n    if (cookies.length) headers.set(\"cookie\", cookies.join(\"; \"));" : "");
  const requestBody = body ? "headers.set(\"content-type\", \"application/json\");" : "";
  const bodyValue = body ? "body: input.body === undefined ? undefined : JSON.stringify(input.body)," : "";
  return "  async " + item.name + "(" + (hasInput ? "input: " + inputName : "input: Record<string, never> = {}") + "): Promise<" + output + "> {\n" +
    "    let path = " + JSON.stringify(item.path) + ";\n    " + paths + "\n" +
    "    const query = new URLSearchParams();\n    " + query + "\n" +
    "    const headers = new Headers({ accept: \"application/json\" });\n    " + requestHeaders + "\n" +
    "    const token = await this.tokenProvider?.();\n    if (token) headers.set(\"authorization\", \"Bearer \" + token);\n    " + requestBody + "\n" +
    "    const url = new URL(path, this.baseUrl);\n    if ([...query].length > 0) url.search = query.toString();\n" +
    "    const response = await this.fetchImpl(url, { method: " + JSON.stringify(item.method) + ", headers, " + bodyValue + " signal: AbortSignal.timeout(this.timeoutMs) });\n" +
    "    const contentType = response.headers.get(\"content-type\") ?? \"\";\n    const payload: unknown = response.status === 204 ? undefined : contentType.includes(\"json\") ? await response.json() : await response.text();\n" +
    "    if (!response.ok) throw new ApiError(response.status, response.statusText, payload);\n    return payload as " + output + ";\n  }";
}
export function generateTypeScriptClient(document: OpenApiDocument, target: ClientTarget = "typescript"): string { const names = componentTypeNames(document); const operations = collectOperations(document); if (operations.length > 3000) throw new Error("OpenAPI document exceeds the 3000-operation limit."); const schemas = renderSchemas(document, names); const inputs = renderInputs(document, names, operations); const methods = boundedJoin(operations, "\n\n", (item) => renderMethod(item, names)); const react = target === "react" ? `\n${boundedJoin(operations, "\n", (item) => `export const ${item.name}QueryKey = (input: unknown) => [${JSON.stringify(item.name)}, input] as const;`)}\n` : target === "react-native" ? "\nexport const launchStackClientTarget = \"react-native\" as const;\n" : ""; const output = `/* eslint-disable */\n// Generated by LaunchStack CLI. Do not edit directly.\nexport type TokenProvider = () => string | undefined | null | Promise<string | undefined | null>;\nexport class ApiError extends Error { constructor(public readonly status: number, public readonly statusText: string, public readonly body: unknown) { super(\`API request failed: \${status} \${statusText}\`); this.name = "ApiError"; } }\n${schemas}\n${inputs}\nexport class LaunchStackClient { private readonly baseUrl: URL; private readonly tokenProvider?: TokenProvider; private readonly fetchImpl: typeof fetch; private readonly timeoutMs: number; constructor(options: { baseUrl: string | URL; tokenProvider?: TokenProvider; fetch?: typeof fetch; timeoutMs?: number }) { this.baseUrl = new URL(options.baseUrl); this.tokenProvider = options.tokenProvider; this.fetchImpl = options.fetch ?? globalThis.fetch; this.timeoutMs = options.timeoutMs ?? 10000; if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new Error("timeoutMs must be positive"); }\n${methods}\n}\n${react}`; if (Buffer.byteLength(output, "utf8") > MAX_GENERATED_BYTES) throw new Error("Generated OpenAPI client exceeds the 2 MiB output limit."); return output; }
