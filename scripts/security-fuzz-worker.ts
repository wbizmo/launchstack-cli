import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { loadProjectManifest } from "../src/project/manifest";
import { normalizeManagedPath, resolveProjectPath } from "../src/project/paths";
import { recoverInterruptedMutation } from "../src/project/transaction";
import { readRegularFileNoFollow } from "../src/storage";
import { parseOpenApiDocument } from "../src/client/openapi";
import { loadOpenApiSource } from "../src/client/generate";
import { parsePluginManifest } from "../src/extensions/plugins";

async function run(): Promise<void> {
  const seed = 0x31f02204;
  let randomState = seed;
  function random(): number {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return randomState >>> 0;
  }

  const root = mkdtempSync(join(tmpdir(), "launchstack-security-fuzz-"));
  const project = join(root, "project");
  const metadata = join(project, ".launchstack");
  const outside = join(root, "outside.txt");
  mkdirSync(metadata, { recursive: true });
  writeFileSync(outside, "outside sentinel\n");
  const counts = {
    pathTraversal: 0,
    malformedJournals: 0,
    malformedManifests: 0,
    symlinkAttempts: 0,
    oversizedInputs: 0,
    cyclicSchemas: 0,
    pluginContent: 0,
    encodedPaths: 0,
    hostileOpenApi: 0,
  };
  let peakRss = process.memoryUsage().rss;
  const sampleMemory = () => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  };

  function expectThrow(
    run: () => unknown,
    category: keyof typeof counts,
  ): void {
    let rejected = false;
    try {
      run();
    } catch {
      rejected = true;
    }
    if (!rejected)
      throw new Error(`Fuzz input was unexpectedly accepted: ${category}`);
    counts[category] += 1;
    sampleMemory();
  }

  try {
    const maliciousPaths = [
      "../outside.txt",
      "../../outside.txt",
      "/tmp/outside.txt",
      "C:\\outside.txt",
      "..\\outside.txt",
      "safe/../../outside.txt",
      "safe/./outside.txt",
      "safe//../outside.txt",
      "safe\u0000/outside.txt",
    ];
    for (let index = 0; index < 512; index += 1) {
      const path =
        maliciousPaths[random() % maliciousPaths.length]! +
        (index % 2 ? `-${random().toString(16)}` : "");
      expectThrow(() => normalizeManagedPath(path), "pathTraversal");
      try {
        resolveProjectPath(project, path);
        throw new Error(`Traversal resolved inside the project: ${path}`);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("Traversal resolved")
        )
          throw error;
      }
    }

    for (const encodedPath of [
      "%2e%2e/outside.txt",
      "safe/%2e%2e/outside.txt",
      "safe%2f..%2foutside.txt",
      "safe／..／outside.txt",
    ]) {
      const resolved = resolveProjectPath(project, encodedPath);
      const fromRoot = relative(resolve(project), resolve(resolved));
      if (
        fromRoot === ".." ||
        fromRoot.startsWith(`..${sep}`) ||
        fromRoot === "" ||
        fromRoot.startsWith(sep)
      )
        throw new Error(`Encoded path escaped the project: ${encodedPath}`);
      counts.encodedPaths += 1;
    }

    for (let index = 0; index < 128; index += 1) {
      expectThrow(
        () =>
          parsePluginManifest({
            schemaVersion: 1,
            id: `@vendor/plugin-${index}`,
            version: "1.0.0",
            kind: "plugin",
            displayName: "hostile",
            supportedLaunchStack: ">=2 <4",
            hooks: [{ name: "postinstall", command: `node ${random()}` }],
            [index % 2 ? "unexpected" : "__proto__"]: "payload",
          }),
        "pluginContent",
      );
    }

    for (let index = 0; index < 256; index += 1) {
      const journal = {
        version: index % 2 ? 99 : 1,
        id: "00000000-0000-4000-8000-000000000031",
        state: "prepared",
        mutations: [
          {
            type: "delete",
            path: `../outside-${index}.txt`,
            hadOriginal: true,
          },
        ],
      };
      writeFileSync(
        join(metadata, "mutation-journal.json"),
        JSON.stringify(journal),
      );
      expectThrow(
        () => recoverInterruptedMutation(project),
        "malformedJournals",
      );
      rmSync(join(metadata, "mutation-journal.json"), { force: true });
    }

    for (let index = 0; index < 256; index += 1) {
      const invalidManifest = [
        "null",
        "[]",
        "{}",
        JSON.stringify({ project: { name: `../outside-${index}` } }),
        JSON.stringify({ project: { name: "safe", templateVersion: 3 } }),
      ][random() % 5]!;
      writeFileSync(join(project, "launchstack.json"), invalidManifest);
      expectThrow(() => loadProjectManifest(project), "malformedManifests");
    }

    if (process.platform !== "win32") {
      const link = join(project, "link");
      for (let index = 0; index < 128; index += 1) {
        if (existsSync(link)) rmSync(link, { force: true });
        symlinkSync(root, link, "dir");
        expectThrow(
          () => resolveProjectPath(project, `link/outside.txt`),
          "symlinkAttempts",
        );
      }
    }

    const oversizedPath = join(root, "oversized.json");
    writeFileSync(oversizedPath, Buffer.alloc(1_048_577, 0x20));
    expectThrow(
      () => readRegularFileNoFollow(oversizedPath, 1_048_576),
      "oversizedInputs",
    );
    expectThrow(
      () =>
        parseOpenApiDocument({
          openapi: "3.1.0",
          paths: {},
          description: "x".repeat(1_048_577),
        }),
      "oversizedInputs",
    );

    const cyclic = { openapi: "3.1.0", paths: {} as Record<string, unknown> };
    cyclic.paths.self = cyclic;
    expectThrow(() => parseOpenApiDocument(cyclic), "cyclicSchemas");

    for (const url of [
      "http://example.com/schema.json",
      "https://127.0.0.1/schema.json",
      "https://[::1]/schema.json",
    ]) {
      let rejected = false;
      try {
        await loadOpenApiSource(url);
      } catch {
        rejected = true;
      }
      if (!rejected)
        throw new Error(`Hostile OpenAPI URL was accepted: ${url}`);
      counts.hostileOpenApi += 1;
      sampleMemory();
    }

    if (readFileSync(outside, "utf8") !== "outside sentinel\n")
      throw new Error("A fuzz case modified the outside-project sentinel.");
    const escaped = relative(resolve(project), resolve(outside));
    if (escaped === "" || (!escaped.startsWith(`..${sep}`) && escaped !== ".."))
      throw new Error("Outside sentinel unexpectedly resolved inside project.");

    console.log(
      JSON.stringify({
        result: "passed",
        seed: `0x${seed.toString(16)}`,
        counts,
        totalCases: Object.values(counts).reduce(
          (sum, count) => sum + count,
          0,
        ),
        runtime: process.version,
        platform: process.platform,
        limits: { heapMiB: 128, timeoutMs: 15_000 },
        peakRssMiB: Number((peakRss / (1024 * 1024)).toFixed(1)),
        outsideSentinelPreserved: true,
      }),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
