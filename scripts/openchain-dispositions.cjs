const fs = require("node:fs");
const path = require("node:path");

function extractVia(vulnerability) {
  const values = Array.isArray(vulnerability?.via) ? vulnerability.via : [];
  return values.map((value) => {
    if (typeof value === "string") return { id: value };
    return {
      source: value.source ?? null,
      name: value.name ?? null,
      title: value.title ?? null,
      url: value.url ?? null,
      severity: value.severity ?? null,
      range: value.range ?? null,
    };
  });
}

function buildDispositions(componentRecord, audits) {
  const dispositions = [];
  let findingCount = 0;
  for (const component of componentRecord.components || []) {
    const audit = audits[component.scope];
    if (!audit || typeof audit !== "object") {
      throw new Error("Missing audit evidence for scope: " + component.scope);
    }
    const vulnerability = audit.vulnerabilities?.[component.name];
    if (vulnerability) findingCount += 1;
    dispositions.push({
      scope: component.scope,
      component: component.name,
      version: component.version,
      license: component.license,
      auditStatus: vulnerability
        ? "known-vulnerability-reported"
        : "no-known-vulnerability-returned",
      severity: vulnerability?.severity ?? null,
      via: vulnerability ? extractVia(vulnerability) : [],
      disposition: vulnerability
        ? "release-blocked-pending-remediation-or-reviewed-mitigation"
        : "no-action-required-at-release-validation",
    });
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    findingCount,
    dispositions,
  };
}

function main() {
  const [componentPath, cliAuditPath, templateAuditPath, outputPath] =
    process.argv.slice(2);
  if (!componentPath || !cliAuditPath || !templateAuditPath || !outputPath) {
    throw new Error(
      "Usage: node scripts/openchain-dispositions.cjs <component-records> <cli-audit> <template-audit> <output>",
    );
  }
  const components = JSON.parse(fs.readFileSync(componentPath, "utf8"));
  const cliAudit = JSON.parse(fs.readFileSync(cliAuditPath, "utf8"));
  const templateAudit = JSON.parse(fs.readFileSync(templateAuditPath, "utf8"));
  const result = buildDispositions(components, {
    "launchstack-cli": cliAudit,
    "generated-api-template": templateAudit,
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
  console.log(
    "OpenChain vulnerability dispositions written: " +
      result.dispositions.length +
      " components, " +
      result.findingCount +
      " findings.",
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

module.exports = { buildDispositions };
