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
declare function copyDirectory(sourceDirectory: string, destinationDirectory: string): void;

declare function installDependencies(projectDirectory: string): void;

declare function validateProjectName(projectName: string): void;
declare function toDisplayName(projectName: string): string;

declare function getPackageRoot(): string;
declare function getTemplateDirectory(templateName: string): string;

type TemplateVariables = Record<string, string>;
declare function renderTemplate(content: string, variables: TemplateVariables): string;
declare function renderDirectory(directory: string, variables: TemplateVariables): void;

export { type ChangelogEntry, type CreateChangelogInput, type CreateDeploymentInput, type CreateLaunchInput, type Deployment, type GenerateProjectOptions, type Launch, LaunchStackClient, type LaunchStackConfig, LaunchStackError, type ProjectTemplate, type TemplateFile, type TemplateName, copyDirectory, ensureDestinationAvailable, generateProject, getPackageRoot, getTemplateDirectory, installDependencies, renderDirectory, renderTemplate, toDisplayName, validateProjectName };
