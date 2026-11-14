const { spawnSync } = require("node:child_process");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const node = process.execPath;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const temp = mkdtempSync(join(tmpdir(), "launchstack-template-smoke-"));
const project = join(temp, "smoke-api");
const databaseUrl =
  process.env.LAUNCHSTACK_SMOKE_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/launchstack_smoke";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}.`,
    );
  }
}

try {
  run(node, [
    join(root, "dist", "cli.js"),
    "create",
    "smoke-api",
    "--directory",
    project,
    "--no-install",
  ]);
  run(node, [
    join(root, "dist", "cli.js"),
    "generate",
    "resource",
    "invoice",
    "--field",
    "title:string",
    "--directory",
    project,
  ]);
  writeFileSync(
    join(project, "tests", "invoice.integration.test.ts"),
    [
      'import { afterAll, beforeAll, describe, expect, it } from "vitest";',
      'import { PrismaClient } from "@prisma/client";',
      'import { InvoiceRepository } from "../src/modules/invoice/invoice.repository";',
      'const enabled = process.env.RUN_DATABASE_TESTS === "1";',
      "const suite = enabled ? describe : describe.skip;",
      'const prisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });',
      "const repository = new InvoiceRepository(prisma);",
      'const ownerA = "smoke-owner-a-" + Date.now();',
      'const ownerB = "smoke-owner-b-" + Date.now();',
      "const queries: string[] = [];",
      'prisma.$on("query", (event) => queries.push(event.query));',
      'suite("generated invoice CRUD", () => {',
      "  beforeAll(async () => { await prisma.invoice.deleteMany({ where: { ownerId: { in: [ownerA, ownerB] } } }); });",
      "  afterAll(async () => { await prisma.invoice.deleteMany({ where: { ownerId: { in: [ownerA, ownerB] } } }); await prisma.$disconnect(); });",
      '  it("scopes concurrent updates and deletes to the owner", async () => {',
      '    const row = await repository.create(ownerA, { title: "original" });',
      "    expect(await repository.findOwned(row.id, ownerB)).toBeNull();",
      "    queries.length = 0;",
      '    const updates = await Promise.all([repository.updateOwned(row.id, ownerA, { title: "owner update" }), repository.updateOwned(row.id, ownerB, { title: "cross-owner attempt" })]);',
      "    expect(updates.filter(Boolean)).toHaveLength(1);",
      "    await new Promise((resolve) => setImmediate(resolve));",
      "    const updateQueries = queries.filter((query) => /^UPDATE/i.test(query.trim()));",
      "    expect(updateQueries).toHaveLength(2);",
      "    expect(updateQueries.every((query) => /ownerId|owner_id/i.test(query))).toBe(true);",
      "    expect(await repository.deleteOwned(row.id, ownerB)).toBe(false);",
      "    expect(await repository.deleteOwned(row.id, ownerA)).toBe(true);",
      "  });",
      '  it("paginates tied timestamps with one bounded query and no duplicates after deletion", async () => {',
      '    const timestamp = new Date("2025-01-01T00:00:00.000Z");',
      '    const rows = await Promise.all(Array.from({ length: 5 }, (_, index) => prisma.invoice.create({ data: { ownerId: ownerA, title: "page-" + index, createdAt: timestamp, updatedAt: timestamp } })));',
      "    queries.length = 0;",
      "    const first = await repository.list(ownerA, { limit: 2 });",
      "    await new Promise((resolve) => setImmediate(resolve));",
      "    expect(queries).toHaveLength(1);",
      "    expect(first.items).toHaveLength(2);",
      "    expect(first.hasNext).toBe(true);",
      "    await repository.deleteOwned(first.items[0]!.id, ownerA);",
      "    const second = await repository.list(ownerA, { limit: 2, cursor: first.nextCursor! });",
      "    const third = await repository.list(ownerA, { limit: 2, cursor: second.nextCursor! });",
      "    const listed = [...first.items.slice(1), ...second.items, ...third.items].map((item) => item.id);",
      "    console.log(JSON.stringify({ first: first.items.map((item) => item.id), second: second.items.map((item) => item.id), third: third.items.map((item) => item.id), listed, deleted: first.items[0]!.id }));",
      "    expect(new Set(listed).size).toBe(rows.length - 1);",
      "    expect(listed).not.toContain(first.items[0]!.id);",
      "  });",
      "});",
    ].join("\n") + "\n",
  );

  run(npm, ["ci", "--no-audit", "--no-fund"], { cwd: project });

  const testEnvironment = {
    ...process.env,
    RUN_DATABASE_TESTS: "1",
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET:
      "launchstack-ci-access-secret-that-is-at-least-32-characters",
    JWT_REFRESH_SECRET:
      "launchstack-ci-refresh-secret-that-is-at-least-32-characters",
  };

  run(npm, ["exec", "--", "prisma", "db", "push", "--skip-generate"], {
    cwd: project,
    env: testEnvironment,
  });
  run(npm, ["run", "check"], {
    cwd: project,
    env: testEnvironment,
  });
  run(npm, ["audit", "--omit=dev", "--audit-level=high"], {
    cwd: project,
    env: testEnvironment,
  });

  console.log("Generated project smoke tests passed.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
