import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { planModuleGeneration } from "../src/generator/module";
import { createProjectManifest, serializeProjectManifest } from "../src/project/manifest";
import { emptyProjectState } from "../src/project/types";
import { serializeProjectState } from "../src/project/state";
function fixture(): string { const root = mkdtempSync(join(tmpdir(), "launchstack-gen-")); mkdirSync(join(root, ".launchstack"), { recursive: true }); mkdirSync(join(root, "src", "routes"), { recursive: true }); mkdirSync(join(root, "prisma"), { recursive: true }); writeFileSync(join(root, "launchstack.json"), serializeProjectManifest(createProjectManifest({ name: "fixture", templateVersion: "3.0.0" }))); writeFileSync(join(root, ".launchstack", "state.json"), serializeProjectState(emptyProjectState("3.0.0", "3.0.0"))); writeFileSync(join(root, "src", "routes", "launchstack.generated.ts"), 'import type { FastifyInstance } from "fastify";\n/* launchstack-routes: [] */\nexport async function registerGeneratedRoutes(app: FastifyInstance): Promise<void> { void app; }\n'); writeFileSync(join(root, "prisma", "schema.prisma"), 'generator client { provider = "prisma-client-js" }\ndatasource db { provider = "postgresql" url = env("DATABASE_URL") }\n'); return root; }
describe("v3 module/resource generator", () => {
  test("generates authenticated owner-scoped CRUD persistence", () => { const plan = planModuleGeneration({ projectDirectory: fixture(), kind: "resource", name: "invoice", fields: [{ name: "total", type: "number" }] }); const repository = plan.mutations.find((item) => item.type === "write" && item.path.endsWith("invoice.repository.ts")); const routes = plan.mutations.find((item) => item.type === "write" && item.path.endsWith("invoice.routes.ts")); expect(repository?.type === "write" ? repository.content : "").toContain("ownerId"); expect(repository?.type === "write" ? repository.content : "").toContain("deleteMany"); expect(routes?.type === "write" ? routes.content : "").toContain("app.authenticate"); });
  test("uses atomic owner predicates and indexed keyset pagination", () => {
    const plan = planModuleGeneration({ projectDirectory: fixture(), kind: "resource", name: "invoice", fields: [{ name: "total", type: "number" }] });
    const repository = plan.mutations.find((item) => item.type === "write" && item.path.endsWith("invoice.repository.ts"));
    const schema = plan.mutations.find((item) => item.type === "write" && item.path === "prisma/schema.prisma");
    const content = repository?.type === "write" ? repository.content : "";
    expect(content).toContain("updateManyAndReturn({ where: { id, ownerId }");
    expect(content).toContain("take: input.limit + 1");
    expect(content).toContain('orderBy: [{ createdAt: "desc" }, { id: "desc" }]');
    expect(content).toContain("nextCursor");
    expect(schema?.type === "write" ? schema.content : "").toContain("@@index([ownerId, createdAt, id])");
  });
  test("rejects reserved fields", () => { expect(() => planModuleGeneration({ projectDirectory: fixture(), kind: "resource", name: "invoice", fields: [{ name: "ownerId", type: "string" }] })).toThrow(); });
  test("rejects Prisma-reserved identifiers and ambiguous resource names", () => {
    expect(() => planModuleGeneration({ projectDirectory: fixture(), kind: "resource", name: "invoice", fields: [{ name: "model", type: "string" }] })).toThrow(/reserved/i);
    expect(() => planModuleGeneration({ projectDirectory: fixture(), kind: "resource", name: "bad--name" })).toThrow(/single hyphens/);
    expect(() => planModuleGeneration({ projectDirectory: fixture(), kind: "module", name: "prisma" })).toThrow(/reserved Prisma identifier/i);
  });
  test("rejects pluralized route-prefix collisions", () => {
    const root = fixture();
    writeFileSync(join(root, "src", "routes", "launchstack.generated.ts"), '/* launchstack-routes: ["category"] */\n');
    expect(() => planModuleGeneration({ projectDirectory: root, kind: "resource", name: "categorie" })).toThrow(/route prefix.*conflicts/i);
  });
});
