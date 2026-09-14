import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadProjectManifest } from "../project/manifest";
import { resolveProjectPath } from "../project/paths";
import { hashFile, loadProjectState, serializeProjectState } from "../project/state";
import { applyFileMutations, withTrackedMutations } from "../project/transaction";
import type { FileMutation, ProjectState } from "../project/types";
import { currentLaunchStackVersion } from "../version";

export type ResourceFieldType = "string" | "number" | "boolean" | "date";
export type ResourceField = { name: string; type: ResourceFieldType; optional?: boolean };
export type ModuleGenerationPlan = { projectDirectory: string; kind: "module" | "resource"; name: string; files: string[]; mutations: FileMutation[]; nextState: ProjectState; migrationCommand?: string };

const RESERVED_FIELDS = new Set(["id", "ownerId", "createdAt", "updatedAt"]);
const FIELD_TYPES = new Set<ResourceFieldType>(["string", "number", "boolean", "date"]);
const validateName = (name: string) => {
  if (!/^[a-z][a-z0-9-]{0,48}$/.test(name)) throw new Error("Generated names must use lowercase letters, numbers, and hyphens.");
  return name;
};

function validateFields(fields: ResourceField[]): ResourceField[] {
  const names = new Set<string>();
  for (const field of fields) {
    if (!/^[a-z][A-Za-z0-9_]{0,48}$/.test(field.name)) throw new Error(`Invalid field name: ${field.name}`);
    if (RESERVED_FIELDS.has(field.name)) throw new Error(`Field name is reserved: ${field.name}`);
    if (!FIELD_TYPES.has(field.type)) throw new Error(`Unsupported field type: ${String(field.type)}`);
    if (names.has(field.name)) throw new Error(`Duplicate field name: ${field.name}`);
    names.add(field.name);
  }
  return fields;
}

const camel = (name: string) => name.replace(/-([a-z0-9])/g, (_, value: string) => value.toUpperCase());
const pascal = (name: string) => { const value = camel(name); return value.charAt(0).toUpperCase() + value.slice(1); };
const plural = (name: string) => name.endsWith("s") ? `${name}es` : name.endsWith("y") ? `${name.slice(0, -1)}ies` : `${name}s`;

export function parseFieldSpec(spec: string): ResourceField {
  const match = spec.match(/^([a-z][A-Za-z0-9_]{0,48}):(string|number|boolean|date)(\?)?$/);
  if (!match) throw new Error(`Invalid field specification: ${spec}`);
  const [, name, type, optional] = match;
  return validateFields([{ name: name ?? "field", type: type as ResourceFieldType, optional: Boolean(optional) }])[0] as ResourceField;
}

