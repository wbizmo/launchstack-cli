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
  test("rejects reserved fields", () => { expect(() => planModuleGeneration({ projectDirectory: fixture(), kind: "resource", name: "invoice", fields: [{ name: "ownerId", type: "string" }] })).toThrow(); });
});
