import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const root = resolve(process.env.LAUNCHSTACK_BENCH_REPO ?? process.cwd());
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const env = { ...process.env, NPM_CONFIG_CACHE: "/workspace/.npm-cache" };
const repetitions = Number(process.env.LAUNCHSTACK_BENCH_REPETITIONS ?? 5);
function run(command: string, args: string[], cwd = root): string {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `${command} ${args.join(" ")} failed with exit ${result.status ?? "unknown"}.`,
    );
  return result.stdout;
}
function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return Number(
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
    ]?.toFixed(3) ?? 0,
  );
}
function summary(samples: number[]) {
  return {
    repetitions: samples.length,
    p50_ms: percentile(samples, 0.5),
    p95_ms: percentile(samples, 0.95),
  };
}
function walk(directory: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      const nested = walk(path);
      files += nested.files;
      bytes += nested.bytes;
    } else {
      files += 1;
      bytes += stats.size;
    }
  }
  return { files, bytes };
}
async function main(): Promise<void> {
  const [{ copyDirectory }, { renderDirectory }] = await Promise.all([
    import(pathToFileURL(join(root, "src/generator/files.ts")).href),
    import(pathToFileURL(join(root, "src/generator/template.ts")).href),
  ]);
  const temp = mkdtempSync(join(tmpdir(), "launchstack-cli-bench-"));
  try {
    run(npm, ["pack", "--silent", "--pack-destination", temp]);
    const packageMetadata = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as { name: string; version: string };
    const tarball = join(
      temp,
      `${packageMetadata.name}-${packageMetadata.version}.tgz`,
    );
    run(npm, ["init", "-y"], temp);
    const installStarted = performance.now();
    run(
      npm,
      [
        "install",
        "--offline",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        tarball,
      ],
      temp,
    );
    const installMs = performance.now() - installStarted;
    const cli = join(temp, "node_modules", "launchstack-cli", "dist", "cli.js");
    let firstStartupMs = 0;
    const warmSamples: number[] = [];
    for (let index = 0; index < repetitions + 1; index += 1) {
      const started = performance.now();
      run(process.execPath, [cli, "--version"], temp);
      const elapsed = performance.now() - started;
      if (index === 0) firstStartupMs = elapsed;
      else warmSamples.push(elapsed);
    }
    const template = join(
      temp,
      "node_modules",
      "launchstack-cli",
      "dist",
      "templates",
      "api",
    );
    const templateSize = walk(template);
    const stagingSamples: number[] = [];
    const renderSamples: number[] = [];
    for (let index = 0; index < repetitions; index += 1) {
      const destination = join(temp, `stage-${index}`);
      const started = performance.now();
      copyDirectory(template, destination, false);
      stagingSamples.push(performance.now() - started);
      const renderStarted = performance.now();
      renderDirectory(destination, {
        PROJECT_NAME: `bench-${index}`,
        PROJECT_DISPLAY_NAME: `Bench ${index}`,
      });
      renderSamples.push(performance.now() - renderStarted);
    }
    const projectSamples: number[] = [];
    for (let index = 0; index < repetitions; index += 1) {
      const project = join(temp, `bench-${index}`);
      const started = performance.now();
      run(
        process.execPath,
        [cli, "create", `bench-${index}`, "--directory", temp, "--no-install"],
        temp,
      );
      projectSamples.push(performance.now() - started);
    }
    process.stdout.write(
      `${JSON.stringify({ measured_at: new Date().toISOString(), implementation_commit: run("git", ["rev-parse", "HEAD"]).trim(), package_version: packageMetadata.version, node: process.version, npm: run(npm, ["--version"]).trim(), platform: `${process.platform} ${process.arch}`, workload: { warmup: 1, repetitions, generated_template_files: templateSize.files, generated_template_bytes: templateSize.bytes, package_install: "local packed tarball with npm --offline; dependency downloads excluded", cli_startup: "fresh Node process per --version invocation; first means first invocation after package install, subsequent invocations are fresh processes with warm filesystem cache, not cleared OS page cache", project_generation: "packed CLI create --no-install, isolated destination per repetition" }, timings: { packed_cli_offline_install_ms: Number(installMs.toFixed(3)), first_cli_startup_ms: Number(firstStartupMs.toFixed(3)), subsequent_cli_startup: summary(warmSamples), template_staging: summary(stagingSamples), template_rendering: summary(renderSamples), project_generation: summary(projectSamples) }, network_dependency_downloads: "excluded from packed CLI install with npm --offline; generated API npm ci measured separately by bench:api", correctness: { cli_version: run(process.execPath, [cli, "--version"], temp).trim(), generated_projects: projectSamples.length, errors: 0 }, process_peak_rss_bytes: process.resourceUsage().maxRSS * 1024 }, null, 2)}\n`,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
void main();
