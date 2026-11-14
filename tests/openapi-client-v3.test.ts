import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, test } from "vitest";
import {
  collectOperations,
  parseOpenApiDocument,
  schemaToType,
} from "../src/client/openapi";
import { generateTypeScriptClient } from "../src/client/generate";

function fixtureDocument(version = "3.1.0") {
  return {
    openapi: version,
    components: {
      schemas: {
        "Pet-Info": {
          type: "object",
          required: ["id", "kind"],
          properties: {
            id: { type: "string" },
            kind: { enum: ["cat", "dog"] },
            "display-name": version.startsWith("3.1")
              ? { type: ["string", "null"] }
              : { type: "string", nullable: true },
          },
        },
        Result: {
          oneOf: [
            { $ref: "#/components/schemas/Pet-Info" },
            { type: "object", properties: { error: { type: "string" } } },
          ],
        },
      },
      parameters: {
        PetId: {
          name: "pet-id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        Tags: {
          name: "tag",
          in: "query",
          schema: { type: "array", items: { type: "string" } },
        },
      },
      requestBodies: {
        PetBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Pet-Info" },
            },
          },
        },
      },
      responses: {
        PetResponse: {
          description: "pet",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Result" },
            },
          },
        },
      },
    },
    paths: {
      "/pets/{pet-id}": {
        put: {
          operationId: "update-pet",
          parameters: [
            { $ref: "#/components/parameters/PetId" },
            { $ref: "#/components/parameters/Tags" },
          ],
          requestBody: { $ref: "#/components/requestBodies/PetBody" },
          responses: {
            "200": { $ref: "#/components/responses/PetResponse" },
            "202": {
              description: "accepted",
              content: { "application/json": { schema: { type: "string" } } },
            },
          },
        },
      },
    },
  };
}

