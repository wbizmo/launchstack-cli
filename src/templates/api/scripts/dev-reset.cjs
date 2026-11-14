const { spawnSync } = require("node:child_process");
const { URL } = require("node:url");

const databaseUrl = process.env.DATABASE_URL;
if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset a production environment.");
if (process.env.LAUNCHSTACK_CONFIRM_DB_RESET !== "1") throw new Error("Set LAUNCHSTACK_CONFIRM_DB_RESET=1 to confirm destructive local database reset.");
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const database = new URL(databaseUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(database.hostname.toLowerCase())) throw new Error("Refusing to reset a non-loopback database.");
if (/(^|[_-])prod(uction)?($|[_-])/i.test(database.pathname)) throw new Error("Refusing to reset a production-looking database name.");
const prismaCli = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, "db", "push", "--force-reset", "--skip-generate"], { stdio: "inherit", env: process.env });
if (result.error) throw result.error;
if (result.status !== 0) process.exitCode = result.status ?? 1;
