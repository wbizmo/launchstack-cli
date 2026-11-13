import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { runProductionAudit } from "../src/audit/run";
describe("v3 production audit", () => {
  test("reports insecure defaults without printing secret values", () => { const root = mkdtempSync(join(tmpdir(), "launchstack-audit-")); mkdirSync(join(root, "src", "plugins"), { recursive: true }); mkdirSync(join(root, "src", "routes"), { recursive: true }); writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: {} })); writeFileSync(join(root, ".env.example"), "JWT_ACCESS_SECRET=changeme\n"); writeFileSync(join(root, "Dockerfile"), "FROM node:20\nCMD [\"node\",\"dist/server.js\"]\n"); const report = runProductionAudit(root); expect(report.findings.map((item) => item.ruleId)).toContain("LS004"); expect(JSON.stringify(report)).not.toContain("JWT_ACCESS_SECRET=changeme"); expect(report.summary.high + report.summary.critical).toBeGreaterThan(0); });

  test("reports invalid locks and production settings as stable findings", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-audit-lock-"));
    mkdirSync(join(root, "src", "routes"), { recursive: true });
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "sample", version: "1.0.0", engines: { node: ">=20" }, scripts: { "prisma:deploy": "prisma migrate deploy" } }));
    writeFileSync(join(root, "package-lock.json"), JSON.stringify({ name: "other", version: "1.0.0", lockfileVersion: 3, packages: { "": { name: "other", version: "1.0.0" } } }));
    writeFileSync(join(root, "Dockerfile"), "FROM node:20-alpine\nUSER node\n");
    writeFileSync(join(root, "docker-compose.production.yml"), "services:\n  api:\n    environment:\n      CORS_ORIGIN: *\n");
    const report = runProductionAudit(root);

    expect(report.findings.map((item) => item.ruleId)).toEqual([...report.findings.map((item) => item.ruleId)].sort());
    expect(report.findings.map((item) => item.ruleId)).toEqual(expect.arrayContaining(["LS016", "LS018", "LS019", "LS021"]));
    expect(report.findings.find((item) => item.ruleId === "LS018")?.verified).toBe(false);
  });
});
