import { Command } from "commander";
import { readConfig, writeConfig } from "../config";

const allowedProviders = ["vercel", "netlify", "render", "railway", "docker", "custom"] as const;

export const providerCommand = new Command("provider")
  .description("View or update the LaunchStack deployment provider")
  .argument("[provider]", "vercel, netlify, render, railway, docker, or custom")
  .action((provider?: string) => {
    try {
      const config = readConfig();

      if (!provider) {
        console.log(`Current provider: ${config.provider}`);
        return;
      }

      if (!allowedProviders.includes(provider as typeof allowedProviders[number])) {
        console.log("Invalid provider. Use vercel, netlify, render, railway, docker, or custom.");
        process.exit(1);
      }

      config.provider = provider as typeof allowedProviders[number];
      writeConfig(config);

      console.log(`Provider updated to ${config.provider}`);
    } catch (error) {
      console.log("Could not update provider");

      if (error instanceof Error) {
        console.log(error.message);
      }

      process.exit(1);
    }
  });