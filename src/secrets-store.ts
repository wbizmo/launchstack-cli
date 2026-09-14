import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { atomicWriteText, readJsonFile } from "./storage";

const STORE_DIR = ".launchstack";
const SECRETS_FILE = "secrets.json";
const SECRET_MODE = 0o600;
const RESERVED_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype"
]);

export type SecretStore = Record<string, string>;

export function getSecretsPath(
  projectDirectory = process.cwd()
): string {
  return resolve(
    projectDirectory,
    STORE_DIR,
    SECRETS_FILE
  );
}

export function validateSecretKey(key: string): string {
  const normalized = key.trim();

  if (
    !/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(normalized) ||
    RESERVED_KEYS.has(normalized)
  ) {
    throw new Error(
      "Secret keys must start with a letter or underscore, contain only letters, numbers, underscores, dots, or hyphens, and must not use reserved object keys."
    );
  }

  return normalized;
}

export function readSecrets(
  projectDirectory = process.cwd()
): SecretStore {
  const path = getSecretsPath(projectDirectory);
  const parsed = readJsonFile<unknown>(path, {});

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error("secrets.json must contain a JSON object.");
  }

  const secrets = Object.create(null) as SecretStore;

  for (const [key, value] of Object.entries(parsed)) {
    validateSecretKey(key);

    if (typeof value !== "string") {
      throw new Error("secrets.json contains a non-string secret value.");
    }

    secrets[key] = value;
  }

  return secrets;
}

export function writeSecrets(
  secrets: SecretStore,
  projectDirectory = process.cwd()
): void {
  const storeDirectory = resolve(projectDirectory, STORE_DIR);
  mkdirSync(storeDirectory, { recursive: true });

  atomicWriteText(
    getSecretsPath(projectDirectory),
    `${JSON.stringify(secrets, null, 2)}\n`,
    SECRET_MODE
  );
}

export function setSecret(
  key: string,
  value: string,
  projectDirectory = process.cwd()
): void {
  const normalizedKey = validateSecretKey(key);

  if (value.length === 0) {
    throw new Error("Secret value must not be empty.");
  }

  const secrets = readSecrets(projectDirectory);
  secrets[normalizedKey] = value;
  writeSecrets(secrets, projectDirectory);
}

export function removeSecret(
  key: string,
  projectDirectory = process.cwd()
): boolean {
  const normalizedKey = validateSecretKey(key);
  const secrets = readSecrets(projectDirectory);

  if (!(normalizedKey in secrets)) {
    return false;
  }

  delete secrets[normalizedKey];
  writeSecrets(secrets, projectDirectory);
  return true;
}

export function secretStoreExists(
  projectDirectory = process.cwd()
): boolean {
  return existsSync(getSecretsPath(projectDirectory));
}
