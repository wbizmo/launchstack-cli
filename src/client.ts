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

function validateBaseUrl(value: string): URL {
  let url: URL;
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

export class LaunchStackClient {
  private apiKey: string;
  private baseUrl: URL;

  constructor(config: LaunchStackConfig) {
    if (!config.apiKey) {
      throw new LaunchStackError("LaunchStack API key is required.");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = validateBaseUrl(config.baseUrl ?? "https://api.launchstack.dev/v1");
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const normalizedBase = this.baseUrl.toString().endsWith("/")
      ? this.baseUrl.toString()
      : `${this.baseUrl.toString()}/`;
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
        ...options.headers,
      },
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

    return data as T;
  }

  listLaunches(): Promise<Launch[]> {
    return this.request<Launch[]>("/launches");
  }

  getLaunch(id: string): Promise<Launch> {
    return this.request<Launch>(`/launches/${encodeURIComponent(id)}`);
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
