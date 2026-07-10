import { execFileSync } from "node:child_process";

export function installDependencies(projectDirectory: string): void {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

  execFileSync(npmExecutable, ["install"], {
    cwd: projectDirectory,
    stdio: "inherit"
  });
}
