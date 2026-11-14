import { existsSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { intersects, validRange } from "semver";
import { loadProjectManifest } from "../project/manifest";
import { detectManagedDrift, loadProjectState } from "../project/state";
import {
  AUDIT_SEVERITIES,
  severityRank,
  type AuditFinding,
  type AuditReport,
  type AuditSeverity,
} from "./types";
const readIfPresent = (root: string, path: string) => {
  const absolute = join(root, path);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : undefined;
};
function packageJson(root: string): Record<string, unknown> | undefined {
  const content = readIfPresent(root, "package.json");
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
const MAX_GIT_TRACKED_PATH_BYTES = 16 * 1024 * 1024;
const MAX_NPM_AUDIT_OUTPUT_BYTES = 2 * 1024 * 1024;

type NpmAuditAdvisory = {
  name?: unknown;
  severity?: unknown;
  range?: unknown;
  via?: unknown;
};

export function parseNpmAuditAdvisories(output: string): AuditFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output) as {
      vulnerabilities?: unknown;
      error?: unknown;
    };
  } catch {
    return [
      finding(
        "LS024",
        "medium",
        "Dependency advisory check returned invalid data",
        "npm audit did not return valid JSON advisory evidence; rerun the check and inspect npm/registry availability.",
        false,
        "package-lock.json",
      ),
    ];
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return [
      finding(
        "LS024",
        "medium",
        "Dependency advisory check returned invalid data",
        "npm audit did not return valid JSON advisory evidence; rerun the check and inspect npm/registry availability.",
        false,
        "package-lock.json",
      ),
    ];
  const audit = parsed as { vulnerabilities?: unknown; error?: unknown };
  if (audit.error)
    return [
      finding(
        "LS024",
        "medium",
        "Dependency advisory check could not complete",
        "npm audit reported a registry or lockfile error; advisory coverage is incomplete.",
        false,
        "package-lock.json",
      ),
    ];
  if (
    !audit.vulnerabilities ||
    typeof audit.vulnerabilities !== "object" ||
    Array.isArray(audit.vulnerabilities)
  )
    return [
      finding(
        "LS024",
        "medium",
        "Dependency advisory check returned invalid data",
        "npm audit did not return a vulnerability map; advisory coverage is incomplete.",
        false,
        "package-lock.json",
      ),
    ];

  const safeText = (value: string) =>
    value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 200);
  const vulnerabilities = Object.entries(
    audit.vulnerabilities as Record<string, NpmAuditAdvisory | null>,
  )
    .map(([packageName, advisory]) => {
      const record = advisory && typeof advisory === "object" ? advisory : {};
      const severity =
        typeof record.severity === "string" &&
        (AUDIT_SEVERITIES as readonly string[]).includes(record.severity)
          ? (record.severity as AuditSeverity)
          : "medium";
      const sources = Array.isArray(record.via)
        ? record.via
            .filter((item): item is Record<string, unknown> =>
              Boolean(item && typeof item === "object" && !Array.isArray(item)),
            )
            .map((item) =>
              typeof item.source === "number"
                ? `npm:${item.source}`
                : typeof item.name === "string"
                  ? safeText(item.name)
                  : typeof item.title === "string"
                    ? safeText(item.title)
                    : "advisory",
            )
            .sort()
        : [];
      const range =
        typeof record.range === "string"
          ? safeText(record.range)
          : "unspecified affected range";
      return {
        packageName: safeText(packageName),
        severity,
        source: sources.length
          ? sources.join(", ")
          : "advisory source unspecified",
        range,
      };
    })
    .sort((left, right) => left.packageName.localeCompare(right.packageName));
  if (!vulnerabilities.length)
    return [
      finding(
        "LS023",
        "info",
        "No production dependency advisories found",
        "npm audit returned no vulnerable production dependencies.",
        true,
        "package-lock.json",
      ),
    ];

  const severity = vulnerabilities.reduce<AuditSeverity>(
    (highest, advisory) =>
      severityRank(advisory.severity) > severityRank(highest)
        ? advisory.severity
        : highest,
    "info",
  );
  const details = vulnerabilities.map(
    (item) =>
      `${item.packageName}: ${item.severity}, ${item.range}; evidence: ${item.source}`,
  );
  return [
    finding(
      "LS023",
      severity,
      "Production dependency advisories detected",
      details.join("\n"),
      true,
      "package-lock.json",
    ),
  ];
}

