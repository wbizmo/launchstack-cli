import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";

const STORE_DIR = ".launchstack";
const SECRETS_FILE = "secrets.json";

type SecretStore = Record<string, string>;

function getStorePath() {
  return resolve(process.cwd(), STORE_DIR);
}

function getSecretsPath() {
  return resolve(getStorePath(), SECRETS_FILE);
}

function ensureStore() {
  if (!existsSync(getStorePath())) {
    mkdirSync(getStorePath(), { recursive: true });
  }
}

function readSecrets(): SecretStore {
  ensureStore();

  if (!existsSync(getSecretsPath())) {
    return {};
  }

  return JSON.parse(readFileSync(getSecretsPath(), "utf-8")) as SecretStore;
}

function writeSecrets(secrets: SecretStore) {
  ensureStore();
  writeFileSync(getSecretsPath(), JSON.stringify(secrets, null, 2));
}

export const secretsCommand = new Command("secrets")
  .description("Manage local LaunchStack secrets");

secretsCommand
  .command("add")
  .description("Add or update a local secret")
  .argument("<key>", "Secret key")
  .argument("<value>", "Secret value")
  .action((key: string, value: string) => {
    const secrets = readSecrets();

    secrets[key] = value;
    writeSecrets(secrets);

    console.log(`Secret saved: ${key}`);
  });

secretsCommand
  .command("list")
  .description("List local secret keys")
  .action(() => {
    const secrets = readSecrets();
    const keys = Object.keys(secrets);

    if (keys.length === 0) {
      console.log("No secrets found");
      return;
    }

    keys.forEach((key) => {
      console.log(`${key}=********`);
    });
  });

secretsCommand
  .command("remove")
  .description("Remove a local secret")
  .argument("<key>", "Secret key")
  .action((key: string) => {
    const secrets = readSecrets();

    if (!secrets[key]) {
      console.log(`Secret not found: ${key}`);
      return;
    }

    delete secrets[key];
    writeSecrets(secrets);

    console.log(`Secret removed: ${key}`);
  });