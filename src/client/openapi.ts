import { createHash } from "node:crypto";

export type OpenApiSchema = {
  type?: string | string[];
  format?: string;
  nullable?: boolean;
  enum?: Array<string | number | boolean | null>;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  additionalProperties?: boolean | OpenApiSchema;
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  $ref?: string;
};
export type OpenApiParameter = {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  schema?: OpenApiSchema;
  content?: Record<string, { schema?: OpenApiSchema }>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
};
export type OpenApiOperation = {
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: OpenApiSchema }>;
  };
  responses?: Record<
    string,
    {
      description?: string;
      content?: Record<string, { schema?: OpenApiSchema }>;
    }
  >;
};
export type OpenApiDocument = {
  openapi: string;
  info?: { title?: string; version?: string };
  paths: Record<string, Record<string, OpenApiOperation | unknown>>;
  components?: { schemas?: Record<string, OpenApiSchema> };
};

const METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
]);
const TYPES = new Set([
  "null",
  "boolean",
  "object",
  "array",
  "number",
  "integer",
  "string",
]);
const RESERVED = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "let",
  "static",
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
  "arguments",
  "eval",
]);
const MAX_DOCUMENT_BYTES = 1_048_576;
const MAX_DEPTH = 64;
const MAX_NODES = 100_000;
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function jsonSize(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    throw new Error("OpenAPI document must be acyclic JSON data.");
  }
}

function validateTree(root: unknown): void {
  const stack: Array<{ value: unknown; depth: number; leaving?: boolean }> = [
    { value: root, depth: 0 },
  ];
  const active = new WeakSet<object>();
  let nodes = 0;
  while (stack.length) {
    const item = stack.pop()!;
    if (!item.value || typeof item.value !== "object") continue;
    if (item.leaving) {
      active.delete(item.value);
      continue;
    }
    if (active.has(item.value))
      throw new Error("OpenAPI document contains a cyclic object graph.");
    if (++nodes > MAX_NODES)
      throw new Error("OpenAPI document exceeds the 100000-node limit.");
    if (item.depth > MAX_DEPTH)
      throw new Error(
        "OpenAPI document exceeds the maximum nesting depth of 64.",
      );
    active.add(item.value);
    stack.push({ value: item.value, depth: item.depth, leaving: true });
    const values = Array.isArray(item.value)
      ? item.value
      : Object.values(item.value);
    for (const child of values)
      stack.push({ value: child, depth: item.depth + 1 });
  }
}

function pointerParts(ref: string): string[] {
  if (!ref.startsWith("#/"))
    throw new Error("Only local OpenAPI references are supported.");
  return ref
    .slice(2)
    .split("/")
    .map((part) => {
      try {
        return decodeURIComponent(part).replace(/~1/g, "/").replace(/~0/g, "~");
      } catch {
        throw new Error("OpenAPI reference contains invalid pointer escaping.");
      }
    });
}

function resolveReference(root: unknown, ref: string): Record<string, unknown> {
  let current: unknown = root;
  for (const part of pointerParts(ref)) {
    if (!object(current) && !Array.isArray(current))
      throw new Error("OpenAPI reference does not resolve: " + ref);
    current = (current as Record<string, unknown>)[part];
    if (current === undefined)
      throw new Error("OpenAPI reference does not resolve: " + ref);
  }
  if (!object(current))
    throw new Error("OpenAPI reference must target an object: " + ref);
  return current;
}

function resolveObject(
  value: unknown,
  document: unknown,
): Record<string, unknown> {
  if (!object(value)) throw new Error("Referenced OpenAPI object is invalid.");
  if (typeof value.$ref !== "string") return value;
  return {
    ...resolveReference(document, value.$ref),
    ...value,
    $ref: undefined,
  };
}

