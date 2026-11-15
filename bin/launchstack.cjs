#!/usr/bin/env node
"use strict";

const { createRequire } = require("node:module");
const { dirname, join } = require("node:path");
const { pathToFileURL } = require("node:url");

const packageRequire = createRequire(__filename);
const packageRoot = dirname(dirname(__filename));
const version = packageRequire(join(packageRoot, "package.json")).version;
const args = process.argv.slice(2);
const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(process.version);
const major = match ? Number(match[1]) : 0;
const minor = match ? Number(match[2]) : 0;
const supported =
  (major === 24 && minor >= 22) || (major === 26 && minor >= 13);
const versionRequest =
  args.length === 1 && (args[0] === "--version" || args[0] === "-V");
const helpRequest =
  args.length === 0 ||
  args[0] === "help" ||
  (args.length === 1 && (args[0] === "--help" || args[0] === "-h"));

if (!supported && versionRequest) {
  console.log(version);
} else if (!supported && helpRequest) {
  console.log(`LaunchStack CLI ${version}

Usage: launchstack <command> [options]

Commands: create, init, validate, add, plugin, plan, apply, reconcile, diff, upgrade, dev, client, generate, audit, deploy, status, doctor, preview, stage, destroy, env, provider, secrets, docker, github, history, rollback

Run the full command help with Node.js 24.22.0+ or 26.13.0+.`);
} else if (!supported) {
  console.error(
    `LaunchStack CLI requires Node.js >=24.22.0 <25 || >=26.13.0 <27. Current runtime: ${process.version}. Install a supported Node.js 24 or 26 release and retry.`,
  );
  process.exitCode = 1;
} else {
  import(pathToFileURL(join(packageRoot, "dist", "cli-main.js")).href).catch(
    (error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    },
  );
}
