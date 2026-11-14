import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  createProjectManifest,
  loadProjectManifest,
  serializeProjectManifest,
} from "../src/project/manifest";
import { loadProjectState, serializeProjectState } from "../src/project/state";
import { emptyProjectState } from "../src/project/types";
import {
  applyUpgrade,
  planUpgrade,
  resolveMigrationChain,
  type TemplateMigration,
} from "../src/project/upgrade";

const roots: string[] = [];

function legacyProject(templateVersion = "2.0.0"): string {
  const root = mkdtempSync(join(tmpdir(), "launchstack-upgrade-v3-"));
  roots.push(root);
  mkdirSync(join(root, "src", "routes"), { recursive: true });
  mkdirSync(join(root, "src", "plugins"), { recursive: true });
  mkdirSync(join(root, ".launchstack"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "legacy-api", version: "2.1.3" }),
  );
  writeFileSync(
    join(root, "launchstack.json"),
    serializeProjectManifest(
      createProjectManifest({ name: "legacy-api", templateVersion }),
    ),
  );
  writeFileSync(
    join(root, ".launchstack", "state.json"),
    serializeProjectState(emptyProjectState(templateVersion, "2.1.3")),
  );
  writeFileSync(
    join(root, "src", "routes", "index.ts"),
    [
      'import { readinessRoutes } from "./readiness";',
      "",
      "export async function registerRoutes(app: any): Promise<void> {",
      "  await app.register(readinessRoutes);",
      "  await app.register(async () => { /* user route */ });",
      "}",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "src", "app.ts"),
    [
      'import { registerPlugins } from "./plugins";',
      "",
      "export async function buildApp(): Promise<void> {",
      "  await registerPlugins(app);",
      "  await registerDomainHandlers(app);",
      "}",
      "",
    ].join("\n"),
  );
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("versioned project migrations", () => {
  test("plans exact changes read-only and preserves user source during the v2-to-v3 migration", () => {
    const root = legacyProject();
    const routePath = join(root, "src", "routes", "index.ts");
    const appPath = join(root, "src", "app.ts");
    const originalRoutes = readFileSync(routePath, "utf8");
    const originalApp = readFileSync(appPath, "utf8");
    const plan = planUpgrade(root);

    expect(plan.fromVersion).toBe("2.0.0");
    expect(plan.toVersion).toBe("3.0.0");
    expect(plan.conflicts).toEqual([]);
    expect(plan.diffs.map((item) => item.path)).toEqual(
      expect.arrayContaining([
        "src/routes/index.ts",
        "src/app.ts",
        "launchstack.json",
        ".launchstack/state.json",
      ]),
    );
    expect(readFileSync(routePath, "utf8")).toBe(originalRoutes);
    expect(readFileSync(appPath, "utf8")).toBe(originalApp);

    applyUpgrade(plan);
    const routes = readFileSync(routePath, "utf8");
    const app = readFileSync(appPath, "utf8");
    const state = loadProjectState(root);
    expect(routes).toContain(
      "await app.register(async () => { /* user route */ });",
    );
    expect(routes).toContain("await registerGeneratedRoutes(app);");
    expect(app).toContain("await registerDomainHandlers(app);");
    expect(app).toContain("await registerLaunchStackCapabilities(app);");
    expect(state.managedFiles["src/routes/index.ts"]?.ownership).toBe("shared");
    expect(
      state.managedFiles["src/routes/index.ts"]?.migrationBaseSha256,
    ).toMatch(/^[a-f0-9]{64}$/);
    expect(loadProjectManifest(root).project.templateVersion).toBe("3.0.0");
    expect(
      JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version,
    ).toBe("2.1.3");
    expect(planUpgrade(root).mutations).toEqual([]);
  });

  test("preserves CRLF formatting and single-quote imports", () => {
    const root = legacyProject();
    const routePath = join(root, "src", "routes", "index.ts");
    const routes = readFileSync(routePath, "utf8")
      .replaceAll('"', "'")
      .replaceAll("\n", "\r\n");
    writeFileSync(routePath, routes);
    applyUpgrade(planUpgrade(root));
    const upgraded = readFileSync(routePath, "utf8");

    expect(upgraded).toContain(
      "import { registerGeneratedRoutes } from './launchstack.generated';\r\n",
    );
    expect(/(^|[^\r])\n/.test(upgraded)).toBe(false);
  });

  test("uses an aliased import when inserting the generated route call", () => {
    const root = legacyProject();
    const routePath = join(root, "src", "routes", "index.ts");
    const content = readFileSync(routePath, "utf8").replace(
      'import { readinessRoutes } from "./readiness";',
      'import { readinessRoutes } from "./readiness";\nimport { registerGeneratedRoutes as generatedRoutes } from "./launchstack.generated";',
    );
    writeFileSync(routePath, content);

    const plan = planUpgrade(root);
    const routeDiff = plan.diffs.find(
      (item) => item.path === "src/routes/index.ts",
    );
    expect(plan.conflicts).toEqual([]);
    expect(routeDiff?.after).toContain("await generatedRoutes(app);");
    expect(routeDiff?.after).not.toContain(
      "await registerGeneratedRoutes(app);",
    );
  });

  test("inserts capability integration before an early return", () => {
    const root = legacyProject();
    const appPath = join(root, "src", "app.ts");
    writeFileSync(
      appPath,
      'import { registerPlugins } from "./plugins";\nexport async function buildApp() {\n  await registerPlugins(app);\n  return app;\n}\n',
    );
    const plan = planUpgrade(root);
    const appDiff = plan.diffs.find((item) => item.path === "src/app.ts");
    expect(plan.conflicts).toEqual([]);
    expect(
      appDiff?.after?.indexOf("await registerLaunchStackCapabilities(app);"),
    ).toBeLessThan(appDiff?.after?.indexOf("return app;") ?? -1);
  });

  test("rejects an incompatible registry import even when it is already called", () => {
    const root = legacyProject();
    const routePath = join(root, "src", "routes", "index.ts");
    writeFileSync(
      routePath,
      'import { registerGeneratedRoutes } from "./custom";\nexport async function registerRoutes(app: any) { await registerGeneratedRoutes(app); }\n',
    );
    expect(planUpgrade(root).conflicts.join(" ")).toContain(
      "registerGeneratedRoutes is imported from ./custom",
    );
  });

  test("rejects non-callable registry exports and synchronous integration functions", () => {
    const root = legacyProject();
    writeFileSync(
      join(root, "src", "routes", "launchstack.generated.ts"),
      "export const registerGeneratedRoutes = 42;\n",
    );
    expect(planUpgrade(root).conflicts.join(" ")).toContain(
      "does not export registerGeneratedRoutes",
    );

    const secondRoot = legacyProject();
    writeFileSync(
      join(secondRoot, "src", "app.ts"),
      'import { registerPlugins } from "./plugins";\nexport function buildApp() { registerPlugins(app); }\n',
    );
    expect(planUpgrade(secondRoot).conflicts.join(" ")).toContain(
      "buildApp must be async",
    );
  });

  test("does not infer template schema from a legacy package version", () => {
    const root = mkdtempSync(
      join(tmpdir(), "launchstack-upgrade-legacy-package-"),
    );
    roots.push(root);
    mkdirSync(join(root, "src", "routes"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "legacy-api", version: "2.1.3" }),
    );
    writeFileSync(
      join(root, "src", "routes", "index.ts"),
      "export async function registerRoutes(app: any) { await app.register(readinessRoutes); }\n",
    );
    writeFileSync(
      join(root, "src", "app.ts"),
      "export async function buildApp() { await registerPlugins(app); }\n",
    );

    expect(planUpgrade(root).fromVersion).toBe("2.0.0");
    expect(planUpgrade(root).toVersion).toBe("3.0.0");
  });

  test("refuses unregistered template edges without skipping versions", () => {
    const root = legacyProject("2.1.0");
    const plan = planUpgrade(root);
    expect(plan.conflicts.join(" ")).toMatch(/no ordered migration/i);
    expect(plan.diffs).toEqual([]);
  });

  test("orders multi-edge migration chains by dependencies and rejects mismatched state versions", () => {
    const condition = (
      target: "manifest" | "state",
      version: "from" | "to",
    ) => ({
      target,
      version,
    });
    const migrations: TemplateMigration[] = [
      {
        id: "v2-to-v3",
        from: "2.0.0",
        to: "3.0.0",
        dependsOn: ["v1-to-v2"],
        preconditions: [
          condition("manifest", "from"),
          condition("state", "from"),
        ],
        postconditions: [condition("manifest", "to"), condition("state", "to")],
      },
      {
        id: "v1-to-v2",
        from: "1.0.0",
        to: "2.0.0",
        dependsOn: [],
        preconditions: [
          condition("manifest", "from"),
          condition("state", "from"),
        ],
        postconditions: [condition("manifest", "to"), condition("state", "to")],
      },
    ];

    expect(
      resolveMigrationChain("1.0.0", "3.0.0", migrations).map(
        (migration) => migration.id,
      ),
    ).toEqual(["v1-to-v2", "v2-to-v3"]);
    expect(() =>
      resolveMigrationChain("1.0.0", "3.0.0", [migrations[0]!]),
    ).toThrow(/unknown migration dependency/i);

    const root = legacyProject();
    writeFileSync(
      join(root, ".launchstack", "state.json"),
      serializeProjectState(emptyProjectState("1.9.0", "2.1.3")),
    );
    const plan = planUpgrade(root);
    expect(plan.conflicts.join(" ")).toMatch(
      /state template version must be 2\.0\.0/i,
    );
    expect(plan.diffs).toEqual([]);
    expect(plan.mutations).toEqual([]);
  });

  test("reports missing structural anchors as precise conflicts", () => {
    const root = legacyProject();
    writeFileSync(join(root, "src", "app.ts"), "export const app = {};\n");
    const plan = planUpgrade(root);
    expect(plan.conflicts.join(" ")).toContain(
      "buildApp function was not found",
    );
  });

  test("does not replace a user-owned registry that lacks the expected export", () => {
    const root = legacyProject();
    const path = join(root, "src", "routes", "launchstack.generated.ts");
    writeFileSync(path, "export const userOwned = true;\n");
    const plan = planUpgrade(root);

    expect(plan.conflicts.join(" ")).toContain(
      "does not export registerGeneratedRoutes",
    );
    expect(readFileSync(path, "utf8")).toBe("export const userOwned = true;\n");
  });
});
