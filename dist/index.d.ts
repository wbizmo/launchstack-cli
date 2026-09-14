import { z } from 'zod';

type LaunchStackConfig = {
    apiKey: string;
    baseUrl?: string;
};
type Launch = {
    id: string;
    name: string;
    status: "draft" | "scheduled" | "live" | "archived";
    environment: string;
    createdAt: string;
};
type CreateLaunchInput = {
    name: string;
    environment: string;
    scheduledAt?: string;
};
type Deployment = {
    id: string;
    launchId: string;
    version: string;
    status: "pending" | "success" | "failed";
    createdAt: string;
};
type CreateDeploymentInput = {
    launchId: string;
    version: string;
    notes?: string;
};
type ChangelogEntry = {
    id: string;
    title: string;
    body: string;
    version: string;
    createdAt: string;
};
type CreateChangelogInput = {
    title: string;
    body: string;
    version: string;
};

declare class LaunchStackClient {
    private apiKey;
    private baseUrl;
    constructor(config: LaunchStackConfig);
    private request;
    listLaunches(): Promise<Launch[]>;
    getLaunch(id: string): Promise<Launch>;
    createLaunch(input: CreateLaunchInput): Promise<Launch>;
    listDeployments(): Promise<Deployment[]>;
    createDeployment(input: CreateDeploymentInput): Promise<Deployment>;
    listChangelog(): Promise<ChangelogEntry[]>;
    createChangelog(input: CreateChangelogInput): Promise<ChangelogEntry>;
}

declare class LaunchStackError extends Error {
    status?: number;
    details?: unknown;
    constructor(message: string, status?: number, details?: unknown);
}

type TemplateName = "api";
type TemplateFile = {
    source: string;
    destination: string;
};
type ProjectTemplate = {
    name: TemplateName;
    rootDirectory: string;
};
type GenerateProjectOptions = {
    projectName: string;
    destinationDirectory: string;
    template: TemplateName;
    overwrite?: boolean;
};

declare function generateProject(options: GenerateProjectOptions): string;

declare function ensureDestinationAvailable(destinationDirectory: string, overwrite?: boolean): void;
declare function copyDirectory(sourceDirectory: string, destinationDirectory: string, overwriteRenamedFiles?: boolean): void;

declare function installDependencies(projectDirectory: string): void;

declare function validateProjectName(projectName: string): void;
declare function toDisplayName(projectName: string): string;

declare function getPackageRoot(): string;
declare function getTemplateDirectory(templateName: string): string;

type TemplateVariables = Record<string, string>;
declare function renderTemplate(content: string, variables: TemplateVariables): string;
declare function renderDirectory(directory: string, variables: TemplateVariables): void;

declare const MANIFEST_SCHEMA_URL = "https://launchstack.dev/schemas/project-v1.json";
declare const MANIFEST_SCHEMA_VERSION: 1;
declare const STATE_SCHEMA_VERSION: 1;
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | {
    [key: string]: JsonValue;
};
type CapabilitySelection = {
    version: string;
    provider?: string;
    options?: Record<string, JsonValue>;
};
type AuditSuppression = {
    ruleId: string;
    reason: string;
};
type DesiredStage = {
    provider?: string;
    source?: string;
    production?: boolean;
    env?: Record<string, string>;
};
type ProjectManifest = {
    $schema: typeof MANIFEST_SCHEMA_URL;
    schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
    project: {
        name: string;
        templateVersion: string;
    };
    capabilities: Record<string, CapabilitySelection>;
    provider?: {
        id: string;
    };
    stages: Record<string, DesiredStage>;
    audit?: {
        suppressions: AuditSuppression[];
    };
};
type ManagedFileState = {
    owner: string;
    sha256: string;
    version: string;
};
type InstalledExtensionState = {
    id: string;
    version: string;
    kind: "capability" | "plugin";
    source?: string;
    installedAt: string;
};
type StageState = {
    name: string;
    provider: string;
    resourceId: string;
    status: "creating" | "ready" | "failed" | "destroyed";
    sourceCommit?: string;
    url?: string;
    createdAt: string;
    updatedAt: string;
    production: boolean;
};
type ProjectState = {
    stateVersion: typeof STATE_SCHEMA_VERSION;
    templateVersion: string;
    cliVersion: string;
    managedFiles: Record<string, ManagedFileState>;
    extensions: Record<string, InstalledExtensionState>;
    stages: Record<string, StageState>;
    updatedAt: string;
};
type DriftKind = "clean" | "missing" | "modified" | "unmanaged";
type DriftEntry = {
    path: string;
    kind: DriftKind;
    owner?: string;
    expectedSha256?: string;
    actualSha256?: string;
};
type PlannedWrite = {
    type: "write";
    path: string;
    content: string;
    owner: string;
    version: string;
    expectedSha256?: string | null;
    executable?: boolean;
};
type PlannedDelete = {
    type: "delete";
    path: string;
    owner: string;
    expectedSha256: string;
};
type FileMutation = PlannedWrite | PlannedDelete;
type LifecycleAction = {
    id: string;
    kind: "install" | "upgrade" | "remove" | "write" | "delete" | "package" | "environment" | "compose" | "stage";
    target: string;
    detail: string;
    destructive?: boolean;
};
type LifecyclePlan = {
    projectDirectory: string;
    actions: LifecycleAction[];
    warnings: string[];
    conflicts: string[];
};
declare function emptyProjectState(templateVersion: string, cliVersion: string, now?: string): ProjectState;