function validateSchema(
  schema: unknown,
  version: string,
  path: string,
  depth = 0,
): void {
  if (depth > MAX_DEPTH)
    throw new Error("OpenAPI schema exceeds the maximum nesting depth of 64.");
  if (!object(schema))
    throw new Error("Invalid OpenAPI schema at " + path + ".");
  if (schema.$ref !== undefined && typeof schema.$ref !== "string")
    throw new Error("Schema $ref must be a string at " + path + ".");
  if (typeof schema.$ref === "string") return;
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (Array.isArray(schema.type) && !version.startsWith("3.1."))
      throw new Error("Type arrays require OpenAPI 3.1 at " + path + ".");
    if (
      !types.length ||
      types.some((type) => typeof type !== "string" || !TYPES.has(type))
    )
      throw new Error("Invalid schema type at " + path + ".");
  }
  if (
    schema.required !== undefined &&
    (!Array.isArray(schema.required) ||
      schema.required.some((item) => typeof item !== "string"))
  )
    throw new Error(
      "Schema required must be an array of property names at " + path + ".",
    );
  if (schema.properties !== undefined) {
    if (!object(schema.properties))
      throw new Error("Schema properties must be an object at " + path + ".");
    for (const name of Object.keys(schema.properties))
      validateSchema(
        schema.properties[name],
        version,
        path + ".properties." + name,
        depth + 1,
      );
    const propertyNames = new Set(Object.keys(schema.properties));
    if (
      (schema.required as string[] | undefined)?.some(
        (name) => !propertyNames.has(name),
      )
    )
      throw new Error(
        "Schema required references an unknown property at " + path + ".",
      );
  }
  for (const key of ["oneOf", "anyOf", "allOf"] as const) {
    if (schema[key] !== undefined) {
      if (!Array.isArray(schema[key]) || schema[key]!.length === 0)
        throw new Error(
          "Schema " + key + " must be a non-empty array at " + path + ".",
        );
      for (let index = 0; index < schema[key]!.length; index += 1)
        validateSchema(
          schema[key]![index],
          version,
          path + "." + key + "[" + index + "]",
          depth + 1,
        );
    }
  }
  if (schema.items !== undefined)
    validateSchema(schema.items, version, path + ".items", depth + 1);
  if (
    schema.additionalProperties !== undefined &&
    typeof schema.additionalProperties !== "boolean"
  )
    validateSchema(
      schema.additionalProperties,
      version,
      path + ".additionalProperties",
      depth + 1,
    );
  if (
    schema.enum !== undefined &&
    (!Array.isArray(schema.enum) || schema.enum.length === 0)
  )
    throw new Error("Schema enum must be a non-empty array at " + path + ".");
}

function resolveOperationReferences(document: Record<string, unknown>): void {
  const paths = document.paths as Record<string, unknown>;
  for (const path of Object.keys(paths).sort()) {
    const item = resolveObject(paths[path], document);
    if (Array.isArray(item.parameters))
      item.parameters = item.parameters.map((parameter) =>
        resolveObject(parameter, document),
      );
    for (const method of Object.keys(item).sort()) {
      if (!METHODS.has(method.toLowerCase()) || !object(item[method])) continue;
      const operation = item[method] as Record<string, unknown>;
      const inherited = Array.isArray(item.parameters)
        ? (item.parameters as unknown[])
        : [];
      const local = Array.isArray(operation.parameters)
        ? operation.parameters.map((parameter) =>
            resolveObject(parameter, document),
          )
        : [];
      const seen = new Map<string, Record<string, unknown>>();
      for (const parameter of [...inherited, ...local]) {
        if (
          !object(parameter) ||
          typeof parameter.name !== "string" ||
          typeof parameter.in !== "string"
        )
          throw new Error("OpenAPI parameter requires a name and location.");
        if (!"path query header cookie".split(" ").includes(parameter.in))
          throw new Error(
            "OpenAPI parameter has an unsupported location: " + parameter.in,
          );
        if (parameter.in === "path" && parameter.required !== true)
          throw new Error(
            "OpenAPI path parameters must be required: " + parameter.name,
          );
        if (parameter.schema !== undefined)
          validateSchema(
            parameter.schema,
            String(document.openapi),
            "parameter." + parameter.name,
          );
        if (parameter.content !== undefined && !object(parameter.content))
          throw new Error(
            "OpenAPI parameter content must be an object: " + parameter.name,
          );
        if (parameter.schema === undefined && parameter.content === undefined)
          throw new Error(
            "OpenAPI parameter requires a schema or content: " + parameter.name,
          );
        seen.set(parameter.name + "\u0000" + parameter.in, parameter);
      }
      operation.parameters = [...seen.values()].sort(
        (a, b) =>
          String(a.in).localeCompare(String(b.in)) ||
          String(a.name).localeCompare(String(b.name)),
      );
      if (operation.requestBody)
        operation.requestBody = resolveObject(operation.requestBody, document);
      if (object(operation.responses)) {
        const responses: Record<string, unknown> = {};
        for (const code of Object.keys(operation.responses).sort())
          responses[code] = resolveObject(operation.responses[code], document);
        operation.responses = responses;
      }
    }
    paths[path] = item;
  }
}

