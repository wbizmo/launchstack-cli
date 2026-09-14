import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveVerifiedOutputDirectory } from "../src/deployment";

const directories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "launchstack-deploy-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("deployment output validation", () => {
  it("accepts an existing build directory inside the project", () => {
    const project = temporaryDirectory();
    mkdirSync(join(project, "dist"));

    expect(resolveVerifiedOutputDirectory(project, "dist"))
      .toBe(join(project, "dist"));
  });

  it("rejects files and paths outside the project", () => {
    const project = temporaryDirectory();
    writeFileSync(join(project, "dist"), "not a directory");

    expect(() => resolveVerifiedOutputDirectory(project, "dist"))
      .toThrow("not a directory");
    expect(() => resolveVerifiedOutputDirectory(project, "../outside"))
      .toThrow("must stay inside");
  });
});
