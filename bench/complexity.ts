import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { topologicalServices, type DevService } from "../src/dev/orchestrator";
import { resolveExtensionOrder } from "../src/extensions/engine";
import type { ExtensionManifest } from "../src/extensions/types";
import { hashFile } from "../src/project/state";

function percentile(values: number[], proportion: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return Number(
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * proportion) - 1)
    ]?.toFixed(3) ?? 0,
  );
}
function measure<T>(run: () => T, valid: (result: T) => boolean): number[] {
  const samples: number[] = [];
  const warmup = run();
  if (!valid(warmup))
    throw new Error("Benchmark warmup failed its integrity check.");
  for (let index = 0; index < 5; index += 1) {
    const start = performance.now();
    const result = run();
    samples.push(performance.now() - start);
    if (!valid(result))
      throw new Error("Benchmark sample failed its integrity check.");
  }
  return samples;
}
function readWholeFileNoFollow(path: string): Buffer {
  const descriptor = openSync(
    path,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    if (!fstatSync(descriptor).isFile())
      throw new Error("Benchmark input must be a regular file.");
    return readFileSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}
function syntheticServices(size: number): DevService[] {
  const root: DevService = {
    id: "root",
    kind: "process",
    dependencies: [],
    command: "x",
    args: [],
    required: true,
  };
  return [
    root,
    ...Array.from({ length: size }, (_, index) => ({
      id: `service-${String(index).padStart(5, "0")}`,
      kind: "process" as const,
      dependencies: ["root"],
      command: "x",
      args: [],
      required: true,
    })),
  ];
}
function baselineServices(services: DevService[]): DevService[] {
  const byId = new Map(services.map((item) => [item.id, item]));
  const indegree = new Map(
    services.map((item) => [item.id, item.dependencies.length]),
  );
  const dependents = new Map<string, string[]>();
  for (const item of services)
    for (const dependency of item.dependencies) {
      const values = dependents.get(dependency) ?? [];
      values.push(item.id);
      dependents.set(dependency, values);
    }
  const queue = services
    .filter((item) => indegree.get(item.id) === 0)
    .sort((a, b) => a.id.localeCompare(b.id));
  const result: DevService[] = [];
  while (queue.length) {
    const item = queue.shift()!;
    result.push(item);
    for (const id of (dependents.get(item.id) ?? []).sort()) {
      const degree = indegree.get(id)! - 1;
      indegree.set(id, degree);
      if (!degree) {
        queue.push(byId.get(id)!);
        queue.sort((a, b) => a.id.localeCompare(b.id));
      }
    }
  }
  return result;
}
function syntheticExtensions(size: number): {
  requested: string[];
  registry: Record<string, ExtensionManifest>;
} {
  const registry: Record<string, ExtensionManifest> = {};
  const requested: string[] = [];
  for (let index = 0; index < size; index += 1) {
    const id = `extension-${String(index).padStart(5, "0")}`;
    requested.push(id);
    registry[id] = {
      schemaVersion: 1,
      id,
      version: "1.0.0",
      kind: "plugin",
      displayName: id,
      supportedLaunchStack: ">=3 <4",
      dependencies: index ? [requested[index - 1]!] : [],
    };
  }
  return { requested: [requested.at(-1)!], registry };
}
function baselineExtensions(input: {
  requested: string[];
  registry: Record<string, ExtensionManifest>;
}): ExtensionManifest[] {
  const order: ExtensionManifest[] = [];
  const visited = new Set<string>();
  const visit = (id: string, chain: string[]) => {
    if (visited.has(id)) return;
    if (chain.includes(id)) throw new Error("cycle");
    const item = input.registry[id]!;
    for (const dependency of item.dependencies ?? [])
      visit(dependency, [...chain, id]);
    visited.add(id);
    order.push(item);
  };
  for (const id of input.requested) visit(id, []);
  return order;
}

async function main(): Promise<void> {
  const cpuStart = process.cpuUsage();
  const os = await import("node:os");
  const graphs = [1_000, 10_000].map((dependents) => {
    const input = syntheticServices(dependents);
    const candidate = measure(
      () => topologicalServices(input),
      (result) => result.length === input.length && result[0]?.id === "root",
    );
    return {
      vertices: input.length,
      edges: dependents,
      candidate_ms: {
        p50: percentile(candidate, 0.5),
        p95: percentile(candidate, 0.95),
      },
      repetitions: candidate.length,
    };
  });
  const graphBaselineInput = syntheticServices(1_000);
  const graphBefore = measure(
    () => baselineServices(graphBaselineInput),
    (result) =>
      result.length === graphBaselineInput.length && result[0]?.id === "root",
  );
  const graphAfter = measure(
    () => topologicalServices(graphBaselineInput),
    (result) =>
      result.length === graphBaselineInput.length && result[0]?.id === "root",
  );
  const extensionCases = [1_000, 10_000].map((nodes) => {
    const input = syntheticExtensions(nodes);
    const samples = measure(
      () => resolveExtensionOrder(input.requested, input.registry),
      (result) => result.length === nodes,
    );
    return {
      vertices: nodes,
      edges: nodes - 1,
      candidate_ms: {
        p50: percentile(samples, 0.5),
        p95: percentile(samples, 0.95),
      },
      repetitions: samples.length,
    };
  });
  const extensionBaselineInput = syntheticExtensions(1_000);
  const extensionBefore = measure(
    () => baselineExtensions(extensionBaselineInput),
    (result) => result.length === 1_000,
  );
  const extensionAfter = measure(
    () =>
      resolveExtensionOrder(
        extensionBaselineInput.requested,
        extensionBaselineInput.registry,
      ),
    (result) => result.length === 1_000,
  );
  const directory = mkdtempSync(join(tmpdir(), "launchstack-complexity-"));
  const hashCases: Array<Record<string, unknown>> = [];
  const buffer = Buffer.alloc(64 * 1024, 0x41);
  const sizes = [1, 10, 50].map((mib) => mib * 1024 * 1024);
  try {
    for (const bytes of sizes) {
      const path = join(directory, `file-${bytes}.bin`);
      const descriptor = openSync(path, "w");
      try {
        for (let written = 0; written < bytes; written += buffer.length)
          writeSync(
            descriptor,
            buffer,
            0,
            Math.min(buffer.length, bytes - written),
          );
      } finally {
        closeSync(descriptor);
      }
      const expected = createHash("sha256")
        .update(readWholeFileNoFollow(path))
        .digest("hex");
      const before = measure(
        () =>
          createHash("sha256")
            .update(readWholeFileNoFollow(path))
            .digest("hex"),
        (result) => result === expected,
      );
      const after = measure(
        () => hashFile(path),
        (result) => result === expected,
      );
      hashCases.push({
        bytes,
        repetitions: after.length,
        previous_read_all_ms: {
          p50: percentile(before, 0.5),
          p95: percentile(before, 0.95),
        },
        streaming_ms: {
          p50: percentile(after, 0.5),
          p95: percentile(after, 0.95),
        },
      });
    }
    const fdBefore = readdirSync("/proc/self/fd").length;
    for (const bytes of sizes) hashFile(join(directory, `file-${bytes}.bin`));
    const fdAfter = readdirSync("/proc/self/fd").length;
    const largestFile = join(directory, `file-${sizes.at(-1)}.bin`);
    const worker = (mode: "read-all" | "stream") =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [
            "--import",
            "tsx",
            join(process.cwd(), "bench/hash-worker.ts"),
            mode,
            largestFile,
          ],
          { encoding: "utf8" },
        ),
      ) as { digest: string; max_rss_bytes: number };
    const readAllWorker = worker("read-all");
    const streamWorker = worker("stream");
    if (readAllWorker.digest !== streamWorker.digest)
      throw new Error("Isolated hash workers produced different digests.");
    process.stdout.write(
      `${JSON.stringify({ node: process.version, platform: `${process.platform} ${process.arch}`, os_release: os.release(), cpu_model: os.cpus()[0]?.model, cpu_count: os.availableParallelism(), total_memory_bytes: os.totalmem(), warmups: 1, repetitions: 5, graph_queue: graphs, graph_1k_comparison: { previous_sort_and_shift_ms: { p50: percentile(graphBefore, 0.5), p95: percentile(graphBefore, 0.95) }, min_heap_ms: { p50: percentile(graphAfter, 0.5), p95: percentile(graphAfter, 0.95) } }, extension_chains: extensionCases, extension_1k_comparison: { previous_path_copy_ms: { p50: percentile(extensionBefore, 0.5), p95: percentile(extensionBefore, 0.95) }, mutable_stack_ms: { p50: percentile(extensionAfter, 0.5), p95: percentile(extensionAfter, 0.95) } }, file_hashing: hashCases, isolated_50MiB_hash_peak_rss_bytes: { read_all: readAllWorker.max_rss_bytes, streaming: streamWorker.max_rss_bytes }, fd_count_after_hashes: { before: fdBefore, after: fdAfter }, cpu_microseconds: process.cpuUsage(cpuStart), peak_rss_bytes: process.resourceUsage().maxRSS * 1024, memory_bytes: process.memoryUsage() }, null, 2)}\n`,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
void main();
