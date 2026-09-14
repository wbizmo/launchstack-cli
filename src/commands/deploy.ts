import { execSync } from "node:child_process";
import { Command } from "commander";
import { readConfig } from "../config";
import { resolveVerifiedOutputDirectory } from "../deployment";
import { getGitMetadata } from "../git";
import { addDeploymentRecord } from "../history";
import { PROVIDERS } from "../providers";
import { createOrUpdateStage } from "../stages/manager";

export const deployCommand = new Command("deploy").description("Build/prepare deployment artifacts or deploy a manifest-declared stage").option("--skip-build").option("--stage <stage>").option("--production").option("--json").action((options: { skipBuild?: boolean; stage?: string; production?: boolean; json?: boolean }) => {
  const createdAt = new Date().toISOString();
  try {
    if (options.stage) { if (!options.skipBuild) execSync("npm run build", { stdio: "inherit", cwd: process.cwd() }); const stage = createOrUpdateStage({ projectDirectory: process.cwd(), stage: options.stage, production: options.production }); if (options.json) console.log(JSON.stringify(stage, null, 2)); else { console.log(`Stage ${stage.name}: ${stage.status}`); console.log(`Provider: ${stage.provider}`); console.log(`Resource: ${stage.resourceId}`); if (stage.url) console.log(`URL: ${stage.url}`); } return; }
    if (options.production) throw new Error("--production is only valid with --stage.");
    const config = readConfig(); const git = getGitMetadata(); const provider = PROVIDERS[config.provider]; console.log("LaunchStack deployment preparation"); console.log(`App: ${config.appName}`); console.log(`Environment: ${config.environment}`); console.log(`Provider: ${provider.label}`); if (git) { console.log(`Branch: ${git.branch}`); console.log(`Commit: ${git.commitHash.slice(0, 7)}`); if (git.dirty) console.log("Working tree has uncommitted changes"); }
    if (!options.skipBuild) execSync(config.buildCommand, { stdio: "inherit", cwd: process.cwd() }); resolveVerifiedOutputDirectory(process.cwd(), config.outputDirectory); addDeploymentRecord({ id: `dep_${Date.now()}`, appName: config.appName, environment: config.environment, provider: config.provider, deployTarget: config.deployTarget, outputDirectory: config.outputDirectory, status: "prepared", createdAt, git }); console.log(`Deploy target: ${config.deployTarget}`); console.log(provider.remoteDeploymentSupported ? "Deployment provider confirmed the remote deployment." : "Artifacts are prepared. LaunchStack has not performed or confirmed a remote deployment for this provider.");
  } catch (error) { console.log("Deployment preparation failed"); console.log(error instanceof Error ? error.message : error); process.exitCode = 1; }
});
