#!/usr/bin/env node
import { currentLaunchStackVersion } from "./version";
import {
  isRuntimeHelpRequest,
  isRuntimeVersionRequest,
  unsupportedRuntimeMessage,
} from "./runtime-policy";

const args = process.argv.slice(2);
const runtimeMessage = unsupportedRuntimeMessage(process.version, args);

if (runtimeMessage) {
  if (isRuntimeVersionRequest(args)) {
    console.log(currentLaunchStackVersion());
  } else if (isRuntimeHelpRequest(args)) {
    console.log(`LaunchStack CLI ${currentLaunchStackVersion()}

Usage: launchstack <command> [options]

Commands: create, init, validate, add, plugin, plan, apply, reconcile, diff, upgrade, dev, client, generate, audit, deploy, status, doctor, preview, stage, destroy, env, provider, secrets, docker, github, history, rollback

Run the full command help with Node.js 24.22.0+ or 26.13.0+.`);
  } else {
    console.error(runtimeMessage);
    process.exitCode = 1;
  }
} else {
  void import("./cli-main").catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
