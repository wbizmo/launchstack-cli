const { spawnSync } = require("node:child_process");
const { existsSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const { URL } = require("node:url");

if (process.env.NODE_ENV === "production") throw new Error("Development migrations cannot run with NODE_ENV=production.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const database = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "::1"].includes(database.hostname.toLowerCase())) throw new Error("Development migrations require a loopback database.");
if (/(^|[_-])prod(uction)?($|[_-])/i.test(database.pathname)) throw new Error("Refusing automatic migrations against a production-looking database name.");
const migrations = join(process.cwd(), "prisma", "migrations");
const hasMigrations = existsSync(migrations) && readdirSync(migrations, { withFileTypes: true }).some((entry) => entry.isDirectory() && existsSync(join(migrations, entry.name, "migration.sql")));
const prismaCli = require.resolve("prisma/build/index.js");
const args = hasMigrations ? [prismaCli, "migrate", "deploy"] : [prismaCli, "db", "push", "--skip-generate"];
const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
if (result.error) throw result.error;
if (result.status !== 0) process.exitCode = result.status ?? 1;
