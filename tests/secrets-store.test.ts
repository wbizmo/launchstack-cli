import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getSecretsPath,
  readSecrets,
  setSecret,
  validateSecretKey
} from "../src/secrets-store";

const directories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "launchstack-secrets-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("secret store", () => {
  it("rejects prototype-polluting and malformed keys", () => {
    expect(() => validateSecretKey("__proto__")).toThrow();
    expect(() => validateSecretKey("bad key")).toThrow();
    expect(validateSecretKey("API_KEY.production")).toBe("API_KEY.production");
  });

  it("writes secrets without exposing them through permissive file modes", () => {
    const directory = temporaryDirectory();
    setSecret("API_KEY", "super-secret", directory);

    expect(readSecrets(directory).API_KEY).toBe("super-secret");

    if (process.platform !== "win32") {
      expect(statSync(getSecretsPath(directory)).mode & 0o777).toBe(0o600);
    }
  });

  it("fails closed for malformed secret JSON", () => {
    const directory = temporaryDirectory();
    const storeDirectory = join(directory, ".launchstack");
    mkdirSync(storeDirectory, { recursive: true });
    writeFileSync(join(storeDirectory, "secrets.json"), "{not-json");
    chmodSync(join(storeDirectory, "secrets.json"), 0o600);

    expect(() => readSecrets(directory)).toThrow("Invalid JSON");
    expect(readFileSync(join(storeDirectory, "secrets.json"), "utf8")).toBe("{not-json");
  });
});
