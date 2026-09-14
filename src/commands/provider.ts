import { Command } from "commander";
import { readConfig, writeConfig } from "../config";
import {
  isProviderId,
  providerHelpText,
  PROVIDERS
} from "../providers";

export const providerCommand = new Command("provider")
  .description("View or update the LaunchStack deployment provider")
  .argument("[provider]", providerHelpText())
  .action((provider?: string) => {
    try {
      const config = readConfig();

      if (!provider) {
        const definition = PROVIDERS[config.provider];
        console.log(`Current provider: ${definition.label} (${definition.id})`);
        console.log(
          definition.remoteDeploymentSupported
            ? "Remote deployment is supported by LaunchStack."
            : "LaunchStack currently prepares artifacts/presets for this provider; it does not perform the remote deployment."
        );
        return;
      }

      if (!isProviderId(provider)) {
        console.log(`Invalid provider. Use ${providerHelpText()}.`);
        process.exitCode = 1;
        return;
      }

      config.provider = provider;
      writeConfig(config);

      console.log(`Provider updated to ${PROVIDERS[provider].label}`);
    } catch (error) {
      console.log("Could not update provider");

      if (error instanceof Error) {
        console.log(error.message);
      }

      process.exitCode = 1;
    }
  });
