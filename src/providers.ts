export const PROVIDER_IDS = [
  "vercel",
  "netlify",
  "render",
  "railway",
  "fly",
  "docker",
  "custom"
] as const;

export type ProviderId = typeof PROVIDER_IDS[number];

export type ProviderDefinition = {
  id: ProviderId;
  label: string;
  hasGeneratedPreset: boolean;
  remoteDeploymentSupported: boolean;
};

export const PROVIDERS: Record<
  ProviderId,
  ProviderDefinition
> = {
  vercel: {
    id: "vercel",
    label: "Vercel",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  },
  netlify: {
    id: "netlify",
    label: "Netlify",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  },
  render: {
    id: "render",
    label: "Render",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  railway: {
    id: "railway",
    label: "Railway",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  fly: {
    id: "fly",
    label: "Fly.io",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  docker: {
    id: "docker",
    label: "Docker",
    hasGeneratedPreset: true,
    remoteDeploymentSupported: false
  },
  custom: {
    id: "custom",
    label: "Custom",
    hasGeneratedPreset: false,
    remoteDeploymentSupported: false
  }
};

export function isProviderId(
  value: string
): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

export function providerHelpText(): string {
  return PROVIDER_IDS.join(", ");
}
