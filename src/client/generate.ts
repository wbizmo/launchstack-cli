import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { Agent, request as httpsRequest } from "node:https";
import { createPinnedLookup, validateRemoteAddresses } from "./remote-network";
import {
  collectOperations,
  componentTypeNames,
  parseOpenApiDocument,
  requestBodySchema,
  responseSchema,
  schemaToType,
  type OpenApiDocument,
  type OpenApiParameter,
} from "./openapi";
import { readRegularFileNoFollow } from "../storage";
export type ClientTarget = "typescript" | "react" | "react-native";
const MAX_GENERATED_BYTES = 2_097_152;
const MAX_REMOTE_SCHEMA_BYTES = 1_048_576;

async function fetchRemoteSchema(url: URL, hostname: string): Promise<string> {
  const resolved =
    isIP(hostname) !== 0
      ? [{ address: hostname, family: isIP(hostname) }]
      : await lookup(hostname, { all: true, verbatim: true });
  const addresses = validateRemoteAddresses(resolved);

  const agent = new Agent({
    keepAlive: false,
    lookup: createPinnedLookup(addresses),
  });

  return await new Promise<string>((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        agent,
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      },
      (response) => {
        const fail = (error: Error) => {
          response.destroy();
          agent.destroy();
          reject(error);
        };
        if (response.statusCode !== 200) {
          fail(new Error("OpenAPI request failed with " + response.statusCode));
          return;
        }
        const contentType = response.headers["content-type"] ?? "";
        if (
          !/^(application\/json|application\/[^;]+\+json)(;|$)/i.test(
            contentType,
          )
        ) {
          fail(
            new Error(
              "OpenAPI endpoint returned unsupported content type: " +
                (contentType || "unknown"),
            ),
          );
          return;
        }
        const declared = Number(response.headers["content-length"]);
        if (Number.isFinite(declared) && declared > MAX_REMOTE_SCHEMA_BYTES) {
          fail(new Error("OpenAPI response exceeds the 1 MiB size limit."));
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        response.on("data", (chunk: Buffer | string) => {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += bytes.byteLength;
          if (total > MAX_REMOTE_SCHEMA_BYTES) {
            fail(new Error("OpenAPI response exceeds the 1 MiB size limit."));
            return;
          }
          chunks.push(bytes);
        });
        response.on("end", () => {
          agent.destroy();
          resolve(Buffer.concat(chunks, total).toString("utf8"));
        });
        response.on("error", (error) => {
          agent.destroy();
          reject(error);
        });
      },
    );
    request.on("error", (error) => {
      agent.destroy();
      reject(error);
    });
    request.end();
  });
}
function boundedJoin<T>(
  items: Iterable<T>,
  separator: string,
  render: (item: T) => string,
): string {
  const output: string[] = [];
  let bytes = 0;
  for (const item of items) {
    const chunk = render(item);
    bytes +=
      Buffer.byteLength(chunk, "utf8") +
      (output.length ? Buffer.byteLength(separator, "utf8") : 0);
    if (bytes > MAX_GENERATED_BYTES)
      throw new Error(
        "Generated OpenAPI client exceeds the 2 MiB output limit.",
      );
    output.push(chunk);
  }
  return output.join(separator);
}
export async function loadOpenApiSource(
  source: string,
): Promise<OpenApiDocument> {
  if (/^https?:\/\//i.test(source)) {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error(
        "Remote OpenAPI schemas require HTTPS without embedded credentials.",
      );
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    )
      throw new Error("Remote OpenAPI schema host is not allowed.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(await fetchRemoteSchema(url, hostname));
    } catch (error) {
      if (error instanceof SyntaxError)
        throw new Error("OpenAPI endpoint returned invalid JSON.");
      throw error;
    }
    return parseOpenApiDocument(parsed);
  }
  const file = readRegularFileNoFollow(source, 1_048_576);
  let parsed: unknown;
  try {
    parsed = JSON.parse(file.content);
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("OpenAPI file contains invalid JSON.");
    throw error;
  }
  return parseOpenApiDocument(parsed);
}
function renderSchemas(
  document: OpenApiDocument,
  names: Record<string, string>,
): string {
  return boundedJoin(
    Object.keys(document.components?.schemas ?? {}).sort(),
    "\n",
    (name) =>
      "export type " +
      names[name] +
      " = " +
      schemaToType(document.components?.schemas?.[name], names) +
      ";",
  );
}
function property(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}
function javascriptStringLiteral(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
function access(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
    ? "." + name
    : "[" + JSON.stringify(name) + "]";
}
function renderInputs(
  document: OpenApiDocument,
  names: Record<string, string>,
  operations: ReturnType<typeof collectOperations>,
): string {
  return boundedJoin(operations, "\n", (item) => {
    const parameters = item.operation.parameters ?? [];
    const body = requestBodySchema(item.operation);
    if (!parameters.length && !body) return "";
    const name =
      item.name.charAt(0).toUpperCase() + item.name.slice(1) + "Input";
    const groups: string[] = [];
    for (const location of ["path", "query", "header", "cookie"] as const) {
      const selected = parameters.filter(
        (parameter) => parameter.in === location,
      );
      if (!selected.length) continue;
      const fields = selected
        .map(
          (parameter) =>
            property(parameter.name) +
            (location !== "path" && !parameter.required ? "?" : "") +
            ": " +
            schemaToType(parameter.schema, names) +
            ";",
        )
        .join(" ");
      const groupName =
        location === "cookie"
          ? "cookies"
          : location === "header"
            ? "headers"
            : location;
      const optional =
        location !== "path" &&
        selected.every((parameter) => !parameter.required);
      groups.push(groupName + (optional ? "?" : "") + ": { " + fields + " };");
    }
    if (body)
      groups.push(
        "body" +
          (item.operation.requestBody?.required ? "" : "?") +
          ": " +
          schemaToType(body, names) +
          ";",
      );
    return "export type " + name + " = { " + groups.join(" ") + " };";
  }).trim();
}
function renderMethod(
  item: ReturnType<typeof collectOperations>[number],
  names: Record<string, string>,
): string {
  const parameters = item.operation.parameters ?? [];
  const body = requestBodySchema(item.operation);
  const hasInput = parameters.length > 0 || Boolean(body);
  const inputName =
    item.name.charAt(0).toUpperCase() + item.name.slice(1) + "Input";
  const output = schemaToType(responseSchema(item.operation), names);
  const paths = parameters
    .filter((parameter) => parameter.in === "path")
    .map(
      (parameter) =>
        "path = path.replace(" +
        JSON.stringify("{" + parameter.name + "}") +
        ", encodeURIComponent(String(input.path" +
        access(parameter.name) +
        ")));",
    )
    .join("\n    ");
  const query = parameters
    .filter((parameter) => parameter.in === "query")
    .map((parameter) => {
      const value = "input.query?" + access(parameter.name);
      const name = JSON.stringify(parameter.name);
      return (
        "if (" +
        value +
        " !== undefined) { const parameterValue = " +
        value +
        "; if (Array.isArray(parameterValue)) { for (const item of parameterValue) query.append(" +
        name +
        ', String(item)); } else if (parameterValue !== null && typeof parameterValue === "object") { for (const [key, item] of Object.entries(parameterValue)) query.append(' +
        name +
        ' + "[" + key + "]", String(item)); } else query.set(' +
        name +
        ", String(parameterValue)); }"
      );
    })
    .join("\n    ");
  const headerParameters = parameters
    .filter((parameter) => parameter.in === "header")
    .map(
      (parameter) =>
        "if (input.headers?" +
        access(parameter.name) +
        " !== undefined) headers.set(" +
        JSON.stringify(parameter.name) +
        ", String(input.headers" +
        access(parameter.name) +
        "));",
    )
    .join("\n    ");
  const cookieParameters = parameters
    .filter((parameter) => parameter.in === "cookie")
    .map(
      (parameter) =>
        "if (input.cookies?" +
        access(parameter.name) +
        " !== undefined) cookies.push(encodeURIComponent(" +
        JSON.stringify(parameter.name) +
        ') + "=" + encodeURIComponent(String(input.cookies' +
        access(parameter.name) +
        ")));",
    )
    .join("\n    ");
  const requestHeaders =
    headerParameters +
    (cookieParameters
      ? "\n    const cookies: string[] = [];\n    " +
        cookieParameters +
        '\n    if (cookies.length) headers.set("cookie", cookies.join("; "));'
      : "");
  const requestBody = body
    ? 'headers.set("content-type", "application/json");'
    : "";
  const bodyValue = body
    ? "body: input.body === undefined ? undefined : JSON.stringify(input.body),"
    : "";
  return (
    "  async " +
    item.name +
    "(" +
    (hasInput ? "input: " + inputName : "input: Record<string, never> = {}") +
    "): Promise<" +
    output +
    "> {\n" +
    "    let path = " +
    JSON.stringify(item.path) +
    ";\n    " +
    paths +
    "\n" +
    "    const query = new URLSearchParams();\n    " +
    query +
    "\n" +
    '    const headers = new Headers({ accept: "application/json" });\n    ' +
    requestHeaders +
    "\n" +
    '    const token = await this.tokenProvider?.();\n    if (token) headers.set("authorization", "Bearer " + token);\n    ' +
    requestBody +
    "\n" +
    "    const url = new URL(path, this.baseUrl);\n    if ([...query].length > 0) url.search = query.toString();\n" +
    "    const response = await this.fetchImpl(url, { method: " +
    JSON.stringify(item.method) +
    ", headers, " +
    bodyValue +
    " signal: AbortSignal.timeout(this.timeoutMs) });\n" +
    '    const contentType = response.headers.get("content-type") ?? "";\n    const payload: unknown = response.status === 204 ? undefined : contentType.includes("json") ? await response.json() : await response.text();\n' +
    "    if (!response.ok) throw new ApiError(response.status, response.statusText, payload);\n    return payload as " +
    output +
    ";\n  }"
  );
}
export function generateTypeScriptClient(
  document: OpenApiDocument,
  target: ClientTarget = "typescript",
): string {
  const names = componentTypeNames(document);
  const operations = collectOperations(document).map((operation) => {
    const name = operation.name;
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name))
      throw new Error(
        "OpenAPI operation identifier is not a safe TypeScript name.",
      );
    return { ...operation, name };
  });
  if (operations.length > 3000)
    throw new Error("OpenAPI document exceeds the 3000-operation limit.");
  const schemas = renderSchemas(document, names);
  const inputs = renderInputs(document, names, operations);
  const methods = boundedJoin(operations, "\n\n", (item) =>
    renderMethod(item, names),
  );
  const react =
    target === "react"
      ? `\n${boundedJoin(
          operations.map(
            (item, index) =>
              `export const operationQueryKey${index} = (baseUrl: string | URL, cacheScope: string, input: unknown) => ["launchstack", new URL(baseUrl).href, cacheScope, ${javascriptStringLiteral(`${item.method} ${item.path}`)}, input] as const;`,
          ),
          "\n",
          (line) => line,
        )}\n`
      : target === "react-native"
        ? '\nexport const launchStackClientTarget = "react-native" as const;\n'
        : "";
  const output = `/* eslint-disable */\n// Generated by LaunchStack CLI. Do not edit directly.\nexport type TokenProvider = () => string | undefined | null | Promise<string | undefined | null>;\nexport class ApiError extends Error { constructor(public readonly status: number, public readonly statusText: string, public readonly body: unknown) { super(\`API request failed: \${status} \${statusText}\`); this.name = "ApiError"; } }\n${schemas}\n${inputs}\nexport class LaunchStackClient { private readonly baseUrl: URL; private readonly tokenProvider?: TokenProvider; private readonly fetchImpl: typeof fetch; private readonly timeoutMs: number; constructor(options: { baseUrl: string | URL; tokenProvider?: TokenProvider; fetch?: typeof fetch; timeoutMs?: number }) { this.baseUrl = new URL(options.baseUrl); this.tokenProvider = options.tokenProvider; this.fetchImpl = options.fetch ?? globalThis.fetch; this.timeoutMs = options.timeoutMs ?? 10000; if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new Error("timeoutMs must be positive"); }\n${methods}\n}\n${react}`;
  if (Buffer.byteLength(output, "utf8") > MAX_GENERATED_BYTES)
    throw new Error("Generated OpenAPI client exceeds the 2 MiB output limit.");
  return output;
}
