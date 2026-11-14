import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseTypeScript } from "@babel/parser";
import {
  createProjectManifest,
  loadProjectManifest,
  serializeProjectManifest,
} from "./manifest";
import { resolveProjectPath } from "./paths";
import { hashFile, loadProjectState, serializeProjectState } from "./state";
import { applyFileMutations, withTrackedMutations } from "./transaction";
import {
  emptyProjectState,
  type FileMutation,
  type LifecycleAction,
  type ProjectManifest,
  type ProjectState,
} from "./types";
import { currentLaunchStackVersion } from "../version";

export const V3_TEMPLATE_VERSION = "3.0.0";
const LEGACY_V2_TEMPLATE_VERSION = "2.0.0";
type BabelNode = {
  type: string;
  start?: number | null;
  end?: number | null;
  name?: string;
  id?: BabelNode;
  value?: string;
  body?: BabelNode | BabelNode[];
  specifiers?: BabelNode[];
  source?: BabelNode;
  imported?: BabelNode;
  local?: BabelNode;
  expression?: BabelNode;
  argument?: BabelNode;
  callee?: BabelNode;
  arguments?: BabelNode[];
  declaration?: BabelNode;
  declarations?: BabelNode[];
};
type ParsedSource = { program: { body: BabelNode[] } };

export type UpgradeDiff = {
  path: string;
  before: string | null;
  after: string | null;
};
export type UpgradePlan = {
  projectDirectory: string;
  fromVersion: string;
  toVersion: string;
  actions: LifecycleAction[];
  conflicts: string[];
  mutations: FileMutation[];
  diffs: UpgradeDiff[];
  nextManifest: ProjectManifest;
  nextState: ProjectState;
};

type LegacyProject = {
  name: string;
  packageVersion: string;
  templateVersion: string;
};
export type MigrationVersionCondition = {
  target: "manifest" | "state";
  version: "from" | "to";
};
export type TemplateMigration = {
  from: string;
  to: string;
  id: string;
  dependsOn: readonly string[];
  preconditions: readonly MigrationVersionCondition[];
  postconditions: readonly MigrationVersionCondition[];
};
type Migration = TemplateMigration;
const MIGRATIONS: readonly TemplateMigration[] = [
  {
    from: LEGACY_V2_TEMPLATE_VERSION,
    to: V3_TEMPLATE_VERSION,
    id: "v2-to-v3",
    dependsOn: [],
    preconditions: [
      { target: "manifest", version: "from" },
      { target: "state", version: "from" },
    ],
    postconditions: [
      { target: "manifest", version: "to" },
      { target: "state", version: "to" },
    ],
  },
];

function readText(
  projectDirectory: string,
  path: string,
): { content: string; hash: string } {
  const absolute = resolveProjectPath(projectDirectory, path);
  if (!existsSync(absolute))
    throw new Error(`Expected project file is missing: ${path}`);
  return { content: readFileSync(absolute, "utf8"), hash: hashFile(absolute) };
}

function inferLegacyProject(projectDirectory: string): LegacyProject {
  const packagePath = resolveProjectPath(projectDirectory, "package.json");
  if (!existsSync(packagePath))
    throw new Error(
      "No launchstack.json or package.json was found; this does not look like a LaunchStack project.",
    );
  let parsed: { name?: unknown; version?: unknown };
  try {
    parsed = JSON.parse(readFileSync(packagePath, "utf8")) as {
      name?: unknown;
      version?: unknown;
    };
  } catch {
    throw new Error("Legacy package.json is not valid JSON.");
  }
  if (typeof parsed.name !== "string" || typeof parsed.version !== "string")
    throw new Error(
      "Legacy package.json does not contain a valid name/version.",
    );
  if (
    !existsSync(resolveProjectPath(projectDirectory, "src/app.ts")) ||
    !existsSync(resolveProjectPath(projectDirectory, "src/routes/index.ts"))
  )
    throw new Error(
      "Legacy project is missing LaunchStack architecture files.",
    );
  if (!/^2\./.test(parsed.version) && !/^3\./.test(parsed.version))
    throw new Error(`Unsupported legacy package version: ${parsed.version}`);
  return {
    name: parsed.name,
    packageVersion: parsed.version,
    templateVersion: parsed.version.startsWith("2.")
      ? LEGACY_V2_TEMPLATE_VERSION
      : V3_TEMPLATE_VERSION,
  };
}