function validateDocumentSchemas(document: Record<string, unknown>): void {
  const pending: Array<{ value: unknown; path: string }> = [
    { value: document, path: "" },
  ];
  const visited = new WeakSet<object>();
  while (pending.length) {
    const { value, path } = pending.pop()!;
    if (!object(value) && !Array.isArray(value)) continue;
    if (visited.has(value)) continue;
    visited.add(value);
    for (const [key, child] of Object.entries(value)) {
      const childPath = path + "." + key;
      if (key === "schema")
        validateSchema(child, String(document.openapi), childPath);
      else if (child && typeof child === "object")
        pending.push({ value: child, path: childPath });
    }
    if (Array.isArray(value))
      for (let index = 0; index < value.length; index += 1)
        pending.push({ value: value[index], path: path + "[" + index + "]" });
  }
}

export function parseOpenApiDocument(value: unknown): OpenApiDocument {
  if (
    !object(value) ||
    typeof value.openapi !== "string" ||
    !/^3\.(0|1)\.\d+$/.test(value.openapi) ||
    !object(value.paths)
  )
    throw new Error(
      "OpenAPI document must contain a supported 3.0/3.1 version and paths object.",
    );
  if (jsonSize(value) > MAX_DOCUMENT_BYTES)
    throw new Error("OpenAPI document exceeds the 1 MiB size limit.");
  validateTree(value);
  const document = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  const paths = document.paths as Record<string, unknown>;
  if (Object.keys(paths).length > 1000)
    throw new Error("OpenAPI document exceeds the 1000-path limit.");
  const schemas =
    object(document.components) && object(document.components.schemas)
      ? document.components.schemas
      : {};
  if (Object.keys(schemas).length > 1000)
    throw new Error("OpenAPI document exceeds the 1000-schema limit.");
  for (const [name, schema] of Object.entries(schemas))
    validateSchema(
      schema,
      document.openapi as string,
      "components.schemas." + name,
    );
  const references: string[] = [];
  const referenceStack: unknown[] = [document];
  while (referenceStack.length) {
    const current = referenceStack.pop();
    if (Array.isArray(current)) referenceStack.push(...current);
    else if (object(current)) {
      if (typeof current.$ref === "string") references.push(current.$ref);
      referenceStack.push(...Object.values(current));
    }
  }
  for (const ref of references) resolveReference(document, ref);
  resolveOperationReferences(document);
  validateDocumentSchemas(document);
  return document as unknown as OpenApiDocument;
}

