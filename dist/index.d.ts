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

export { type ChangelogEntry, type CreateChangelogInput, type CreateDeploymentInput, type CreateLaunchInput, type Deployment, type Launch, LaunchStackClient, type LaunchStackConfig, LaunchStackError };