function parseSource(content: string, path: string): ParsedSource {
  try {
    return parseTypeScript(content, {
      sourceType: "unambiguous",
      plugins: ["typescript"],
      errorRecovery: false,
    }) as unknown as ParsedSource;
  } catch (error) {
    throw new Error(
      `Cannot parse ${path} as TypeScript: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function moduleName(node: BabelNode | undefined): string | undefined {
  return node?.value;
}
function localName(node: BabelNode | undefined): string | undefined {
  return node?.name;
}

function findNamedImport(
  source: ParsedSource,
  name: string,
): { module: string; binding: BabelNode } | undefined {
  for (const statement of source.program.body) {
    if (statement.type !== "ImportDeclaration") continue;
    for (const binding of statement.specifiers ?? []) {
      if (binding.type !== "ImportSpecifier") continue;
      if (
        localName(binding.local) === name ||
        localName(binding.imported) === name ||
        moduleName(binding.imported) === name
      ) {
        const module = moduleName(statement.source);
        if (module) return { module, binding };
      }
    }
  }
  return undefined;
}

function addNamedImport(
  content: string,
  path: string,
  name: string,
  module: string,
): string {
  const source = parseSource(content, path);
  const current = findNamedImport(source, name);
  if (current) {
    if (current.module !== module)
      throw new Error(
        `Cannot safely upgrade ${path}: ${name} is already imported from ${current.module}.`,
      );
    return content;
  }
  const imports = source.program.body.filter(
    (item) => item.type === "ImportDeclaration",
  );
  const insertion = imports[imports.length - 1]?.end ?? 0;
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const quote = imports.some((item) =>
    content.slice(item.start ?? 0, item.end ?? 0).includes("'"),
  )
    ? "'"
    : '"';
  return `${content.slice(0, insertion)}${newline}import { ${name} } from ${quote}${module}${quote};${content.slice(insertion)}`;
}

function findFunction(
  source: ParsedSource,
  name: string,
): BabelNode | undefined {
  for (const statement of source.program.body) {
    const declaration =
      statement.type === "ExportNamedDeclaration"
        ? statement.declaration
        : statement;
    if (
      declaration?.type === "FunctionDeclaration" &&
      localName(declaration.id) === name
    )
      return declaration;
  }
  return undefined;
}

function visit(node: BabelNode, callback: (item: BabelNode) => void): void {
  callback(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === "object" && "type" in child)
          visit(child as BabelNode, callback);
      }
    } else if (value && typeof value === "object" && "type" in value) {
      visit(value as BabelNode, callback);
    }
  }
}

function functionCalls(functionNode: BabelNode, name: string): BabelNode[] {
  const calls: BabelNode[] = [];
  if (functionNode.body && !Array.isArray(functionNode.body))
    visit(functionNode.body, (node) => {
      if (
        node.type === "CallExpression" &&
        node.callee?.type === "Identifier" &&
        localName(node.callee) === name
      )
        calls.push(node);
    });
  return calls;
}

function exportsFunction(content: string, path: string, name: string): boolean {
  const source = parseSource(content, path);
  return source.program.body.some((statement) => {
    if (statement.type !== "ExportNamedDeclaration" || !statement.declaration)
      return false;
    const declaration = statement.declaration;
    if (declaration.type === "FunctionDeclaration")
      return localName(declaration.id) === name;
    if (declaration.type !== "VariableDeclaration") return false;
    return (declaration.declarations ?? []).some(
      (item) => localName(item.id) === name,
    );
  });
}

function addAwaitCall(
  content: string,
  path: string,
  functionName: string,
  callName: string,
  afterCallName?: string,
): string {
  const source = parseSource(content, path);
  const functionNode = findFunction(source, functionName);
  const body = functionNode?.body;
  if (
    !body ||
    Array.isArray(body) ||
    body.type !== "BlockStatement" ||
    !Array.isArray(body.body)
  )
    throw new Error(
      `Cannot safely upgrade ${path}: ${functionName} function was not found.`,
    );
  if (functionCalls(functionNode, callName).length) return content;
  const anchor = afterCallName
    ? body.body.find(
        (statement) =>
          statement.type === "ExpressionStatement" &&
          statement.expression?.type === "AwaitExpression" &&
          statement.expression.argument?.type === "CallExpression" &&
          statement.expression.argument.callee?.type === "Identifier" &&
          localName(statement.expression.argument.callee) === afterCallName,
      )
    : undefined;
  const insertion = anchor?.end ?? (body.end ?? content.length) - 1;
  const lineStart = content.lastIndexOf("\n", insertion - 1) + 1;
  const currentLine = content.slice(lineStart, insertion);
  const indent = /^\s*/.exec(currentLine)?.[0] ?? "  ";
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  return `${content.slice(0, insertion)}${newline}${indent}await ${callName}(app);${content.slice(insertion)}`;
}

function addIntegration(
  content: string,
  path: string,
  options: {
    functionName: string;
    importName: string;
    module: string;
    afterCallName?: string;
  },
): string {
  const source = parseSource(content, path);
  const imported = findNamedImport(source, options.importName);
  const functionNode = findFunction(source, options.functionName);
  if (!functionNode?.body)
    throw new Error(
      `Cannot safely upgrade ${path}: ${options.functionName} function was not found.`,
    );
  const alreadyCalled =
    functionCalls(functionNode, options.importName).length > 0;
  if (alreadyCalled && !imported)
    throw new Error(
      `Cannot safely upgrade ${path}: ${options.importName} is called without a matching import.`,
    );
  if (!alreadyCalled && imported && imported.module !== options.module)
    throw new Error(
      `Cannot safely upgrade ${path}: ${options.importName} is imported from ${imported.module}.`,
    );
  if (alreadyCalled) return content;
  const withImport = addNamedImport(
    content,
    path,
    options.importName,
    options.module,
  );
  return addAwaitCall(
    withImport,
    path,
    options.functionName,
    options.importName,
    options.afterCallName,
  );
}

function orderMigrations(migrations: readonly Migration[]): Migration[] {
  const byId = new Map<string, Migration>();
  for (const migration of migrations) {
    if (byId.has(migration.id))
      throw new Error(`Duplicate migration id: ${migration.id}.`);
    if (migration.from === migration.to)
      throw new Error(
        `Migration ${migration.id} cannot target its source version.`,
      );
    byId.set(migration.id, migration);
  }

  const ordered: Migration[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visitMigration = (id: string): void => {
    const migration = byId.get(id);
    if (!migration) throw new Error(`Unknown migration dependency: ${id}.`);
    if (visited.has(id)) return;
    if (visiting.has(id))
      throw new Error(`Migration dependency cycle detected at ${id}.`);
    visiting.add(id);
    for (const dependency of [...migration.dependsOn].sort())
      visitMigration(dependency);
    visiting.delete(id);
    visited.add(id);
    ordered.push(migration);
  };
  for (const id of [...byId.keys()].sort()) visitMigration(id);
  return ordered;
}

export function resolveMigrationChain(
  from: string,
  to: string,
  migrations: readonly TemplateMigration[] = MIGRATIONS,
): TemplateMigration[] {
  const ordered = orderMigrations(migrations);
  const chain: Migration[] = [];
  const visited = new Set<string>();
  const completed = new Set<string>();
  let version = from;
  while (version !== to) {
    if (visited.has(version))
      throw new Error(`Migration cycle detected at template ${version}.`);
    visited.add(version);
    const candidates = ordered.filter((item) => item.from === version);
    const available = candidates.filter((item) =>
      item.dependsOn.every((dependency) => completed.has(dependency)),
    );
    if (available.length > 1)
      throw new Error(
        `Ambiguous ordered migrations from template ${version} to ${to}.`,
      );
    const migration = available[0];
    if (!migration && candidates.length)
      throw new Error(
        `Migration dependency is not satisfied before template ${version}.`,
      );
    if (!migration)
      throw new Error(
        `No ordered migration is registered from template ${version} to ${to}.`,
      );
    chain.push(migration);
    completed.add(migration.id);
    version = migration.to;
  }
  return chain;
}

function validateMigrationConditions(
  chain: readonly Migration[],
  manifestVersion: string,
  stateVersion: string,
): void {
  let versions = { manifest: manifestVersion, state: stateVersion };
  for (const migration of chain) {
    for (const condition of migration.preconditions) {
      const expected = migration[condition.version];
      if (versions[condition.target] !== expected)
        throw new Error(
          `Migration ${migration.id} precondition failed: ${condition.target} template version must be ${expected}.`,
        );
    }
    versions = { manifest: migration.to, state: migration.to };
    for (const condition of migration.postconditions) {
      const expected = migration[condition.version];
      if (versions[condition.target] !== expected)
        throw new Error(
          `Migration ${migration.id} postcondition failed: ${condition.target} template version must be ${expected}.`,
        );
    }
  }
}

function metadataMutation(
  projectDirectory: string,
  path: string,
  content: string,
): FileMutation | null {
  const absolute = resolveProjectPath(projectDirectory, path);
  const existing = existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
  if (existing === content) return null;
  return {
    type: "write",
    path,
    content,
    owner: "launchstack:metadata",
    version: currentLaunchStackVersion(),
    expectedSha256: existsSync(absolute) ? hashFile(absolute) : null,
  };
}

function migrationFiles(
  projectDirectory: string,
  migration: Migration,
  mutations: FileMutation[],
  actions: LifecycleAction[],
  conflicts: string[],
): void {
  const routeRegistry = "src/routes/launchstack.generated.ts";
  const capabilityRegistry = "src/launchstack/capabilities/index.ts";
  const generated = [
    {
      path: routeRegistry,
      content: `import type { FastifyInstance } from "fastify";\n\n/* launchstack-routes: [] */\nexport async function registerGeneratedRoutes(app: FastifyInstance): Promise<void> { void app; }\n`,
      owner: "launchstack:core",
    },
    {
      path: capabilityRegistry,
      content: `import type { FastifyInstance } from "fastify";\nexport async function registerLaunchStackCapabilities(app: FastifyInstance): Promise<void> { void app; }\n`,
      owner: "launchstack:core",
    },
  ];
  for (const file of generated) {
    const absolute = resolveProjectPath(projectDirectory, file.path);
    if (!existsSync(absolute)) {
      mutations.push({
        type: "write",
        path: file.path,
        content: file.content,
        owner: file.owner,
        version: migration.to,
        expectedSha256: null,
      });
      actions.push({
        id: `${migration.id}:${file.path}`,
        kind: "write",
        target: file.path,
        detail: `create ${file.owner} registry`,
      });
    } else {
      const exportedName =
        file.path === routeRegistry
          ? "registerGeneratedRoutes"
          : "registerLaunchStackCapabilities";
      try {
        if (
          !exportsFunction(
            readFileSync(absolute, "utf8"),
            file.path,
            exportedName,
          )
        )
          conflicts.push(
            `Cannot safely upgrade ${file.path}: existing file does not export ${exportedName}.`,
          );
      } catch (error) {
        conflicts.push(error instanceof Error ? error.message : String(error));
      }
    }
  }
  if (conflicts.length) return;

  const integrationFiles = [
    {
      path: "src/routes/index.ts",
      module: "./launchstack.generated",
      importName: "registerGeneratedRoutes",
      functionName: "registerRoutes",
      afterCallName: "readinessRoutes",
    },
    {
      path: "src/app.ts",
      module: "./launchstack/capabilities",
      importName: "registerLaunchStackCapabilities",
      functionName: "buildApp",
      afterCallName: "registerPlugins",
    },
  ];
  for (const item of integrationFiles) {
    try {
      const current = readText(projectDirectory, item.path);
      const next = addIntegration(current.content, item.path, item);
      if (next !== current.content) {
        mutations.push({
          type: "write",
          path: item.path,
          content: next,
          owner: `launchstack:integration:${item.functionName}`,
          version: migration.to,
          expectedSha256: current.hash,
          baseSha256: current.hash,
        });
        actions.push({
          id: `${migration.id}:${item.functionName}`,
          kind: "write",
          target: item.path,
          detail: `add the ${item.importName} integration while preserving surrounding source`,
        });
      }
    } catch (error) {
      conflicts.push(error instanceof Error ? error.message : String(error));
    }
  }
}

function makeDiff(
  projectDirectory: string,
  mutations: FileMutation[],
): UpgradeDiff[] {
  return mutations.map((mutation) => ({
    path: mutation.path,
    before: existsSync(resolveProjectPath(projectDirectory, mutation.path))
      ? readFileSync(
          resolveProjectPath(projectDirectory, mutation.path),
          "utf8",
        )
      : null,
    after: mutation.type === "write" ? mutation.content : null,
  }));
}

export function planUpgrade(projectDirectoryInput: string): UpgradePlan {
  const projectDirectory = resolve(projectDirectoryInput);
  const hasManifest = existsSync(
    resolveProjectPath(projectDirectory, "launchstack.json"),
  );
  const legacy = hasManifest ? null : inferLegacyProject(projectDirectory);
  const manifest = hasManifest
    ? loadProjectManifest(projectDirectory)
    : createProjectManifest({
        name: legacy?.name ?? "legacy-project",
        templateVersion: legacy?.templateVersion ?? LEGACY_V2_TEMPLATE_VERSION,
      });
  const fromVersion = manifest.project.templateVersion;
  const state = hasManifest
    ? loadProjectState(projectDirectory, {
        templateVersion: fromVersion,
        cliVersion: currentLaunchStackVersion(),
      })
    : emptyProjectState(fromVersion, currentLaunchStackVersion());
  const actions: LifecycleAction[] = [];
  const conflicts: string[] = [];
  const mutations: FileMutation[] = [];
  let chain: Migration[] = [];
  try {
    chain = resolveMigrationChain(fromVersion, V3_TEMPLATE_VERSION);
    validateMigrationConditions(
      chain,
      manifest.project.templateVersion,
      state.templateVersion,
    );
  } catch (error) {
    conflicts.push(error instanceof Error ? error.message : String(error));
  }
  const migration = chain[chain.length - 1] ?? {
    from: fromVersion,
    to: V3_TEMPLATE_VERSION,
    id: "v3-ensure",
  };
  if (
    (chain.length || fromVersion === V3_TEMPLATE_VERSION) &&
    !conflicts.length
  )
    migrationFiles(projectDirectory, migration, mutations, actions, conflicts);

  const nextManifest = structuredClone(manifest);
  if (chain.length) {
    nextManifest.project.templateVersion = V3_TEMPLATE_VERSION;
    actions.push({
      id: "template-migration",
      kind: "upgrade",
      target: "launchstack.json",
      detail: `${fromVersion} -> ${V3_TEMPLATE_VERSION}`,
    });
  }
  const nextState = mutations.length
    ? withTrackedMutations(state, mutations)
    : structuredClone(state);
  nextState.templateVersion = nextManifest.project.templateVersion;
  const stateChanged =
    conflicts.length === 0 &&
    (state.cliVersion !== currentLaunchStackVersion() ||
      state.templateVersion !== nextState.templateVersion ||
      mutations.length > 0 ||
      !hasManifest);
  if (stateChanged) {
    nextState.cliVersion = currentLaunchStackVersion();
    nextState.updatedAt = new Date().toISOString();
  }
  const nextManifestMutation = conflicts.length
    ? null
    : metadataMutation(
        projectDirectory,
        "launchstack.json",
        serializeProjectManifest(nextManifest),
      );
  const nextStateMutation = conflicts.length
    ? null
    : metadataMutation(
        projectDirectory,
        ".launchstack/state.json",
        serializeProjectState(nextState),
      );
  for (const item of [nextManifestMutation, nextStateMutation])
    if (item) mutations.push(item);
  if (nextManifestMutation || nextStateMutation)
    actions.push({
      id: "cli-metadata",
      kind: "write",
      target: ".launchstack/state.json",
      detail: `record CLI ${currentLaunchStackVersion()} without changing template schema version`,
    });

  return {
    projectDirectory,
    fromVersion,
    toVersion: nextManifest.project.templateVersion,
    actions,
    conflicts,
    mutations,
    diffs: makeDiff(projectDirectory, mutations),
    nextManifest,
    nextState,
  };
}

export function applyUpgrade(plan: UpgradePlan): ProjectState {
  if (plan.conflicts.length)
    throw new Error(`Upgrade conflicts: ${plan.conflicts.join("; ")}`);
  const currentState = existsSync(
    resolveProjectPath(plan.projectDirectory, ".launchstack/state.json"),
  )
    ? loadProjectState(plan.projectDirectory)
    : emptyProjectState(plan.fromVersion, currentLaunchStackVersion());
  return applyFileMutations({
    projectDirectory: plan.projectDirectory,
    mutations: plan.mutations,
    state: currentState,
    nextState: plan.nextState,
  });
}
