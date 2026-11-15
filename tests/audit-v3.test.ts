import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parseNpmAuditAdvisories, runProductionAudit } from "../src/audit/run";
describe("v3 production audit", () => {
  test("normalizes npm advisory evidence into stable verified findings", () => {
    const findings = parseNpmAuditAdvisories(
      JSON.stringify({
        vulnerabilities: {
          zlib: {
            severity: "high",
            range: "<1.2.13",
            via: [{ source: 123, title: "Buffer\nissue" }],
          },
          alpha: {
            severity: "low",
            range: "<2.0.0",
            via: ["transitive dependency", { name: "GHSA-example" }],
          },
        },
      }),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "LS023",
      severity: "high",
      verified: true,
      path: "package-lock.json",
    });
    expect(findings[0]?.detail).toContain("alpha: low");
    expect(findings[0]?.detail).toContain("npm:123");
    expect(findings[0]?.detail).not.toContain("Buffer\nissue");
  });

  test("reports advisory registry failures as incomplete, not clean", () => {
    expect(parseNpmAuditAdvisories("not json")[0]).toMatchObject({
      ruleId: "LS024",
      verified: false,
    });
    expect(
      parseNpmAuditAdvisories(
        JSON.stringify({ error: { code: "ENOAUDIT" } }),
      )[0],
    ).toMatchObject({ ruleId: "LS024", verified: false });
    expect(parseNpmAuditAdvisories("null")[0]).toMatchObject({
      ruleId: "LS024",
      verified: false,
    });
  });

  test("records a successful clean production advisory lookup", () => {
    expect(
      parseNpmAuditAdvisories(
        JSON.stringify({
          vulnerabilities: {},
          metadata: { vulnerabilities: { total: 0 } },
        }),
      )[0],
    ).toMatchObject({
      ruleId: "LS023",
      severity: "info",
      title: "No production dependency advisories found",
      verified: true,
    });
  });

  test("reports insecure defaults without printing secret values", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-audit-"));
    mkdirSync(join(root, "src", "plugins"), { recursive: true });
    mkdirSync(join(root, "src", "routes"), { recursive: true });
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: {} }));
    writeFileSync(join(root, ".env.example"), "JWT_ACCESS_SECRET=changeme\n");
    writeFileSync(
      join(root, "Dockerfile"),
      'FROM node:20\nCMD ["node","dist/server.js"]\n',
    );
    const report = runProductionAudit(root);
    expect(report.findings.map((item) => item.ruleId)).toContain("LS004");
    expect(JSON.stringify(report)).not.toContain("JWT_ACCESS_SECRET=changeme");
    expect(report.summary.high + report.summary.critical).toBeGreaterThan(0);
  });

  test("reports invalid locks and production settings as stable findings", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-audit-lock-"));
    mkdirSync(join(root, "src", "routes"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "sample",
        version: "1.0.0",
        engines: { node: ">=20" },
        scripts: { "prisma:deploy": "prisma migrate deploy" },
      }),
    );
    writeFileSync(
      join(root, "package-lock.json"),
      JSON.stringify({
        name: "other",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: { "": { name: "other", version: "1.0.0" } },
      }),
    );
    writeFileSync(join(root, "Dockerfile"), "FROM node:20-alpine\nUSER node\n");
    writeFileSync(
      join(root, "docker-compose.production.yml"),
      "services:\n  api:\n    environment:\n      CORS_ORIGIN: *\n",
    );
    const report = runProductionAudit(root);

    expect(report.findings.map((item) => item.ruleId)).toEqual(
      [...report.findings.map((item) => item.ruleId)].sort(),
    );
    expect(report.findings.map((item) => item.ruleId)).toEqual(
      expect.arrayContaining(["LS016", "LS018", "LS019", "LS021"]),
    );
    expect(
      report.findings.find((item) => item.ruleId === "LS018")?.verified,
    ).toBe(false);
  });

  test("accepts production Compose settings inherited from the base file", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-audit-compose-"));
    writeFileSync(
      join(root, "docker-compose.yml"),
      [
        "services:",
        "  api:",
        "    environment:",
        "      CORS_ORIGIN: ${CORS_ORIGIN:?Set an explicit production origin}",
        "      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:?Set a production access secret}",
        "      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:?Set a production refresh secret}",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(root, "docker-compose.production.yml"),
      "services:\n  api:\n    environment:\n      NODE_ENV: production\n",
    );

    expect(
      runProductionAudit(root).findings.map((item) => item.ruleId),
    ).not.toContain("LS021");
  });

  test("distinguishes a non-Git project from incomplete Git enumeration", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-audit-no-git-"));
    const finding = runProductionAudit(root).findings.find(
      (item) => item.ruleId === "LS022",
    );

    expect(finding).toMatchObject({
      severity: "medium",
      title: "Project is not a Git repository",
      verified: true,
    });
    expect(finding?.detail).toContain(
      "Initialize or select the project repository",
    );
  });

  test("reports Git command failures as incomplete enumeration", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-audit-git-error-"));
    const originalPath = process.env.PATH;
    process.env.PATH = root;
    try {
      const finding = runProductionAudit(root).findings.find(
        (item) => item.ruleId === "LS022",
      );
      expect(finding).toMatchObject({
        severity: "high",
        title: "Tracked paths could not be fully audited",
        verified: true,
      });
    } finally {
      if (originalPath === undefined) delete process.env.PATH;
      else process.env.PATH = originalPath;
    }
  });

  test("does not mistake Node minor versions for unsupported major lines", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-audit-node-range-"));
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        engines: { node: ">=24.22.0 <25 || >=26.13.0 <27" },
      }),
    );

    const report = runProductionAudit(root);
    expect(report.findings.map((item) => item.ruleId)).not.toContain("LS018");
  });

  test("evaluates supported Node engine ranges rather than their text", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-audit-node-range-"));
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ engines: { node: ">=8" } }),
    );
    expect(
      runProductionAudit(root).findings.map((item) => item.ruleId),
    ).toContain("LS018");
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ engines: { node: ">20" } }),
    );
    expect(
      runProductionAudit(root).findings.map((item) => item.ruleId),
    ).not.toContain("LS018");
  });

  test("recognizes patch-pinned Node Docker tags", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-audit-node-image-"));
    writeFileSync(
      join(root, "Dockerfile"),
      "FROM node:20.19.0-alpine\nUSER node\n",
    );
    expect(
      runProductionAudit(root).findings.map((item) => item.ruleId),
    ).toContain("LS016");
  });

  test("classifies tracked secret-like paths as heuristic without exposing contents", () => {
    const root = mkdtempSync(join(tmpdir(), "launchstack-audit-secrets-"));
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(
      join(root, ".env"),
      "JWT_ACCESS_SECRET=actual-secret-value\n",
    );
    writeFileSync(join(root, "src", "private.pem"), "private-key-material");
    writeFileSync(join(root, "README.md"), "token=actual-secret-value\n");
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    execFileSync("git", ["add", "-f", ".env", "src/private.pem", "README.md"], {
      cwd: root,
    });

    const report = runProductionAudit(root);
    const finding = report.findings.find((item) => item.ruleId === "LS005");

    expect(finding?.verified).toBe(false);
    expect(finding?.detail).toContain(".env");
    expect(finding?.detail).toContain("src/private.pem");
    expect(finding?.detail).not.toContain("actual-secret-value");
    expect(finding?.detail).not.toContain("private-key-material");
  });
});
