import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { runProductionAudit } from "../src/audit/run";
describe("v3 production audit", () => {
  test("reports insecure defaults without printing secret values", () => { const root = mkdtempSync(join(tmpdir(), "launchstack-audit-")); mkdirSync(join(root, "src", "plugins"), { recursive: true }); mkdirSync(join(root, "src", "routes"), { recursive: true }); writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: {} })); writeFileSync(join(root, ".env.example"), "JWT_ACCESS_SECRET=changeme\n"); writeFileSync(join(root, "Dockerfile"), "FROM node:20\nCMD [\"node\",\"dist/server.js\"]\n"); const report = runProductionAudit(root); expect(report.findings.map((item) => item.ruleId)).toContain("LS004"); expect(JSON.stringify(report)).not.toContain("JWT_ACCESS_SECRET=changeme"); expect(report.summary.high + report.summary.critical).toBeGreaterThan(0); });
});
