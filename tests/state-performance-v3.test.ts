import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { hashFile } from "../src/project/state";

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
});
