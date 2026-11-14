import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getSecretsPath,
  readSecrets,
  setSecret,
  validateSecretKey,
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

  it("rejects serialized stores over the read limit without replacing the prior store", () => {
    const directory = temporaryDirectory();
    setSecret("API_KEY", "safe", directory);
    expect(() => setSecret("LARGE", "x".repeat(1_048_576), directory)).toThrow(
      /1 MiB/,
    );
    expect(readSecrets(directory).API_KEY).toBe("safe");
  });

  it("fails closed for malformed secret JSON", () => {
    const directory = temporaryDirectory();
    const storeDirectory = join(directory, ".launchstack");
    mkdirSync(storeDirectory, { recursive: true });
    writeFileSync(join(storeDirectory, "secrets.json"), "{not-json");
    chmodSync(join(storeDirectory, "secrets.json"), 0o600);

    expect(() => readSecrets(directory)).toThrow("Invalid JSON");
    expect(readFileSync(join(storeDirectory, "secrets.json"), "utf8")).toBe(
      "{not-json",
    );
  });

  it("refuses a secrets file symlink", () => {
    if (process.platform === "win32") return;
    const directory = temporaryDirectory();
    const storeDirectory = join(directory, ".launchstack");
    const outside = join(directory, "outside.json");
    mkdirSync(storeDirectory, { recursive: true, mode: 0o700 });
    writeFileSync(outside, '{"API_KEY":"must not be followed"}\n', {
      mode: 0o600,
    });
    symlinkSync(outside, join(storeDirectory, "secrets.json"));

    expect(() => readSecrets(directory)).toThrow(/regular file/i);
  });
});