function zodType(field: ResourceField): string { const base = field.type === "string" ? "z.string().trim().min(1).max(500)" : field.type === "number" ? "z.number().finite()" : field.type === "boolean" ? "z.boolean()" : "z.coerce.date()"; return field.optional ? `${base}.optional()` : base; }
function prismaType(field: ResourceField): string { const base = field.type === "string" ? "String" : field.type === "number" ? "Float" : field.type === "boolean" ? "Boolean" : "DateTime"; return `${base}${field.optional ? "?" : ""}`; }
function moduleFiles(name: string): Record<string, string> { const cls = pascal(name); return { [`src/modules/${name}/${name}.service.ts`]: `export class ${cls}Service { health(): { module: string; ready: true } { return { module: ${JSON.stringify(name)}, ready: true }; } }\n`, [`src/modules/${name}/${name}.controller.ts`]: `import type { FastifyReply, FastifyRequest } from "fastify";\nimport { ${cls}Service } from "./${name}.service";\nexport class ${cls}Controller { constructor(private readonly service = new ${cls}Service()) {} health = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => { await reply.send(this.service.health()); }; }\n`, [`src/modules/${name}/${name}.routes.ts`]: `import type { FastifyInstance } from "fastify";\nimport { ${cls}Controller } from "./${name}.controller";\nexport async function ${camel(name)}Routes(app: FastifyInstance): Promise<void> { const controller = new ${cls}Controller(); app.get("/health", { preHandler: [app.authenticate] }, controller.health); }\n` }; }
function resourceFiles(name: string, fields: ResourceField[]): Record<string, string> { const cls = pascal(name); const delegate = camel(name); const values = fields.length ? fields : [{ name: "title", type: "string" as const }]; const schemaFields = values.map((field) => `  ${field.name}: ${zodType(field)}`).join(",\n"); const updateFields = values.map((field) => `  ${field.name}: ${zodType({ ...field, optional: true })}`).join(",\n"); const assignments = values.map((field) => `${field.name}: input.${field.name}`).join(", "); const modelFields = values.map((field) => `  ${field.name} ${prismaType(field)}`).join("\n"); return { [`src/modules/${name}/${name}.schemas.ts`]: `import { z } from "zod";\nexport const create${cls}Schema = z.object({\n${schemaFields}\n}).strict();\nexport const update${cls}Schema = z.object({\n${updateFields}\n}).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required");\nexport const ${delegate}IdSchema = z.object({ id: z.string().min(1).max(128) }).strict();\nexport type Create${cls}Input = z.infer<typeof create${cls}Schema>;\nexport type Update${cls}Input = z.infer<typeof update${cls}Schema>;\n`, [`src/modules/${name}/${name}.repository.ts`]: `import { PrismaClient } from "@prisma/client";\nimport type { Create${cls}Input, Update${cls}Input } from "./${name}.schemas";\nexport class ${cls}Repository { constructor(private readonly prisma: PrismaClient) {} create(ownerId: string, input: Create${cls}Input) { return this.prisma.${delegate}.create({ data: { ownerId, ${assignments} } }); } list(ownerId: string) { return this.prisma.${delegate}.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 100 }); } findOwned(id: string, ownerId: string) { return this.prisma.${delegate}.findFirst({ where: { id, ownerId } }); } updateOwned(id: string, ownerId: string, input: Update${cls}Input) { return this.prisma.$transaction(async (tx) => { const current = await tx.${delegate}.findFirst({ where: { id, ownerId }, select: { id: true } }); if (!current) return null; return tx.${delegate}.update({ where: { id: current.id }, data: input }); }); } deleteOwned(id: string, ownerId: string): Promise<boolean> { return this.prisma.${delegate}.deleteMany({ where: { id, ownerId } }).then((result) => result.count === 1); } }\n`, [`src/modules/${name}/${name}.service.ts`]: `import { ApplicationError } from "../../core/errors/application-error";\nimport { prisma } from "../../lib/prisma";\nimport { ${cls}Repository } from "./${name}.repository";\nimport type { Create${cls}Input, Update${cls}Input } from "./${name}.schemas";\nexport class ${cls}Service { constructor(private readonly repository = new ${cls}Repository(prisma)) {} create(ownerId: string, input: Create${cls}Input) { return this.repository.create(ownerId, input); } list(ownerId: string) { return this.repository.list(ownerId); } async get(ownerId: string, id: string) { const value = await this.repository.findOwned(id, ownerId); if (!value) throw new ApplicationError({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: ${JSON.stringify(`${cls} not found.`)} }); return value; } async update(ownerId: string, id: string, input: Update${cls}Input) { const value = await this.repository.updateOwned(id, ownerId, input); if (!value) throw new ApplicationError({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: ${JSON.stringify(`${cls} not found.`)} }); return value; } async remove(ownerId: string, id: string): Promise<void> { if (!(await this.repository.deleteOwned(id, ownerId))) throw new ApplicationError({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: ${JSON.stringify(`${cls} not found.`)} }); } }\n`, [`src/modules/${name}/${name}.controller.ts`]: `import type { FastifyReply, FastifyRequest } from "fastify";\nimport { create${cls}Schema, ${delegate}IdSchema, update${cls}Schema } from "./${name}.schemas";\nimport { ${cls}Service } from "./${name}.service";\nexport class ${cls}Controller { constructor(private readonly service = new ${cls}Service()) {} create = async (request: FastifyRequest, reply: FastifyReply) => reply.code(201).send(await this.service.create(request.user.sub, create${cls}Schema.parse(request.body))); list = async (request: FastifyRequest, reply: FastifyReply) => reply.send(await this.service.list(request.user.sub)); get = async (request: FastifyRequest, reply: FastifyReply) => { const { id } = ${delegate}IdSchema.parse(request.params); return reply.send(await this.service.get(request.user.sub, id)); }; update = async (request: FastifyRequest, reply: FastifyReply) => { const { id } = ${delegate}IdSchema.parse(request.params); return reply.send(await this.service.update(request.user.sub, id, update${cls}Schema.parse(request.body))); }; remove = async (request: FastifyRequest, reply: FastifyReply) => { const { id } = ${delegate}IdSchema.parse(request.params); await this.service.remove(request.user.sub, id); return reply.code(204).send(); }; }\n`, [`src/modules/${name}/${name}.routes.ts`]: `import type { FastifyInstance } from "fastify";\nimport { ${cls}Controller } from "./${name}.controller";\nexport async function ${delegate}Routes(app: FastifyInstance): Promise<void> { const controller = new ${cls}Controller(); const auth = { preHandler: [app.authenticate] }; app.post("/", auth, controller.create); app.get("/", auth, controller.list); app.get("/:id", auth, controller.get); app.patch("/:id", auth, controller.update); app.delete("/:id", auth, controller.remove); }\n`, [`docs/generated/${name}-prisma.md`]: `# ${cls} data model\n\nRun \`npm run prisma:migrate -- --name add-${name}\` before shipping. Every generated lookup/update/delete is owner-scoped by \`ownerId\`; add domain RBAC and invariants in the service.\n`, [`.__launchstack_model_${name}`]: `model ${cls} {\n  id String @id @default(cuid())\n  ownerId String\n${modelFields}\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([ownerId, createdAt])\n}\n` }; }
function parseRoutes(content: string): string[] { const marker = content.match(/\/\* launchstack-routes: (\[[^\n]*\]) \*\//); if (!marker?.[1]) return []; const parsed = JSON.parse(marker[1]); return Array.isArray(parsed) && parsed.every((value) => typeof value === "string") ? parsed : []; }
function renderRoutes(names: string[]): string { const sorted = [...new Set(names)].sort(); const imports = sorted.map((name) => `import { ${camel(name)}Routes } from "../modules/${name}/${name}.routes";`).join("\n"); const registrations = sorted.map((name) => `  await app.register(${camel(name)}Routes, { prefix: ${JSON.stringify(`/api/${plural(name)}`)} });`).join("\n"); return `import type { FastifyInstance } from "fastify";\n${imports ? `${imports}\n` : ""}\n/* launchstack-routes: ${JSON.stringify(sorted)} */\nexport async function registerGeneratedRoutes(app: FastifyInstance): Promise<void> {\n${registrations || "  void app;"}\n}\n`; }

export function planModuleGeneration(input: { projectDirectory: string; kind: "module" | "resource"; name: string; fields?: ResourceField[] }): ModuleGenerationPlan {
  const projectDirectory = resolve(input.projectDirectory);
  const name = validateName(input.name);
  const fields = input.kind === "resource" ? validateFields(input.fields ?? []) : [];
  const manifest = loadProjectManifest(projectDirectory);
  const state = loadProjectState(projectDirectory, { templateVersion: manifest.project.templateVersion, cliVersion: currentLaunchStackVersion() });
  const files = input.kind === "resource" ? resourceFiles(name, fields) : moduleFiles(name);
  const mutations: FileMutation[] = [];
  const owner = `generator:${input.kind}:${name}`;
  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith(".__launchstack_model_")) continue;
    const absolute = resolveProjectPath(projectDirectory, path);
    if (existsSync(absolute)) throw new Error(`Generation collision: ${path} already exists.`);
    mutations.push({ type: "write", path, content, owner, version: currentLaunchStackVersion(), expectedSha256: null });
  }
  const registryPath = "src/routes/launchstack.generated.ts";
  const registryAbsolute = resolveProjectPath(projectDirectory, registryPath);
  const registryCurrent = existsSync(registryAbsolute) ? readFileSync(registryAbsolute, "utf8") : `import type { FastifyInstance } from "fastify";\n\n/* launchstack-routes: [] */\nexport async function registerGeneratedRoutes(app: FastifyInstance): Promise<void> { void app; }\n`;
  const names = parseRoutes(registryCurrent);
  if (!names.includes(name)) names.push(name);
  const nextRegistry = renderRoutes(names);
  if (nextRegistry !== registryCurrent) mutations.push({ type: "write", path: registryPath, content: nextRegistry, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync(registryAbsolute) ? hashFile(registryAbsolute) : null });
  let migrationCommand: string | undefined;
  if (input.kind === "resource") {
    const schemaPath = "prisma/schema.prisma";
    const schemaAbsolute = resolveProjectPath(projectDirectory, schemaPath);
    if (!existsSync(schemaAbsolute)) throw new Error("Cannot generate a CRUD resource without prisma/schema.prisma.");
    const schema = readFileSync(schemaAbsolute, "utf8");
    const model = files[`.__launchstack_model_${name}`] ?? "";
    if (new RegExp(`\\bmodel\\s+${pascal(name)}\\b`).test(schema)) throw new Error(`Prisma model ${pascal(name)} already exists.`);
    mutations.push({ type: "write", path: schemaPath, content: `${schema.trimEnd()}\n\n${model}`, owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: hashFile(schemaAbsolute) });
    migrationCommand = `npm run prisma:migrate -- --name add-${name}`;
  }
  const nextState = withTrackedMutations(state, mutations);
  nextState.updatedAt = new Date().toISOString();
  const statePath = ".launchstack/state.json";
  const stateAbsolute = resolveProjectPath(projectDirectory, statePath);
  mutations.push({ type: "write", path: statePath, content: serializeProjectState(nextState), owner: "launchstack:metadata", version: currentLaunchStackVersion(), expectedSha256: existsSync(stateAbsolute) ? hashFile(stateAbsolute) : null });
  return { projectDirectory, kind: input.kind, name, files: mutations.map((mutation) => mutation.path).sort(), mutations, nextState, migrationCommand };
}

export function applyModuleGeneration(plan: ModuleGenerationPlan): ProjectState {
  return applyFileMutations({ projectDirectory: plan.projectDirectory, mutations: plan.mutations, state: loadProjectState(plan.projectDirectory), nextState: plan.nextState });
}
