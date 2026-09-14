import {
  AUDIT_SEVERITIES,
  FIRST_PARTY_EXTENSIONS,
  MANIFEST_FILENAME,
  MANIFEST_SCHEMA_URL,
  MANIFEST_SCHEMA_VERSION,
  STATE_DIRECTORY,
  STATE_FILENAME,
  STATE_SCHEMA_VERSION,
  V3_TEMPLATE_VERSION,
  applyExtensionInstall,
  applyModuleGeneration,
  applyReconciliation,
  applyUpgrade,
  collectOperations,
  copyDirectory,
  createOrUpdateStage,
  createProjectManifest,
  destroyStage,
  detectManagedDrift,
  emptyProjectState,
  ensureDestinationAvailable,
  generateProject,
  generateTypeScriptClient,
  getPackageRoot,
  getTemplateDirectory,
  hashFile,
  inspectStage,
  installDependencies,
  listFirstPartyExtensions,
  loadOpenApiSource,
  loadProjectManifest,
  loadProjectState,
  parseFieldSpec,
  parseOpenApiDocument,
  parseProjectManifest,
  parseProjectState,
  planExtensionInstall,
  planModuleGeneration,
  planReconciliation,
  planUpgrade,
  projectHasManifest,
  projectManifestSchema,
  projectStateSchema,
  renderDirectory,
  renderTemplate,
  requestBodySchema,
  resolveExtensionOrder,
  responseSchema,
  runProductionAudit,
  schemaToType,
  serializeProjectManifest,
  serializeProjectState,
  severityRank,
  sha256,
  stageResourceId,
  toDisplayName,
  validateProjectName,
  validateStageName
} from "./chunk-CV34FFVK.mjs";

// src/errors.ts
var LaunchStackError = class extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "LaunchStackError";
    this.status = status;
    this.details = details;
  }
};

// src/client.ts
function validateBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new LaunchStackError("LaunchStack base URL must be a valid absolute URL.");
  }
  if (url.username || url.password) {
    throw new LaunchStackError("LaunchStack base URL must not contain embedded credentials.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new LaunchStackError("LaunchStack API endpoints must use HTTPS. Plain HTTP is allowed only for loopback development endpoints.");
  }
  url.hash = "";
  url.search = "";
  return url;
}
var LaunchStackClient = class {
  constructor(config) {
    if (!config.apiKey) {
      throw new LaunchStackError("LaunchStack API key is required.");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = validateBaseUrl(config.baseUrl ?? "https://api.launchstack.dev/v1");
  }
  async request(path, options = {}) {
    const normalizedBase = this.baseUrl.toString().endsWith("/") ? this.baseUrl.toString() : `${this.baseUrl.toString()}/`;
    const relativePath = path.replace(/^\/+/, "");
    const target = new URL(relativePath, normalizedBase);
    if (target.origin !== this.baseUrl.origin) {
      throw new LaunchStackError("Refusing to send LaunchStack credentials to a different origin.");
    }
    const response = await fetch(target, {
      ...options,
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers
      }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      throw new LaunchStackError("LaunchStack API redirects are refused to prevent credential forwarding across origins.", response.status);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new LaunchStackError(
        data?.message || "LaunchStack request failed.",
        response.status,
        data
      );
    }
    return data;
  }
  listLaunches() {
    return this.request("/launches");
  }
  getLaunch(id) {
    return this.request(`/launches/${encodeURIComponent(id)}`);
  }
  createLaunch(input) {
    return this.request("/launches", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  listDeployments() {
    return this.request("/deployments");
  }
  createDeployment(input) {
    return this.request("/deployments", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  listChangelog() {
    return this.request("/changelog");
  }
  createChangelog(input) {
    return this.request("/changelog", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};
export {
  AUDIT_SEVERITIES,
  FIRST_PARTY_EXTENSIONS,
  LaunchStackClient,
  LaunchStackError,
  MANIFEST_FILENAME,
  MANIFEST_SCHEMA_URL,
  MANIFEST_SCHEMA_VERSION,
  STATE_DIRECTORY,
  STATE_FILENAME,
  STATE_SCHEMA_VERSION,
  V3_TEMPLATE_VERSION,
  applyExtensionInstall,
  applyModuleGeneration,
  applyReconciliation,
  applyUpgrade,
  collectOperations,
  copyDirectory,
  createOrUpdateStage,
  createProjectManifest,
  destroyStage,
  detectManagedDrift,
  emptyProjectState,
  ensureDestinationAvailable,
  generateProject,
  generateTypeScriptClient,
  getPackageRoot,
  getTemplateDirectory,
  hashFile,
  inspectStage,
  installDependencies,
  listFirstPartyExtensions,
  loadOpenApiSource,
  loadProjectManifest,
  loadProjectState,
  parseFieldSpec,
  parseOpenApiDocument,
  parseProjectManifest,
  parseProjectState,
  planExtensionInstall,
  planModuleGeneration,
  planReconciliation,
  planUpgrade,
  projectHasManifest,
  projectManifestSchema,
  projectStateSchema,
  renderDirectory,
  renderTemplate,
  requestBodySchema,
  resolveExtensionOrder,
  responseSchema,
  runProductionAudit,
  schemaToType,
  serializeProjectManifest,
  serializeProjectState,
  severityRank,
  sha256,
  stageResourceId,
  toDisplayName,
  validateProjectName,
  validateStageName
};
//# sourceMappingURL=index.mjs.map