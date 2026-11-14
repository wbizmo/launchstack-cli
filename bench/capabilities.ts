import { performance } from "node:perf_hooks";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ExtensionManifest } from "../src/extensions/types";

const repository = resolve(process.env.LAUNCHSTACK_BENCH_REPO ?? process.cwd());

function graph(
  nodes: number,
  edgesPerNode: number,
): { requested: string[]; registry: Record<string, ExtensionManifest> } {
  let seed = 34;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  const requested = Array.from(
    { length: nodes },
    (_, index) => `cap-${index.toString().padStart(6, "0")}`,
  );
  const registry: Record<string, ExtensionManifest> = {};
  for (let index = 0; index < nodes; index += 1) {
    const dependencies = new Set<string>();
    if (index > 0) dependencies.add(requested[index - 1]!);
    while (dependencies.size < Math.min(index, edgesPerNode))
      dependencies.add(requested[Math.floor(random() * index)]!);
    registry[requested[index]!] = {
      schemaVersion: 1,
      id: requested[index]!,
      version: "1.0.0",
      kind: "capability",
      displayName: requested[index]!,
      supportedLaunchStack: ">=3 <4",
      dependencies: [...dependencies],
    };
  }
  return { requested, registry };
}

function percentile(values: number[], proportion: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return Number(
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * proportion) - 1)
    ]?.toFixed(3) ?? 0,
  );
}

const workloads = [
  { nodes: 1_000, edgesPerNode: 1 },
  { nodes: 1_000, edgesPerNode: 10 },
  { nodes: 10_000, edgesPerNode: 1 },
  { nodes: 10_000, edgesPerNode: 10 },
];
async function main(): Promise<void> {
  const { resolveExtensionOrder } = await import(
    pathToFileURL(join(repository, "src/extensions/engine.ts")).href
  );
  const results = workloads.map(({ nodes, edgesPerNode }) => {
    const input = graph(nodes, edgesPerNode);
    const expected = Object.keys(input.registry).length;
    const runs: number[] = [];
    resolveExtensionOrder(input.requested, input.registry);
    for (let repetition = 0; repetition < 5; repetition += 1) {
      const start = performance.now();
      const ordered = resolveExtensionOrder(input.requested, input.registry);
      runs.push(performance.now() - start);
      if (ordered.length !== expected)
        throw new Error(
          `Expected ${expected} graph nodes, received ${ordered.length}.`,
        );
    }
    return {
      nodes,
      edges: Object.values(input.registry).reduce(
        (sum, item) => sum + (item.dependencies?.length ?? 0),
        0,
      ),
      edges_per_node_target: edgesPerNode,
      repetitions: runs.length,
      latency_ms: { p50: percentile(runs, 0.5), p95: percentile(runs, 0.95) },
    };
  });
  process.stdout.write(
    `${JSON.stringify({ repository, node: process.version, platform: `${process.platform} ${process.arch}`, seed: 34, warmup: 1, workloads: results, memory_bytes_after: process.memoryUsage().rss, cpu_microseconds: process.cpuUsage().user }, null, 2)}\n`,
  );
}
void main();