function npmAdvisoryFindings(root: string): AuditFinding[] {
  const result = spawnSync(
    "npm",
    [
      "audit",
      "--json",
      "--omit=dev",
      "--package-lock-only",
      "--audit-level=none",
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: MAX_NPM_AUDIT_OUTPUT_BYTES,
      windowsHide: true,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  if (result.error || result.signal || result.stdout.length === 0)
    return [
      finding(
        "LS024",
        "medium",
        "Dependency advisory check could not complete",
        "npm audit did not complete within its 30-second limit or could not reach a registry; advisory coverage is incomplete.",
        false,
        "package-lock.json",
      ),
    ];
  return parseNpmAuditAdvisories(result.stdout);
}

function gitTrackedFiles(
  root: string,
): { paths: string[]; complete: true } | { paths: []; complete: false } {
  try {
    return {
      paths: execFileSync("git", ["ls-files", "-z"], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: MAX_GIT_TRACKED_PATH_BYTES,
        timeout: 10_000,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .split("\0")
        .filter(Boolean),
      complete: true,
    };
  } catch {
    return { paths: [], complete: false };
  }
}
const finding = (
  ruleId: string,
  severity: AuditSeverity,
  title: string,
  detail: string,
  verified: boolean,
  path?: string,
): AuditFinding => ({ ruleId, severity, title, detail, verified, path });
const SECRET_FILE_PATTERNS = [
  /^\.env(?:\..+)?$/,
  /(^|\/)\.env(?:\..+)?$/,
  /(^|\/)secrets?\.json$/i,
  /(^|\/).*\.pem$/i,
  /(^|\/).*\.p12$/i,
  /(^|\/)id_rsa$/i,
];
export function runProductionAudit(
  projectDirectoryInput: string,
  options: { dependencyAdvisories?: boolean } = {},
): AuditReport {
  const root = resolve(projectDirectoryInput);
  const findings: AuditFinding[] = [];
  const pkg = packageJson(root);
  if (!existsSync(join(root, "package-lock.json")))
    findings.push(
      finding(
        "LS001",
        "high",
        "Dependency graph is not locked",
        "package-lock.json is missing; production installs are not reproducible.",
        true,
        "package-lock.json",
      ),
    );
  const cors = readIfPresent(root, "src/plugins/cors.ts") ?? "";
  const envExample = readIfPresent(root, ".env.example") ?? "";
  if (cors && /origin\s*:\s*true|origin\s*:\s*["']\*["']/.test(cors))
    findings.push(
      finding(
        "LS002",
        "high",
        "Production CORS may be unrestricted",
        "CORS source contains an unrestricted origin setting.",
        true,
        "src/plugins/cors.ts",
      ),
    );
  const authRoutes =
    readIfPresent(root, "src/modules/auth/auth.routes.ts") ?? "";
  if (authRoutes && !/rateLimit|max:\s*\d+/.test(authRoutes))
    findings.push(
      finding(
        "LS003",
        "high",
        "Authentication routes lack visible rate limits",
        "Authentication endpoints should enforce bounded request rates before expensive work.",
        true,
        "src/modules/auth/auth.routes.ts",
      ),
    );
  for (const entry of [".env", ".env.example"]
    .map((path) => ({ path, content: readIfPresent(root, path) }))
    .filter((item) => item.content !== undefined))
    if (
      (entry.content ?? "")
        .split(/\r?\n/)
        .some((line) =>
          /^(JWT_(?:ACCESS|REFRESH)_SECRET)=\s*(?:secret|changeme|development|test|your[-_ ]?secret)\s*$/i.test(
            line,
          ),
        )
    )
      findings.push(
        finding(
          "LS004",
          entry.path === ".env" ? "critical" : "high",
          "JWT secret uses a known placeholder",
          `A JWT secret placeholder was detected in ${entry.path}; values are intentionally not displayed.`,
          true,
          entry.path,
        ),
      );
  const trackedResult = gitTrackedFiles(root);
  if (!trackedResult.complete)
    findings.push(
      finding(
        "LS022",
        "high",
        "Tracked paths could not be fully audited",
        "Git path enumeration failed or exceeded the 16 MiB audit bound; secret-path results are incomplete.",
        true,
      ),
    );
  const tracked = trackedResult.paths.filter(
    (path) =>
      SECRET_FILE_PATTERNS.some((pattern) => pattern.test(path)) &&
      !/(^|\/)\.env\.example$/.test(path),
  );
  if (tracked.length)
    findings.push(
      finding(
        "LS005",
        "critical",
        "Potential secret material is tracked by Git",
        `Sensitive-looking tracked paths: ${tracked.join(", ")}. Secret contents were not inspected or printed.`,
        false,
      ),
    );
  const dockerfile = readIfPresent(root, "Dockerfile");
  if (dockerfile && !/^USER\s+[^\s]+/m.test(dockerfile))
    findings.push(
      finding(
        "LS006",
        "high",
        "Container may run as root",
        "Dockerfile does not declare a non-root USER in the runtime image.",
        true,
        "Dockerfile",
      ),
    );
  if (
    dockerfile &&
    [
      ...dockerfile.matchAll(
        /^FROM\s+(?:--platform=\S+\s+)?node:(\d+)(?=[.@\-\s]|$)/gim,
      ),
    ].some((match) => Number(match[1]) <= 20)
  )
    findings.push(
      finding(
        "LS016",
        "high",
        "Container runtime may be end-of-life",
        "The Dockerfile references Node 20 or earlier; verify the selected image against the Node.js support schedule.",
        false,
        "Dockerfile",
      ),
    );
  if (pkg) {
    const engines =
      pkg.engines && typeof pkg.engines === "object"
        ? (pkg.engines as Record<string, unknown>)
        : {};
    if (typeof engines.node !== "string")
      findings.push(
        finding(
          "LS017",
          "medium",
          "Node.js support range is not declared",
          "package.json does not declare engines.node; supported runtime compatibility cannot be checked from this manifest.",
          true,
          "package.json",
        ),
      );
    else if (
      validRange(engines.node) !== null &&
      intersects(engines.node, "<=20.x", { includePrerelease: true })
    )
      findings.push(
        finding(
          "LS018",
          "high",
          "Node.js support range may include an end-of-life runtime",
          "The declared Node.js range appears to include Node 20 or earlier; review against the current Node.js release schedule.",
          false,
          "package.json",
        ),
      );
  }
  const lockContent = readIfPresent(root, "package-lock.json");
  if (lockContent !== undefined) {
    try {
      const lock = JSON.parse(lockContent) as {
        lockfileVersion?: unknown;
        packages?: Record<string, { name?: unknown; version?: unknown }>;
      };
      if (
        !Number.isInteger(lock.lockfileVersion) ||
        !lock.packages ||
        typeof lock.packages !== "object"
      )
        throw new Error("invalid npm lock structure");
      const rootPackage = lock.packages[""];
      if (
        !rootPackage ||
        (pkg?.name && rootPackage.name !== pkg.name) ||
        (pkg?.version && rootPackage.version !== pkg.version)
      )
        findings.push(
          finding(
            "LS019",
            "high",
            "Dependency lock does not match package metadata",
            "The package-lock root name or version differs from package.json.",
            true,
            "package-lock.json",
          ),
        );
    } catch {
      findings.push(
        finding(
          "LS020",
          "high",
          "Dependency lock is invalid",
          "package-lock.json is not valid JSON with an npm lock structure.",
          true,
          "package-lock.json",
        ),
      );
    }
  }
  const productionCompose =
    readIfPresent(root, "docker-compose.production.yml") ?? "";
  if (
    productionCompose &&
    (!/CORS_ORIGIN:\s*\$\{CORS_ORIGIN:\?/.test(productionCompose) ||
      !/JWT_(?:ACCESS|REFRESH)_SECRET:\s*\$\{JWT_/.test(productionCompose))
  )
    findings.push(
      finding(
        "LS021",
        "high",
        "Production Compose does not require deployment settings",
        "Production Compose should require an explicit CORS origin and JWT secrets.",
        true,
        "docker-compose.production.yml",
      ),
    );
  if (pkg) {
    const scripts =
      pkg.scripts && typeof pkg.scripts === "object"
        ? (pkg.scripts as Record<string, unknown>)
        : {};
    if (!scripts["prisma:deploy"])
      findings.push(
        finding(
          "LS007",
          "high",
          "Production migration command is missing",
          "package.json does not expose prisma:deploy.",
          true,
          "package.json",
        ),
      );
  }
  if (
    !existsSync(join(root, "src/routes/health.ts")) ||
    !existsSync(join(root, "src/routes/readiness.ts"))
  )
    findings.push(
      finding(
        "LS008",
        "medium",
        "Health/readiness coverage is incomplete",
        "Production services should expose both liveness and readiness endpoints.",
        true,
      ),
    );
  const swagger = readIfPresent(root, "src/plugins/swagger.ts") ?? "";
  if (swagger && !/NODE_ENV|SWAGGER|DOCS|enabled/i.test(swagger))
    findings.push(
      finding(
        "LS009",
        "medium",
        "Swagger exposure has no visible production policy",
        "Gate public production API documentation explicitly or document the choice.",
        false,
        "src/plugins/swagger.ts",
      ),
    );
  const tsconfig = readIfPresent(root, "tsconfig.json") ?? "";
  if (/"sourceMap"\s*:\s*true|"inlineSourceMap"\s*:\s*true/.test(tsconfig))
    findings.push(
      finding(
        "LS011",
        "low",
        "Source maps are enabled",
        "Ensure production source maps are private.",
        true,
        "tsconfig.json",
      ),
    );
  if (envExample && /NODE_ENV=development|LOG_LEVEL=debug/.test(envExample))
    findings.push(
      finding(
        "LS012",
        "low",
        "Development defaults are documented",
        "Deployment configuration should override development defaults.",
        true,
        ".env.example",
      ),
    );
  if (options.dependencyAdvisories) findings.push(...npmAdvisoryFindings(root));
  if (existsSync(join(root, "launchstack.json")))
    try {
      const manifest = loadProjectManifest(root);
      const state = loadProjectState(root, {
        templateVersion: manifest.project.templateVersion,
        cliVersion: "unknown",
      });
      const drift = detectManagedDrift(root, state).filter(
        (item) => item.kind !== "clean",
      );
      if (drift.length)
        findings.push(
          finding(
            "LS013",
            "high",
            "LaunchStack-managed files have drift",
            `${drift.length} managed file(s) are missing or locally modified.`,
            true,
          ),
        );
      const suppressions = new Map(
        (manifest.audit?.suppressions ?? []).map((item) => [
          item.ruleId,
          item.reason,
        ]),
      );
      for (const item of findings) {
        const reason = suppressions.get(item.ruleId);
        if (reason) {
          item.suppressed = true;
          item.suppressionReason = reason;
        }
      }
    } catch (error) {
      findings.push(
        finding(
          "LS015",
          "high",
          "LaunchStack project metadata is invalid",
          error instanceof Error
            ? error.message
            : "Unable to validate metadata.",
          true,
          "launchstack.json",
        ),
      );
    }
  findings.sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  const summary: AuditReport["summary"] = {
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
    suppressed: 0,
  };
  for (const item of findings)
    item.suppressed ? (summary.suppressed += 1) : (summary[item.severity] += 1);
  return { projectDirectory: root, findings, summary };
}
