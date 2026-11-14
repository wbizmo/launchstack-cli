import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { copyDirectory } from "../../src/generator/files";

const directories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "launchstack-files-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("copyDirectory", () => {
  it("removes the source alias when a renamed destination already has identical content", () => {
    const root = temporaryDirectory();
    const source = join(root, "source");
    const destination = join(root, "destination");
    mkdirSync(source);
    writeFileSync(join(source, "_gitignore"), "node_modules\n");
    writeFileSync(join(source, ".gitignore"), "node_modules\n");

    copyDirectory(source, destination);

    expect(existsSync(join(destination, ".gitignore"))).toBe(true);
    expect(existsSync(join(destination, "_gitignore"))).toBe(false);
  });

  it("rejects symbolic links in template files", () => {
    if (process.platform === "win32") return;
    const root = temporaryDirectory();
    const source = join(root, "source");
    const destination = join(root, "destination");
    const external = join(root, "external");
    mkdirSync(source);
    writeFileSync(external, "outside template");
    symlinkSync(external, join(source, "_gitignore"));

    expect(() => copyDirectory(source, destination)).toThrow(/symbolic link/i);
  });
});
