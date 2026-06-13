import { LaunchStackError } from "./errors";
import type {
  ChangelogEntry,
  CreateChangelogInput,
  CreateDeploymentInput,
  CreateLaunchInput,
  Deployment,
  Launch,
  LaunchStackConfig,
} from "./types";

export class LaunchStackClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: LaunchStackConfig) {
    if (!config.apiKey) {
      throw new LaunchStackError("LaunchStack API key is required.");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.launchstack.dev/v1";
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new LaunchStackError(
        data?.message || "LaunchStack request failed.",
        response.status,
        data
      );
    }

    return data as T;
  }

  listLaunches(): Promise<Launch[]> {
    return this.request<Launch[]>("/launches");
  }

  getLaunch(id: string): Promise<Launch> {
    return this.request<Launch>(`/launches/${id}`);
  }

  createLaunch(input: CreateLaunchInput): Promise<Launch> {
    return this.request<Launch>("/launches", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listDeployments(): Promise<Deployment[]> {
    return this.request<Deployment[]>("/deployments");
  }

  createDeployment(input: CreateDeploymentInput): Promise<Deployment> {
    return this.request<Deployment>("/deployments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listChangelog(): Promise<ChangelogEntry[]> {
    return this.request<ChangelogEntry[]>("/changelog");
  }

  createChangelog(input: CreateChangelogInput): Promise<ChangelogEntry> {
    return this.request<ChangelogEntry>("/changelog", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}