function sanitize(input: string): string {
  const words = input
    .replace(/[^A-Za-z0-9_$]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let result = words
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join("");
  if (!result) result = "operation";
  if (/^[0-9]/.test(result)) result = "op" + result;
  result = result.replace(/[^A-Za-z0-9_$]/g, "");
  return RESERVED.has(result) ? "api_" + result : result;
}

export type ParsedOperation = {
  method: string;
  path: string;
  name: string;
  operation: OpenApiOperation;
};
export function collectOperations(
  document: OpenApiDocument,
): ParsedOperation[] {
  const raw: Array<Omit<ParsedOperation, "name"> & { preferredName: string }> =
    [];
  for (const path of Object.keys(document.paths).sort()) {
    const item = document.paths[path] ?? {};
    for (const method of Object.keys(item).sort()) {
      if (!METHODS.has(method.toLowerCase())) continue;
      const operation = item[method];
      if (!object(operation)) continue;
      const typed = operation as OpenApiOperation;
      raw.push({
        method: method.toUpperCase(),
        path,
        operation: typed,
        preferredName: sanitize(
          typed.operationId ?? method + "-" + path.replace(/[{}]/g, ""),
        ),
      });
    }
  }
  const counts = new Map<string, number>();
  for (const item of raw)
    counts.set(item.preferredName, (counts.get(item.preferredName) ?? 0) + 1);
  return raw.map(({ preferredName, ...item }) => ({
    ...item,
    name:
      (counts.get(preferredName) ?? 0) > 1
        ? preferredName +
          "_" +
          createHash("sha256")
            .update(item.method + " " + item.path)
            .digest("hex")
            .slice(0, 8)
        : preferredName,
  }));
}

function decodeRefName(ref: string): string {
  return pointerParts(ref).pop() ?? "Unknown";
}
export function componentTypeNames(
  document: OpenApiDocument,
): Record<string, string> {
  const result: Record<string, string> = {};
  const used = new Set<string>();
  for (const name of Object.keys(document.components?.schemas ?? {}).sort()) {
    let candidate = name.replace(/[^A-Za-z0-9_$]+/g, "_");
    if (!candidate || /^[0-9]/.test(candidate))
      candidate = "Schema_" + candidate;
    if (RESERVED.has(candidate)) candidate = "Schema_" + candidate;
    if (used.has(candidate))
      candidate +=
        "_" + createHash("sha256").update(name).digest("hex").slice(0, 8);
    used.add(candidate);
    result[name] = candidate;
  }
  return result;
}

export function schemaToType(
  schema: OpenApiSchema | undefined,
  names: Record<string, string> = {},
): string {
  if (!schema) return "unknown";
  const types = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : [];
  const nullable = schema.nullable === true || types.includes("null");
  let rendered: string;
  if (schema.$ref) {
    const name = decodeRefName(schema.$ref);
    rendered =
      names[name] ??
      componentTypeNames({
        openapi: "3.1.0",
        paths: {},
        components: { schemas: { [name]: {} } },
      })[name] ??
      "unknown";
  } else if (schema.enum?.length) {
    rendered = schema.enum
      .map((value) => (value === null ? "null" : JSON.stringify(value)))
      .join(" | ");
  } else if (schema.oneOf?.length) {
    rendered = schema.oneOf
      .map((item) => schemaToType(item, names))
      .join(" | ");
  } else if (schema.anyOf?.length) {
    rendered = schema.anyOf
      .map((item) => schemaToType(item, names))
      .join(" | ");
  } else if (schema.allOf?.length) {
    rendered = schema.allOf
      .map((item) => schemaToType(item, names))
      .join(" & ");
  } else {
    const type = types.find((entry) => entry !== "null");
    if (type === "string") rendered = "string";
    else if (type === "integer" || type === "number") rendered = "number";
    else if (type === "boolean") rendered = "boolean";
    else if (type === "array")
      rendered = "Array<" + schemaToType(schema.items, names) + ">";
    else if (schema.properties) {
      const required = new Set(schema.required ?? []);
      rendered =
        "{ " +
        Object.keys(schema.properties)
          .sort()
          .map(
            (key) =>
              JSON.stringify(key) +
              (required.has(key) ? "" : "?") +
              ": " +
              schemaToType(schema.properties?.[key], names) +
              ";",
          )
          .join(" ") +
        " }";
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    )
      rendered =
        "Record<string, " +
        schemaToType(schema.additionalProperties, names) +
        ">";
    else if (schema.additionalProperties === false) rendered = "{}";
    else rendered = "Record<string, unknown>";
  }
  return nullable && !rendered.split(" | ").includes("null")
    ? rendered + " | null"
    : rendered;
}

function jsonMedia(
  content: Record<string, { schema?: OpenApiSchema }> | undefined,
): { schema?: OpenApiSchema } | undefined {
  if (!content) return undefined;
  const names = Object.keys(content).sort();
  return names.find(
    (name) =>
      name.toLowerCase() === "application/json" ||
      name.toLowerCase().endsWith("+json"),
  )
    ? content[
        names.find(
          (name) =>
            name.toLowerCase() === "application/json" ||
            name.toLowerCase().endsWith("+json"),
        )!
      ]
    : content[names[0]!];
}

export function responseSchema(
  operation: OpenApiOperation,
): OpenApiSchema | undefined {
  const responses = operation.responses ?? {};
  const codes = Object.keys(responses)
    .filter((value) => /^2(?:\d\d|xx)$/i.test(value))
    .sort();
  const selected = codes.length
    ? codes
    : Object.keys(responses).includes("default")
      ? ["default"]
      : [];
  const schemas: OpenApiSchema[] = [];
  for (const code of selected) {
    const content = responses[code]?.content;
    const schema = jsonMedia(content)?.schema;
    if (schema) schemas.push(schema);
  }
  if (!schemas.length) return undefined;
  if (schemas.length === 1) return schemas[0];
  return { oneOf: schemas };
}

export function requestBodySchema(
  operation: OpenApiOperation,
): OpenApiSchema | undefined {
  return jsonMedia(operation.requestBody?.content)?.schema;
}