declare const projectManifestSchema: z.ZodObject<{
    $schema: z.ZodLiteral<"https://launchstack.dev/schemas/project-v1.json">;
    schemaVersion: z.ZodLiteral<1>;
    project: z.ZodObject<{
        name: z.ZodString;
        templateVersion: z.ZodString;
    }, z.core.$strict>;
    capabilities: z.ZodRecord<z.ZodString, z.ZodObject<{
        version: z.ZodString;
        provider: z.ZodOptional<z.ZodString>;
        options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strict>>;
    provider: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strict>>;
    stages: z.ZodRecord<z.ZodString, z.ZodObject<{
        provider: z.ZodOptional<z.ZodString>;
        source: z.ZodOptional<z.ZodString>;
        production: z.ZodOptional<z.ZodBoolean>;
        env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strict>>;
    audit: z.ZodOptional<z.ZodObject<{
        suppressions: z.ZodArray<z.ZodObject<{
            ruleId: z.ZodString;
            reason: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const MANIFEST_FILENAME = "launchstack.json";
declare function parseProjectManifest(input: unknown): ProjectManifest;
declare function loadProjectManifest(projectDirectory: string): ProjectManifest;
declare function serializeProjectManifest(manifest: ProjectManifest): string;
declare function createProjectManifest(input: {
    name: string;
    templateVersion: string;
}): ProjectManifest;

declare const projectStateSchema: z.ZodObject<{
    stateVersion: z.ZodLiteral<1>;
    templateVersion: z.ZodString;
    cliVersion: z.ZodString;
    managedFiles: z.ZodRecord<z.ZodString, z.ZodObject<{
        owner: z.ZodString;
        sha256: z.ZodString;
        version: z.ZodString;
    }, z.core.$strict>>;
    extensions: z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
        kind: z.ZodEnum<{
            plugin: "plugin";
            capability: "capability";
        }>;
        source: z.ZodOptional<z.ZodString>;
        installedAt: z.ZodString;
    }, z.core.$strict>>;
    stages: z.ZodRecord<z.ZodString, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodString;
        resourceId: z.ZodString;
        status: z.ZodEnum<{
            creating: "creating";
            ready: "ready";
            failed: "failed";
            destroyed: "destroyed";
        }>;
        sourceCommit: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        production: z.ZodBoolean;
    }, z.core.$strict>>;
    updatedAt: z.ZodString;
}, z.core.$strict>;
declare const STATE_DIRECTORY = ".launchstack";
declare const STATE_FILENAME = "state.json";
declare function sha256(content: string | Buffer): string;
declare function hashFile(path: string): string;
declare function parseProjectState(input: unknown): ProjectState;
declare function loadProjectState(projectDirectory: string, defaults?: {
    templateVersion?: string;
    cliVersion?: string;
}): ProjectState;
declare function serializeProjectState(state: ProjectState): string;
declare function detectManagedDrift(projectDirectory: string, state: ProjectState): DriftEntry[];

type ReconciliationPlan = LifecyclePlan & {
    desiredCapabilities: string[];
    installCapabilities: string[];
    removeCapabilities: string[];
    drift: DriftEntry[];
};
declare function planReconciliation(projectDirectoryInput: string): ReconciliationPlan;
declare function applyReconciliation(input: {
    projectDirectory: string;
    allowRemove?: boolean;
}): ReconciliationPlan;
declare function projectHasManifest(projectDirectory: string): boolean;

declare const V3_TEMPLATE_VERSION = "3.0.0";
type UpgradePlan = {
    projectDirectory: string;
    fromVersion: string;
    toVersion: string;
    actions: LifecycleAction[];
    conflicts: string[];
    mutations: FileMutation[];
    nextManifest: ProjectManifest;
    nextState: ProjectState;
};
declare function planUpgrade(projectDirectoryInput: string): UpgradePlan;
declare function applyUpgrade(plan: UpgradePlan): ProjectState;

type ExtensionKind = "capability" | "plugin";
type ExtensionFile = {
    path: string;
    content: string;
    executable?: boolean;
};
type ExtensionEnvironmentVariable = {
    name: string;
    description: string;
    example?: string;
    required?: boolean;
    secret?: boolean;
};
type ExtensionManifest = {
    schemaVersion: 1;
    id: string;
    version: string;
    kind: ExtensionKind;
    displayName: string;
    supportedLaunchStack: string;
    dependencies?: string[];
    conflicts?: string[];
    files?: ExtensionFile[];
    packages?: {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    };
    environment?: ExtensionEnvironmentVariable[];
    composeServices?: Record<string, JsonValue>;
    doctor?: Array<{
        id: string;
        path?: string;
        env?: string;
        description: string;
    }>;
    auditRequirements?: Array<{
        ruleId: string;
        description: string;
    }>;
    hooks?: Array<{
        name: string;
        command: string;
        destructive?: boolean;
    }>;
};
type ExtensionPlan = {
    extensionIds: string[];
    actions: Array<{
        kind: "file" | "package" | "environment" | "compose" | "metadata";
        target: string;
        detail: string;
    }>;
    warnings: string[];
    noop: boolean;
};

declare const FIRST_PARTY_EXTENSIONS: Record<string, ExtensionManifest>;
declare function listFirstPartyExtensions(): ExtensionManifest[];

type PreparedExtensionPlan = ExtensionPlan & {
    projectDirectory: string;
    mutations: FileMutation[];
    nextManifest: ProjectManifest;
    nextState: ProjectState;
};
declare function resolveExtensionOrder(requested: string[], registry: Record<string, ExtensionManifest>): ExtensionManifest[];
declare function planExtensionInstall(input: {
    projectDirectory: string;
    requested: string[];
    registry: Record<string, ExtensionManifest>;
}): PreparedExtensionPlan;
declare function applyExtensionInstall(plan: PreparedExtensionPlan): ProjectState;

type OpenApiSchema = {
    type?: string | string[];
    nullable?: boolean;
    enum?: Array<string | number | boolean | null>;
    properties?: Record<string, OpenApiSchema>;
    required?: string[];
    items?: OpenApiSchema;
    additionalProperties?: boolean | OpenApiSchema;
    oneOf?: OpenApiSchema[];
    anyOf?: OpenApiSchema[];
    allOf?: OpenApiSchema[];
    $ref?: string;
};
type OpenApiParameter = {
    name: string;
    in: "path" | "query" | "header" | "cookie";
    required?: boolean;
    schema?: OpenApiSchema;
};
type OpenApiOperation = {
    operationId?: string;
    parameters?: OpenApiParameter[];
    requestBody?: {
        required?: boolean;
        content?: Record<string, {
            schema?: OpenApiSchema;
        }>;
    };
    responses?: Record<string, {
        description?: string;
        content?: Record<string, {
            schema?: OpenApiSchema;
        }>;
    }>;
};
type OpenApiDocument = {
    openapi: string;
    info?: {
        title?: string;
        version?: string;
    };
    paths: Record<string, Record<string, OpenApiOperation | unknown>>;
    components?: {
        schemas?: Record<string, OpenApiSchema>;
    };
};
declare function parseOpenApiDocument(value: unknown): OpenApiDocument;
type ParsedOperation = {
    method: string;
    path: string;
    name: string;
    operation: OpenApiOperation;
};
declare function collectOperations(document: OpenApiDocument): ParsedOperation[];
declare function schemaToType(schema: OpenApiSchema | undefined): string;
declare function responseSchema(operation: OpenApiOperation): OpenApiSchema | undefined;
declare function requestBodySchema(operation: OpenApiOperation): OpenApiSchema | undefined;

type ClientTarget = "typescript" | "react" | "react-native";
declare function loadOpenApiSource(source: string): Promise<OpenApiDocument>;
declare function generateTypeScriptClient(document: OpenApiDocument, target?: ClientTarget): string;

declare const AUDIT_SEVERITIES: readonly ["info", "low", "medium", "high", "critical"];
type AuditSeverity = typeof AUDIT_SEVERITIES[number];
type AuditFinding = {
    ruleId: string;
    severity: AuditSeverity;
    title: string;
    detail: string;
    verified: boolean;
    path?: string;
    suppressed?: boolean;
    suppressionReason?: string;
};
type AuditReport = {
    projectDirectory: string;
    findings: AuditFinding[];
    summary: Record<AuditSeverity, number> & {
        suppressed: number;
    };
};
declare function severityRank(severity: AuditSeverity): number;

declare function runProductionAudit(projectDirectoryInput: string): AuditReport;

type ResourceFieldType = "string" | "number" | "boolean" | "date";
type ResourceField = {
    name: string;
    type: ResourceFieldType;
    optional?: boolean;
};
type ModuleGenerationPlan = {
    projectDirectory: string;
    kind: "module" | "resource";
    name: string;
    files: string[];
    mutations: FileMutation[];
    nextState: ProjectState;
    migrationCommand?: string;
};
declare function parseFieldSpec(spec: string): ResourceField;
declare function planModuleGeneration(input: {
    projectDirectory: string;
    kind: "module" | "resource";
    name: string;
    fields?: ResourceField[];
}): ModuleGenerationPlan;
declare function applyModuleGeneration(plan: ModuleGenerationPlan): ProjectState;

type StageCreateInput = {
    projectDirectory: string;
    stage: string;
    resourceId: string;
    environment: Record<string, string>;
    sourceCommit?: string;
    production: boolean;
};
type StageCreateResult = {
    resourceId: string;
    url?: string;
};
type StageProviderAdapter = {
    id: string;
    capabilities: {
        create: boolean;
        inspect: boolean;
        update: boolean;
        destroy: boolean;
    };
    create(input: StageCreateInput): StageCreateResult;
    inspect(input: {
        projectDirectory: string;
        resourceId: string;
    }): {
        exists: boolean;
        status?: string;
    };
    destroy(input: {
        projectDirectory: string;
        resourceId: string;
        environment: Record<string, string>;
    }): void;
};
type StageStatus = {
    stage: string;
    state: StageState | null;
    providerExists?: boolean;
    providerStatus?: string;
};

declare function validateStageName(stage: string): string;
declare function stageResourceId(projectDirectory: string, projectName: string, stage: string): string;
declare function createOrUpdateStage(input: {
    projectDirectory: string;
    stage: string;
    production?: boolean;
}): StageState;
declare function inspectStage(projectDirectoryInput: string, stageInput: string): StageStatus;
declare function destroyStage(input: {
    projectDirectory: string;
    stage: string;
    production?: boolean;
}): void;

export { AUDIT_SEVERITIES, type AuditFinding, type AuditReport, type AuditSeverity, type AuditSuppression, type CapabilitySelection, type ChangelogEntry, type ClientTarget, type CreateChangelogInput, type CreateDeploymentInput, type CreateLaunchInput, type Deployment, type DesiredStage, type DriftEntry, type DriftKind, type ExtensionEnvironmentVariable, type ExtensionFile, type ExtensionKind, type ExtensionManifest, type ExtensionPlan, FIRST_PARTY_EXTENSIONS, type FileMutation, type GenerateProjectOptions, type InstalledExtensionState, type JsonPrimitive, type JsonValue, type Launch, LaunchStackClient, type LaunchStackConfig, LaunchStackError, type LifecycleAction, type LifecyclePlan, MANIFEST_FILENAME, MANIFEST_SCHEMA_URL, MANIFEST_SCHEMA_VERSION, type ManagedFileState, type ModuleGenerationPlan, type OpenApiDocument, type OpenApiOperation, type OpenApiParameter, type OpenApiSchema, type ParsedOperation, type PlannedDelete, type PlannedWrite, type PreparedExtensionPlan, type ProjectManifest, type ProjectState, type ProjectTemplate, type ReconciliationPlan, type ResourceField, type ResourceFieldType, STATE_DIRECTORY, STATE_FILENAME, STATE_SCHEMA_VERSION, type StageCreateInput, type StageCreateResult, type StageProviderAdapter, type StageState, type StageStatus, type TemplateFile, type TemplateName, type UpgradePlan, V3_TEMPLATE_VERSION, applyExtensionInstall, applyModuleGeneration, applyReconciliation, applyUpgrade, collectOperations, copyDirectory, createOrUpdateStage, createProjectManifest, destroyStage, detectManagedDrift, emptyProjectState, ensureDestinationAvailable, generateProject, generateTypeScriptClient, getPackageRoot, getTemplateDirectory, hashFile, inspectStage, installDependencies, listFirstPartyExtensions, loadOpenApiSource, loadProjectManifest, loadProjectState, parseFieldSpec, parseOpenApiDocument, parseProjectManifest, parseProjectState, planExtensionInstall, planModuleGeneration, planReconciliation, planUpgrade, projectHasManifest, projectManifestSchema, projectStateSchema, renderDirectory, renderTemplate, requestBodySchema, resolveExtensionOrder, responseSchema, runProductionAudit, schemaToType, serializeProjectManifest, serializeProjectState, severityRank, sha256, stageResourceId, toDisplayName, validateProjectName, validateStageName };
