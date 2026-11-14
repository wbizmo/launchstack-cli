import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { hashFile, parseProjectState } from "../src/project/state";
import { emptyProjectState } from "../src/project/types";

describe("bounded project file hashing", () => {
  test("streams a large file correctly and closes every descriptor", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-hash-"));
    const path = join(root, "large.bin");
    const content = Buffer.alloc(24 * 1024 * 1024, 0x5a);
    writeFileSync(path, content);
    try {
      const expected = createHash("sha256")
        .update(readFileSync(path))
        .digest("hex");
      const before = existsSync("/proc/self/fd")
        ? readdirSync("/proc/self/fd").length
        : undefined;
      for (let index = 0; index < 20; index += 1)
        expect(hashFile(path)).toBe(expected);
      const after =
        before === undefined ? undefined : readdirSync("/proc/self/fd").length;
      expect(after).toBe(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects linked, noncanonical, and oversized managed file inputs", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-hash-hostile-"));
    const target = join(root, "target.txt");
    const linked = join(root, "linked.txt");
    const oversized = join(root, "oversized.bin");
    writeFileSync(target, "safe\n");
    writeFileSync(oversized, "");
    if (process.platform !== "win32") {
      symlinkSync(target, linked);
      expect(() => hashFile(linked)).toThrow(/symbolic-link/i);
    }
    truncateSync(oversized, 256 * 1024 * 1024 + 1);
    expect(() => hashFile(oversized)).toThrow(/256 MiB/i);

    const state = emptyProjectState("3.0.0", "3.0.4");
    state.managedFiles["../../outside.txt"] = {
      owner: "test",
      version: "1.0.0",
      sha256: "0".repeat(64),
    };
    expect(() => parseProjectState(state)).toThrow(/Unsafe managed path/i);
    rmSync(root, { recursive: true, force: true });
  });
});
