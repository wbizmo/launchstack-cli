export type LaunchStackConfig = {
  apiKey: string;
  baseUrl?: string;
};

export type Launch = {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "live" | "archived";
  environment: string;
  createdAt: string;
};

export type CreateLaunchInput = {
  name: string;
  environment: string;
  scheduledAt?: string;
};

export type Deployment = {
  id: string;
  launchId: string;
  version: string;
  status: "pending" | "success" | "failed";
  createdAt: string;
};

export type CreateDeploymentInput = {
  launchId: string;
  version: string;
  notes?: string;
};

export type ChangelogEntry = {
  id: string;
  title: string;
  body: string;
  version: string;
  createdAt: string;
};

export type CreateChangelogInput = {
  title: string;
  body: string;
  version: string;
};