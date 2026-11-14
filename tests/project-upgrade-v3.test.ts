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
import { applyUpgrade, planUpgrade } from "../src/project/upgrade";

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
