import { execSync } from "node:child_process";

export type GitMetadata = {
  branch: string;
  commitHash: string;
  commitMessage: string;
  dirty: boolean;
};

function run(command: string): string {
  return execSync(command, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "ignore"]
  }).trim();
}

export function getGitMetadata(): GitMetadata | null {
  try {
    const branch = run("git rev-parse --abbrev-ref HEAD");
    const commitHash = run("git rev-parse HEAD");
    const commitMessage = run("git log -1 --pretty=%B");
    const dirty = run("git status --porcelain").length > 0;

    return {
      branch,
      commitHash,
      commitMessage,
      dirty
    };
  } catch {
    return null;
  }
}