describe("v3 OpenAPI client generation", () => {
  test("preserves optional and nullable semantics", () => {
    expect(schemaToType({ type: ["string", "null"] })).toBe("string | null");
    expect(
      schemaToType({
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
          label: { type: "string", nullable: true },
        },
      }),
    ).toContain('"label"?: string | null');
  });
  test("uses stable suffixes for operationId collisions", () => {
    const doc = parseOpenApiDocument({
      openapi: "3.1.0",
      paths: {
        "/a": { get: { operationId: "read", responses: {} } },
        "/b": { get: { operationId: "read", responses: {} } },
      },
    });
    const names = collectOperations(doc).map((item) => item.name);
    expect(names[0]).toMatch(/^read_[a-f0-9]{8}$/);
    expect(names[1]).toMatch(/^read_[a-f0-9]{8}$/);
    expect(names[0]).not.toBe(names[1]);
  });
  test("injects auth without hard-coded token storage", () => {
    const code = generateTypeScriptClient(
      parseOpenApiDocument({
        openapi: "3.1.0",
        paths: {
          "/health": {
            get: {
              operationId: "health",
              responses: { "200": { description: "ok" } },
            },
          },
        },
      }),
    );
    expect(code).toContain("tokenProvider");
    expect(code).toContain("ApiError");
    expect(code).not.toContain("localStorage");
  });

  test.each(["3.0.3", "3.1.0"])(
    "resolves local refs and preserves schema semantics for OpenAPI %s",
    (version) => {
      const document = parseOpenApiDocument(fixtureDocument(version));
      const generated = generateTypeScriptClient(document);
      expect(generated).toContain("export type Pet_Info");
      expect(generated).toContain('"display-name"?: string | null');
      expect(generated).toContain('"kind": "cat" | "dog"');
      expect(generated).toContain("Promise<Result | string>");
      expect(generated).toContain('path.replace("{pet-id}"');
      expect(generated).toContain('query.append("tag"');
    },
  );

  test("compiles TypeScript, React and React Native client targets", () => {
    const document = parseOpenApiDocument(fixtureDocument());
    const directory = mkdtempSync(
      join(tmpdir(), "launchstack-openapi-compile-"),
    );
    try {
      for (const target of ["typescript", "react", "react-native"] as const) {
        const file = join(directory, target + ".ts");
        writeFileSync(file, generateTypeScriptClient(document, target));
        const program = ts.createProgram([file], {
          noEmit: true,
          strict: true,
          skipLibCheck: true,
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
        });
        const diagnostics = ts.getPreEmitDiagnostics(program);
        expect(
          diagnostics.map((item) =>
            ts.flattenDiagnosticMessageText(item.messageText, "\n"),
          ),
          target,
        ).toEqual([]);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("makes fixture requests with encoded path, repeated query, auth, JSON body and typed responses", async () => {
    const document = parseOpenApiDocument(fixtureDocument());
    const source = generateTypeScriptClient(document);
    const javascript = ts.transpile(source, {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    });
    const sandbox = {
      exports: {} as Record<string, unknown>,
      URL,
      URLSearchParams,
      Headers,
      AbortSignal,
      globalThis: {},
    };
    vm.runInNewContext(javascript, sandbox);
    const LaunchStackClient = sandbox.exports.LaunchStackClient as new (
      options: Record<string, unknown>,
    ) => { updatePet(input: unknown): Promise<unknown> };
    let request: { url: URL; init: RequestInit } | undefined;
    const client = new LaunchStackClient({
      baseUrl: "https://fixture.test/v1/",
      tokenProvider: () => "fixture-token",
      fetch: async (url: URL, init: RequestInit) => {
        request = { url, init };
        return new Response(JSON.stringify({ id: "7", kind: "cat" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });
    const result = await client.updatePet({
      path: { "pet-id": "a/b" },
      query: { tag: ["red", "blue"] },
      body: { id: "7", kind: "cat" },
    });
    expect(result).toEqual({ id: "7", kind: "cat" });
    expect(request?.url.toString()).toBe(
      "https://fixture.test/pets/a%2Fb?tag=red&tag=blue",
    );
    expect((request?.init.headers as Headers).get("authorization")).toBe(
      "Bearer fixture-token",
    );
    expect((request?.init.headers as Headers).get("content-type")).toBe(
      "application/json",
    );
    expect(request?.init.body).toBe(JSON.stringify({ id: "7", kind: "cat" }));
    expect(request?.init.signal).toBeInstanceOf(AbortSignal);
  });

  test("rejects invalid, external, cyclic and oversized OpenAPI inputs within fixed limits", () => {
    expect(() => parseOpenApiDocument({ openapi: "2.0", paths: {} })).toThrow(
      /supported 3.0\/3.1/,
    );
    expect(() =>
      parseOpenApiDocument({
        openapi: "3.1.0",
        paths: {
          "/x": {
            get: {
              responses: {},
              parameters: [
                { name: "id", in: "path", schema: { type: "string" } },
              ],
            },
          },
        },
      }),
    ).toThrow(/parameter|path/i);
    expect(() =>
      parseOpenApiDocument({
        openapi: "3.0.3",
        paths: {},
        components: {
          schemas: {
            Invalid: { type: "object", required: ["missing"], properties: {} },
          },
        },
      }),
    ).toThrow(/unknown property/);
    const invalidInlineSchema = {
      openapi: "3.1.0",
      paths: {
        "/x": {
          post: {
            requestBody: {
              content: {
                "application/json": { schema: { type: "imaginary" } },
              },
            },
            responses: {},
          },
        },
      },
    };
    expect(() => parseOpenApiDocument(invalidInlineSchema)).toThrow(
      /Invalid schema type/,
    );
    expect(() =>
      parseOpenApiDocument({
        openapi: "3.1.0",
        paths: {
          "/x": {
            get: {
              responses: {},
              parameters: [{ $ref: "https://example.test/schema.json" }],
            },
          },
        },
      }),
    ).toThrow(/Only local/);
    expect(() =>
      parseOpenApiDocument({
        openapi: "3.1.0",
        paths: {},
        components: {
          schemas: { Broken: { $ref: "#/components/schemas/Nope" } },
        },
      }),
    ).toThrow(/does not resolve/);
    const cyclic: Record<string, unknown> = { openapi: "3.1.0", paths: {} };
    cyclic.self = cyclic;
    expect(() => parseOpenApiDocument(cyclic)).toThrow(/acyclic|cyclic/);
    expect(() =>
      parseOpenApiDocument({
        openapi: "3.1.0",
        paths: {},
        description: "x".repeat(1_050_000),
      }),
    ).toThrow(/1 MiB/);
  });
});
