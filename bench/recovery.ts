import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { recoverInterruptedMutation } from "../src/project/transaction";

const sizes = [100, 1_000, 10_000];
const repetitions = 3;
function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return Number(
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
    ]?.toFixed(3) ?? 0,
  );
}
function oneRun(size: number): { recoveryMs: number; restoredBytes: number } {
  const root = mkdtempSync(join(tmpdir(), `launchstack-recovery-${size}-`));
  try {
    const metadata = join(root, ".launchstack");
    const id = `12345678-1234-4234-8234-${String(size).padStart(12, "0")}`;
    const backupRoot = join(metadata, `.backup-${id}`);
    const stageRoot = join(metadata, `.stage-${id}`);
    mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
    mkdirSync(stageRoot, { recursive: true, mode: 0o700 });
    const mutations: Array<{ type: "write"; path: string; hadOriginal: true }> =
      [];
    let restoredBytes = 0;
    for (let index = 0; index < size; index += 1) {
      const relative = `managed/${String(Math.floor(index / 1000)).padStart(4, "0")}/file-${String(index).padStart(7, "0")}.txt`;
      const target = join(root, relative);
      const backup = join(backupRoot, relative);
      mkdirSync(
        join(
          root,
          "managed",
          String(Math.floor(index / 1000)).padStart(4, "0"),
        ),
        { recursive: true },
      );
      mkdirSync(
        join(
          backupRoot,
          "managed",
          String(Math.floor(index / 1000)).padStart(4, "0"),
        ),
        { recursive: true },
      );
      const oldValue = `old-${index}\n`;
      writeFileSync(target, `new-${index}\n`);
      writeFileSync(backup, oldValue);
      restoredBytes += Buffer.byteLength(oldValue);
      mutations.push({ type: "write", path: relative, hadOriginal: true });
    }
    writeFileSync(
      join(metadata, "mutation-journal.json"),
      JSON.stringify({ version: 1, id, state: "committing", mutations }),
    );
    const started = performance.now();
    if (!recoverInterruptedMutation(root))
      throw new Error("Expected interrupted transaction recovery.");
    const recoveryMs = performance.now() - started;
    for (let index = 0; index < size; index += 1) {
      const relative = `managed/${String(Math.floor(index / 1000)).padStart(4, "0")}/file-${String(index).padStart(7, "0")}.txt`;
      if (readFileSync(join(root, relative), "utf8") !== `old-${index}\n`)
        throw new Error(`Rollback integrity check failed for ${relative}.`);
    }
    return { recoveryMs, restoredBytes };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const measurements = sizes.map((files) => {
  const samples = Array.from({ length: repetitions }, () => oneRun(files));
  return {
    files,
    logical_bytes_restored: samples[0]?.restoredBytes ?? 0,
    repetitions,
    recovery_ms: {
      p50: percentile(
        samples.map((item) => item.recoveryMs),
        0.5,
      ),
      p95: percentile(
        samples.map((item) => item.recoveryMs),
        0.95,
      ),
    },
    errors: 0,
  };
});
process.stdout.write(
  `${JSON.stringify({ measured_at: new Date().toISOString(), implementation_commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), node: process.version, platform: `${process.platform} ${process.arch}`, fixture: "simulated committing journal with moved originals and replacement targets; recovery restores all originals and checks content", warmups: 0, measurements, peak_rss_bytes: process.resourceUsage().maxRSS * 1024, cpu_microseconds: process.cpuUsage().user }, null, 2)}\n`,
);
