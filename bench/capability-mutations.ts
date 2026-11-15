import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import type { ExtensionManifest } from "../src/extensions/types";

const repository = resolve(process.env.LAUNCHSTACK_BENCH_REPO ?? process.cwd());
const workloads = [1, 10, 100];
const repetitions = 3;

function percentile(values: number[], proportion: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return Number(
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * proportion) - 1)
    ]?.toFixed(3) ?? 0,
  );
}

async function main(): Promise<void> {
  const [manifestModule, stateModule, typesModule, engineModule] =
    await Promise.all([
      import(pathToFileURL(join(repository, "src/project/manifest.ts")).href),
      import(pathToFileURL(join(repository, "src/project/state.ts")).href),
      import(pathToFileURL(join(repository, "src/project/types.ts")).href),
      import(pathToFileURL(join(repository, "src/extensions/engine.ts")).href),
    ]);
  const results = workloads.map((count) => {
    const samples: number[] = [];
    for (let sample = 0; sample < repetitions; sample += 1) {
      const project = mkdtempSync(
        join(tmpdir(), "launchstack-capability-bench-"),
      );
      mkdirSync(join(project, ".launchstack"), { recursive: true });
      writeFileSync(
        join(project, "launchstack.json"),
        manifestModule.serializeProjectManifest(
          manifestModule.createProjectManifest({
            name: "capability-bench",
            templateVersion: "3.0.0",
          }),
        ),
      );
      writeFileSync(
        join(project, ".launchstack", "state.json"),
        stateModule.serializeProjectState(
          typesModule.emptyProjectState("3.0.0", "3.0.6"),
        ),
      );
      const registry: Record<string, ExtensionManifest> = {};
      const requested = Array.from({ length: count }, (_, index) => {
        const id = `bench-${String(index).padStart(3, "0")}`;
        registry[id] = {
          schemaVersion: 1,
          id,
          version: "1.0.0",
          kind: "capability",
          displayName: id,
          supportedLaunchStack: ">=3 <4",
          files: [
            {
              path: `src/generated/${id}.ts`,
              content: `export const capability = ${JSON.stringify(id)};\n`,
            },
          ],
        };
        return id;
      });
      const started = performance.now();
      try {
        const plan = engineModule.planExtensionInstall({
          projectDirectory: project,
          requested,
          registry,
        });
        engineModule.applyExtensionInstall(plan);
        if (
          requested.some(
            (id) => !existsSync(join(project, `src/generated/${id}.ts`)),
          )
        )
          throw new Error(`Not all ${count} capability files were committed.`);
        samples.push(performance.now() - started);
      } finally {
        rmSync(project, { recursive: true, force: true });
      }
    }
    return {
      capabilities: count,
      files: count,
      repetitions,
      latency_ms: {
        p50: percentile(samples, 0.5),
        p95: percentile(samples, 0.95),
      },
    };
  });
  const packageJson = JSON.parse(
    await (
      await import("node:fs/promises")
    ).readFile(join(repository, "package.json"), "utf8"),
  ) as { version: string };
  process.stdout.write(
    `${JSON.stringify(
      {
        version: packageJson.version,
        repository,
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        isolation:
          "fresh project per repetition; includes planning, CAS metadata, staging and commit",
        results,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
