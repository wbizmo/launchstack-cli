import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readRegularFileNoFollow } from "../src/storage";

const directories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "launchstack-safe-read-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("no-follow bounded file reads", () => {
  it("reads a regular file from one checked descriptor", () => {
    const directory = temporaryDirectory();
    const path = join(directory, "input.json");
    writeFileSync(path, '{"ok":true}');

    expect(readRegularFileNoFollow(path, 64)).toMatchObject({
      content: '{"ok":true}',
      size: 11,
      ino: expect.any(Number),
      dev: expect.any(Number),
    });
  });

  it("rejects a file larger than the configured read limit", () => {
    const directory = temporaryDirectory();
    const path = join(directory, "large.json");
    writeFileSync(path, "12345");

    expect(() => readRegularFileNoFollow(path, 4)).toThrow(/size limit/i);
  });

  it("does not follow a symbolic link", () => {
    if (process.platform === "win32") return;
    const directory = temporaryDirectory();
    const target = join(directory, "target.json");
    const link = join(directory, "link.json");
    writeFileSync(target, "{}\n");
    symlinkSync(target, link);

    expect(() => readRegularFileNoFollow(link, 64)).toThrow(
      /without following links/i,
    );
  });
});
