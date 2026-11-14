import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  loadProjectManifest,
  serializeProjectManifest,
} from "../project/manifest";
import { resolveProjectPath } from "../project/paths";
import {
  hashFile,
  loadProjectState,
  serializeProjectState,
} from "../project/state";
import {
  applyFileMutations,
  withTrackedMutations,
} from "../project/transaction";
import type {
  FileMutation,
  ProjectManifest,
  ProjectState,
} from "../project/types";
import { currentLaunchStackVersion } from "../version";
import { parse as parseYaml } from "yaml";
import type { ExtensionManifest, ExtensionPlan } from "./types";

export type PreparedExtensionPlan = ExtensionPlan & {
  projectDirectory: string;
  mutations: FileMutation[];
  nextManifest: ProjectManifest;
  nextState: ProjectState;
};
function compatible(version: string, range: string): boolean {
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);
  if (!Number.isInteger(major)) return false;
  const lower = range.match(/>=\s*(\d+)/)?.[1];
  const upper = range.match(/<\s*(\d+)/)?.[1];
  return (
    !(lower && major < Number(lower)) && !(upper && major >= Number(upper))
  );
}
export function resolveExtensionOrder(
  requested: string[],
  registry: Record<string, ExtensionManifest>,
): ExtensionManifest[] {
  const order: ExtensionManifest[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  for (const root of requested) {
    if (visited.has(root)) continue;
    const rootItem = registry[root];
    if (!rootItem) throw new Error(`Unknown extension: ${root}`);
    const stack: Array<{ id: string; dependencies: string[]; next: number }> = [
      { id: root, dependencies: rootItem.dependencies ?? [], next: 0 },
    ];
    visiting.add(root);
    while (stack.length) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.dependencies.length) {
        const dependency = frame.dependencies[frame.next++]!;
        if (visited.has(dependency)) continue;
        if (visiting.has(dependency)) {
          const start = stack.findIndex((entry) => entry.id === dependency);
          throw new Error(
            `Extension dependency cycle: ${[...stack.slice(start).map((entry) => entry.id), dependency].join(" -> ")}`,
          );
        }
        const item = registry[dependency];
        if (!item) throw new Error(`Unknown extension: ${dependency}`);
        visiting.add(dependency);
        stack.push({
          id: dependency,
          dependencies: item.dependencies ?? [],
          next: 0,
        });
        continue;
      }
      stack.pop();
      visiting.delete(frame.id);
      visited.add(frame.id);
      order.push(registry[frame.id]!);
    }
  }
  return order;
}
function packageMutations(
  projectDirectory: string,
  extensions: ExtensionManifest[],
): FileMutation[] {
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};
  const scripts: Record<string, string> = {};
  for (const item of extensions) {
    Object.assign(deps, item.packages?.dependencies ?? {});
    Object.assign(devDeps, item.packages?.devDependencies ?? {});
    Object.assign(scripts, item.scripts ?? {});
  }
  if (
    !Object.keys(deps).length &&
    !Object.keys(devDeps).length &&
    !Object.keys(scripts).length
  )
    return [];
  const path = resolveProjectPath(projectDirectory, "package.json");
  if (!existsSync(path))
    throw new Error(
      "Cannot install package-backed capability without package.json",
    );
  const existingText = readFileSync(path, "utf8");
  const parsed = JSON.parse(existingText) as Record<string, unknown>;
  const currentDeps = (parsed.dependencies ?? {}) as Record<string, string>;
  const currentDev = (parsed.devDependencies ?? {}) as Record<string, string>;
  const currentScripts = (parsed.scripts ?? {}) as Record<string, string>;
  for (const [name, version] of Object.entries(deps))
    if (currentDeps[name] && currentDeps[name] !== version)
      throw new Error(
        `Dependency ${name} is already declared as ${currentDeps[name]}, which conflicts with capability requirement ${version}.`,
      );
  for (const [name, version] of Object.entries(devDeps))
    if (currentDev[name] && currentDev[name] !== version)
      throw new Error(
        `Development dependency ${name} is already declared as ${currentDev[name]}, which conflicts with capability requirement ${version}.`,
      );
  for (const [name, command] of Object.entries(scripts))
    if (currentScripts[name] && currentScripts[name] !== command)
      throw new Error(
        `npm script ${name} already exists with a different command.`,
      );
  const sort = (value: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
    );
  const nextPackage = `${JSON.stringify({ ...parsed, ...(Object.keys(scripts).length ? { scripts: sort({ ...currentScripts, ...scripts }) } : {}), ...(Object.keys(deps).length ? { dependencies: sort({ ...currentDeps, ...deps }) } : {}), ...(Object.keys(devDeps).length ? { devDependencies: sort({ ...currentDev, ...devDeps }) } : {}) }, null, 2)}\n`;
  const lockPath = resolveProjectPath(projectDirectory, "package-lock.json");
  const temporary = mkdtempSync(join(tmpdir(), "launchstack-lock-"));
  try {
    writeFileSync(join(temporary, "package.json"), nextPackage);
    if (existsSync(lockPath))
      writeFileSync(
        join(temporary, "package-lock.json"),
        readFileSync(lockPath),
      );
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const result = spawnSync(
      npm,
      [
        "install",
        "--package-lock-only",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--no-update-notifier",
      ],
      {
        cwd: temporary,
        env: process.env,
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    if (result.error || result.status !== 0)
      throw new Error(
        `Unable to resolve a matching package-lock.json${result.stderr ? `: ${result.stderr.trim()}` : ""}`,
      );
    const lockContent = readFileSync(
      join(temporary, "package-lock.json"),
      "utf8",
    );
    const mutations: FileMutation[] = [];
    if (nextPackage !== existingText)
      mutations.push({
        type: "write",
        path: "package.json",
        content: nextPackage,
        owner: "launchstack:metadata",
        version: currentLaunchStackVersion(),
        expectedSha256: hashFile(path),
      });
    const existingLock = existsSync(lockPath)
      ? readFileSync(lockPath, "utf8")
      : null;
    if (lockContent !== existingLock)
      mutations.push({
        type: "write",
        path: "package-lock.json",
        content: lockContent,
        owner: "launchstack:metadata",
        version: currentLaunchStackVersion(),
        expectedSha256: existsSync(lockPath) ? hashFile(lockPath) : null,
      });
    return mutations;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
export function composeMutation(
  projectDirectory: string,
  state: ProjectState,
  pending: FileMutation[],
): FileMutation | null {
  const pendingByPath = new Map(
    pending.map((mutation) => [mutation.path, mutation]),
  );
  const fragments = new Map<string, string>();
  for (const [path, managed] of Object.entries(state.managedFiles)) {
    if (
      !path.startsWith(".launchstack/generated/compose/") ||
      !path.endsWith(".json")
    )
      continue;
    const mutation = pendingByPath.get(path);
    if (mutation?.type === "delete") continue;
    if (mutation?.type === "write") fragments.set(path, mutation.content);
    else {
      const absolute = resolveProjectPath(projectDirectory, path);
      if (!existsSync(absolute)) continue;
      if (managed.sha256 !== hashFile(absolute))
        throw new Error(`Compose fragment has local modifications: ${path}`);
      fragments.set(path, readFileSync(absolute, "utf8"));
    }
  }
  for (const mutation of pending)
    if (
      mutation.type === "write" &&
      mutation.path.startsWith(".launchstack/generated/compose/") &&
      mutation.path.endsWith(".json")
    )
      fragments.set(mutation.path, mutation.content);
  const merged: Record<string, Record<string, unknown>> = {
    services: {},
    volumes: {},
    networks: {},
  };
  const baseline: Record<string, Record<string, unknown>> = {
    services: {},
    volumes: {},
    networks: {},
  };
  const basePath = resolveProjectPath(projectDirectory, "docker-compose.yml");
  if (existsSync(basePath)) {
    let base: unknown;
    try {
      base = parseYaml(readFileSync(basePath, "utf8"));
    } catch (error) {
      throw new Error(
        `Cannot parse docker-compose.yml: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!base || typeof base !== "object" || Array.isArray(base))
      throw new Error("docker-compose.yml must contain a top-level mapping.");
    for (const section of ["services", "volumes", "networks"] as const) {
      const values = (base as Record<string, unknown>)[section];
      if (values === undefined) continue;
      if (!values || typeof values !== "object" || Array.isArray(values))
        throw new Error(
          `docker-compose.yml has an invalid ${section} section.`,
        );
      for (const [name, value] of Object.entries(values))
        baseline[section][name] = value as Record<string, unknown>;
    }
  }
  for (const [path, content] of [...fragments].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    let fragment: unknown;
    try {
      fragment = JSON.parse(content);
    } catch {
      throw new Error(`Invalid Compose JSON fragment: ${path}`);
    }
    if (!fragment || typeof fragment !== "object" || Array.isArray(fragment))
      throw new Error(`Compose fragment ${path} must be a mapping.`);
    for (const section of ["services", "volumes", "networks"] as const) {
      const values = (fragment as Record<string, unknown>)[section];
      if (values === undefined) continue;
      if (!values || typeof values !== "object" || Array.isArray(values))
        throw new Error(
          `Compose fragment ${path} has an invalid ${section} section.`,
        );
      for (const [name, value] of Object.entries(values)) {
        if (
          !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/.test(name) ||
          !value ||
          typeof value !== "object" ||
          Array.isArray(value)
        )
          throw new Error(
            `Compose fragment ${path} has an invalid ${section} entry: ${name}`,
          );
        const baselineValue = baseline[section][name];
        if (
          baselineValue &&
          JSON.stringify(baselineValue) !== JSON.stringify(value)
        )
          throw new Error(
            `Compose ${section} name ${name} conflicts with docker-compose.yml (from ${path}).`,
          );
        const previous = merged[section][name];
        if (previous && JSON.stringify(previous) !== JSON.stringify(value))
          throw new Error(
            `Compose ${section} name ${name} has conflicting definitions (from ${path}).`,
          );
        merged[section][name] = value as Record<string, unknown>;
      }
    }
    for (const section of Object.keys(fragment as Record<string, unknown>))
      if (!["services", "volumes", "networks"].includes(section))
        throw new Error(
          `Compose fragment ${path} contains unsupported top-level section ${section}.`,
        );
  }
  for (const [name, rawService] of Object.entries(merged.services)) {
    const service = rawService as Record<string, unknown>;
    if (
      service.healthcheck !== undefined &&
      (!service.healthcheck ||
        typeof service.healthcheck !== "object" ||
        Array.isArray(service.healthcheck))
    )
      throw new Error(`Compose service ${name} has an invalid healthcheck.`);
  }
  const target = "docker-compose.launchstack.yml";
  const absolute = resolveProjectPath(projectDirectory, target);
  const tracked = state.managedFiles[target];
  if (
    existsSync(absolute) &&
    (!tracked ||
      tracked.owner !== "launchstack:compose" ||
      tracked.sha256 !== hashFile(absolute))
  )
    throw new Error(
      `Refusing to overwrite unmanaged or modified Compose file: ${target}`,
    );
  if (!Object.keys(merged.services).length) {
    if (!existsSync(absolute)) return null;
    return {
      type: "delete",
      path: target,
      owner: "launchstack:compose",
      expectedSha256: hashFile(absolute),
    };
  }
  const content = `${JSON.stringify(
    Object.fromEntries(
      Object.entries(merged)
        .filter(([, value]) => Object.keys(value).length)
        .map(([key, value]) => [
          key,
          Object.fromEntries(
            Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
          ),
        ]),
    ),
    null,
    2,
  )}\n`;
  if (existsSync(absolute) && readFileSync(absolute, "utf8") === content)
    return null;
  return {
    type: "write",
    path: target,
    content,
    owner: "launchstack:compose",
    version: currentLaunchStackVersion(),
    expectedSha256: existsSync(absolute) ? hashFile(absolute) : null,
  };
}
function envMutation(
  projectDirectory: string,
  extensions: ExtensionManifest[],
): FileMutation | null {
  const vars = extensions.flatMap((item) => item.environment ?? []);
  if (!vars.length) return null;
  const path = ".env.example";
  const absolute = resolveProjectPath(projectDirectory, path);
  const existing = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
  const known = new Set(
    existing
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
      .filter((value): value is string => Boolean(value)),
  );
  const additions = vars
    .filter((item) => !known.has(item.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => `${item.name}=${item.example ?? ""}`);
  if (!additions.length) return null;
  const prefix =
    existing && !existing.endsWith("\n") ? `${existing}\n` : existing;
  return {
    type: "write",
    path,
    content: `${prefix}${additions.join("\n")}\n`,
    owner: "launchstack:metadata",
    version: currentLaunchStackVersion(),
    expectedSha256: existsSync(absolute) ? hashFile(absolute) : null,
  };
}
function fileMutations(
  projectDirectory: string,
  state: ProjectState,
  extensions: ExtensionManifest[],
): FileMutation[] {
  const output: FileMutation[] = [];
  for (const item of extensions) {
    for (const file of item.files ?? []) {
      const absolute = resolveProjectPath(projectDirectory, file.path);
      const tracked = state.managedFiles[file.path];
      if (tracked && tracked.owner !== item.id)
        throw new Error(`File ${file.path} is owned by ${tracked.owner}`);
      if (existsSync(absolute)) {
        const current = hashFile(absolute);
        if (!tracked)
          throw new Error(
            `Refusing to overwrite user-owned file: ${file.path}`,
          );
        if (tracked.sha256 !== current)
          throw new Error(`Managed file has local modifications: ${file.path}`);
        if (readFileSync(absolute, "utf8") === file.content) continue;
        output.push({
          type: "write",
          path: file.path,
          content: file.content,
          owner: item.id,
          version: item.version,
          expectedSha256: current,
          executable: file.executable,
        });
      } else
        output.push({
          type: "write",
          path: file.path,
          content: file.content,
          owner: item.id,
          version: item.version,
          expectedSha256: null,
          executable: file.executable,
        });
    }
    if (item.composeServices && Object.keys(item.composeServices).length) {
      const path = `.launchstack/generated/compose/${item.id}.json`;
      const absolute = resolveProjectPath(projectDirectory, path);
      const tracked = state.managedFiles[path];
      if (
        existsSync(absolute) &&
        (!tracked ||
          tracked.owner !== item.id ||
          tracked.sha256 !== hashFile(absolute))
      )
        throw new Error(`Compose fragment has local modifications: ${path}`);
      const content = `${JSON.stringify({ services: item.composeServices }, null, 2)}\n`;
      if (!existsSync(absolute) || readFileSync(absolute, "utf8") !== content)
        output.push({
          type: "write",
          path,
          content,
          owner: item.id,
          version: item.version,
          expectedSha256: existsSync(absolute) ? hashFile(absolute) : null,
        });
    }
  }
  return output;
}
function metadataMutations(
  projectDirectory: string,
  manifest: ProjectManifest,
  state: ProjectState,
): FileMutation[] {
  const output: FileMutation[] = [];
  for (const item of [
    { path: "launchstack.json", content: serializeProjectManifest(manifest) },
    { path: ".launchstack/state.json", content: serializeProjectState(state) },
  ]) {
    const absolute = resolveProjectPath(projectDirectory, item.path);
    const existing = existsSync(absolute)
      ? readFileSync(absolute, "utf8")
      : null;
    if (existing === item.content) continue;
    output.push({
      type: "write",
      path: item.path,
      content: item.content,
      owner: "launchstack:metadata",
      version: currentLaunchStackVersion(),
      expectedSha256: existsSync(absolute) ? hashFile(absolute) : null,
    });
  }
  return output;
}
export function planExtensionInstall(input: {
  projectDirectory: string;
  requested: string[];
  registry: Record<string, ExtensionManifest>;
}): PreparedExtensionPlan {
  const projectDirectory = resolve(input.projectDirectory);
  const manifest = loadProjectManifest(projectDirectory);
  const state = loadProjectState(projectDirectory, {
    templateVersion: manifest.project.templateVersion,
    cliVersion: currentLaunchStackVersion(),
  });
  const ordered = resolveExtensionOrder(input.requested, input.registry);
  const selected = new Set(ordered.map((item) => item.id));
  for (const item of ordered) {
    if (
      !compatible(manifest.project.templateVersion, item.supportedLaunchStack)
    )
      throw new Error(
        `${item.id}@${item.version} does not support project ${manifest.project.templateVersion}`,
      );
    for (const conflict of item.conflicts ?? [])
      if (selected.has(conflict) || state.extensions[conflict])
        throw new Error(`${item.id} conflicts with ${conflict}`);
  }
  const mutations = fileMutations(projectDirectory, state, ordered);
  mutations.push(...packageMutations(projectDirectory, ordered));
  const envWrite = envMutation(projectDirectory, ordered);
  if (envWrite) mutations.push(envWrite);
  const composeWrite = composeMutation(projectDirectory, state, mutations);
  if (composeWrite) mutations.push(composeWrite);
  const nextManifest = structuredClone(manifest);
  const nextState = withTrackedMutations(state, mutations);
  const installedAt = new Date().toISOString();
  for (const item of ordered) {
    if (item.kind === "capability")
      nextManifest.capabilities[item.id] = {
        ...(nextManifest.capabilities[item.id] ?? {}),
        version: item.version,
      };
    const current = state.extensions[item.id];
    nextState.extensions[item.id] =
      current?.version === item.version
        ? current
        : {
            id: item.id,
            version: item.version,
            kind: item.kind,
            installedAt,
            source: item.kind === "plugin" ? item.id : undefined,
          };
  }
  nextState.templateVersion = manifest.project.templateVersion;
  nextState.cliVersion = currentLaunchStackVersion();
  if (
    mutations.length ||
    ordered.some((item) => state.extensions[item.id]?.version !== item.version)
  )
    nextState.updatedAt = installedAt;
  const changed = ordered.filter(
    (item) => state.extensions[item.id]?.version !== item.version,
  );
  const actions = [
    ...changed.map((item) => ({
      kind: "metadata" as const,
      target: item.id,
      detail: state.extensions[item.id]
        ? `upgrade ${state.extensions[item.id]?.version} -> ${item.version}`
        : `install ${item.version}`,
    })),
    ...mutations.map((mutation) => ({
      kind:
        mutation.path === "package.json" ||
        mutation.path === "package-lock.json"
          ? ("package" as const)
          : mutation.path === ".env.example"
            ? ("environment" as const)
            : mutation.path.includes("/compose/") ||
                mutation.path === "docker-compose.launchstack.yml"
              ? ("compose" as const)
              : ("file" as const),
      target: mutation.path,
      detail: mutation.type,
    })),
  ];
  return {
    projectDirectory,
    extensionIds: ordered.map((item) => item.id),
    actions,
    warnings: ordered.flatMap((item) =>
      item.hooks?.length
        ? [
            `${item.id} declares executable hooks; declarative installation does not execute them.`,
          ]
        : [],
    ),
    noop: actions.length === 0,
    mutations,
    nextManifest,
    nextState,
  };
}
export function applyExtensionInstall(
  plan: PreparedExtensionPlan,
): ProjectState {
  if (plan.noop) return plan.nextState;
  return applyFileMutations({
    projectDirectory: plan.projectDirectory,
    mutations: [
      ...plan.mutations,
      ...metadataMutations(
        plan.projectDirectory,
        plan.nextManifest,
        plan.nextState,
      ),
    ],
    state: loadProjectState(plan.projectDirectory, {
      templateVersion: plan.nextManifest.project.templateVersion,
      cliVersion: currentLaunchStackVersion(),
    }),
    nextState: plan.nextState,
  });
}
