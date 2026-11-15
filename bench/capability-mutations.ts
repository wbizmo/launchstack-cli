import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
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

function sourceSha256(): string {
  const hash = createHash("sha256");
  for (const path of ["src/extensions/engine.ts", "src/project/transaction.ts"])
    hash.update(readFileSync(join(repository, path)));
  hash.update(readFileSync(__filename));
  return hash.digest("hex");
}

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
      let elapsed = 0;
      try {
        const plan = engineModule.planExtensionInstall({
          projectDirectory: project,
          requested,
          registry,
        });
        engineModule.applyExtensionInstall(plan);
        elapsed = performance.now() - started;
        for (const id of requested) {
          const path = join(project, `src/generated/${id}.ts`);
          const expectedContent = registry[id]?.files?.[0]?.content;
          if (
            !existsSync(path) ||
            readFileSync(path, "utf8") !== expectedContent
          )
            throw new Error(`Content check failed for ${path}.`);
        }
        samples.push(elapsed);
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
      latency_samples_ms: samples.map((sample) => Number(sample.toFixed(3))),
      content_checks: "passed",
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
        source_sha256: sourceSha256(),
        source_identity_files: [
          "src/extensions/engine.ts",
          "src/project/transaction.ts",
          "bench/capability-mutations.ts",
        ],
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
