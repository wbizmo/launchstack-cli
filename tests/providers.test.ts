import { describe, expect, it } from "vitest";
import {
  isProviderId,
  PROVIDER_IDS,
  PROVIDERS
} from "../src/providers";

import { launchStackConfigSchema } from "../src/config";

describe("provider registry", () => {
  it("uses one provider set that includes Fly.io", () => {
    expect(PROVIDER_IDS).toContain("fly");
    expect(isProviderId("fly")).toBe(true);
    expect(PROVIDERS.fly.hasGeneratedPreset).toBe(true);
  });

  it("allows Fly.io in project configuration", () => {
    const parsed = launchStackConfigSchema.parse({
      appName: "example",
      environment: "production",
      provider: "fly",
      buildCommand: "npm run build",
      outputDirectory: "dist",
      deployTarget: "https://example.com"
    });

    expect(parsed.provider).toBe("fly");
  });
});
