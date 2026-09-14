import { execFileSync } from "node:child_process";

export type GitMetadata = {
  branch: string;
  commitHash: string;
  commitMessage: string;
  dirty: boolean;
};

function run(
  args: string[],
  cwd: string
): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

export function getGitMetadata(
  cwd = process.cwd()
): GitMetadata | null {
  try {
    const status = run(
      ["status", "--porcelain=v2", "--branch"],
      cwd
    );
    const lines = status.split("\n").filter(Boolean);
    const branch = lines
      .find((line) => line.startsWith("# branch.head "))
      ?.slice("# branch.head ".length);
    const commitHash = lines
      .find((line) => line.startsWith("# branch.oid "))
      ?.slice("# branch.oid ".length);

    if (!commitHash || commitHash === "(initial)") {
      return null;
    }

    const commitMessage = run(
      ["log", "-1", "--pretty=%B"],
      cwd
    );

    return {
      branch:
        !branch || branch === "(detached)"
          ? "HEAD"
          : branch,
      commitHash,
      commitMessage,
      dirty: lines.some((line) => !line.startsWith("# "))
    };
  } catch {
    return null;
  }
}
