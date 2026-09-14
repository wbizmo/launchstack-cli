import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getGitMetadata } from "../src/git";

const directories: string[] = [];

function createRepository(): string {
  const directory = mkdtempSync(join(tmpdir(), "launchstack-git-"));
  directories.push(directory);

  const git = (args: string[]) =>
    execFileSync("git", args, {
      cwd: directory,
      stdio: "ignore"
    });

  git(["init", "-b", "main"]);
  git(["config", "user.name", "LaunchStack Test"]);
  git(["config", "user.email", "test@launchstack.dev"]);
  writeFileSync(join(directory, "README.md"), "hello\n");
  git(["add", "README.md"]);
  git(["commit", "-m", "initial commit"]);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("getGitMetadata", () => {
  it("returns branch, commit and dirty state using repository metadata", () => {
    const directory = createRepository();
    const metadata = getGitMetadata(directory);

    expect(metadata?.branch).toBe("main");
    expect(metadata?.commitHash).toMatch(/^[a-f0-9]{40}$/);
    expect(metadata?.commitMessage).toContain("initial commit");
    expect(metadata?.dirty).toBe(false);

    writeFileSync(join(directory, "dirty.txt"), "dirty\n");
    expect(getGitMetadata(directory)?.dirty).toBe(true);
  });

  it("returns null outside a git repository", () => {
    expect(getGitMetadata(temporaryDirectory())).toBeNull();
  });
});

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "launchstack-no-git-"));
  directories.push(directory);
  return directory;
}
