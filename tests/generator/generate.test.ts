import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateProject } from "../../src/generator/generate";

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "launchstack-generator-"));

  temporaryDirectories.push(directory);

  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
});

describe("generateProject", () => {
  it("creates a complete starter project", () => {
    const temporaryRoot = createTemporaryDirectory();
    const destination = join(temporaryRoot, "example-api");

    generateProject({
      projectName: "example-api",
      destinationDirectory: destination,
      template: "api",
    });

    expect(existsSync(join(destination, "package.json"))).toBe(true);
    expect(existsSync(join(destination, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(destination, ".gitignore"))).toBe(true);
    expect(existsSync(join(destination, ".env.example"))).toBe(true);
    expect(existsSync(join(destination, "src", "server.ts"))).toBe(true);

    const packageJson = JSON.parse(
      readFileSync(join(destination, "package.json"), "utf8"),
    ) as {
      name: string;
      description: string;
    };

    expect(packageJson.name).toBe("example-api");
    expect(packageJson.description).toContain("Example Api");

    const serverFile = readFileSync(
      join(destination, "src", "server.ts"),
      "utf8",
    );

    expect(serverFile).toContain("Example Api");
    expect(serverFile).not.toContain("{{PROJECT_DISPLAY_NAME}}");

    const env = readFileSync(join(destination, ".env"), "utf8");
    const accessSecret = /^JWT_ACCESS_SECRET=(.+)$/m.exec(env)?.[1];
    const refreshSecret = /^JWT_REFRESH_SECRET=(.+)$/m.exec(env)?.[1];
    expect(accessSecret).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(refreshSecret).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(env).toContain("HOST=127.0.0.1");
    expect(env).toContain("CORS_ORIGIN=http://localhost:3000");
    if (process.platform !== "win32") {
      expect(statSync(join(destination, ".env")).mode & 0o777).toBe(0o600);
    }
  });

  it("refuses to overwrite a non-empty directory without force", () => {
    const temporaryRoot = createTemporaryDirectory();

    generateProject({
      projectName: "first-api",
      destinationDirectory: temporaryRoot,
      template: "api",
    });

    expect(() =>
      generateProject({
        projectName: "second-api",
        destinationDirectory: temporaryRoot,
        template: "api",
      }),
    ).toThrow("Destination is not empty");
  });

  it("generates unique development JWT secrets per project", () => {
    const temporaryRoot = createTemporaryDirectory();
    const first = join(temporaryRoot, "first-api");
    const second = join(temporaryRoot, "second-api");
    generateProject({
      projectName: "first-api",
      destinationDirectory: first,
      template: "api",
    });
    generateProject({
      projectName: "second-api",
      destinationDirectory: second,
      template: "api",
    });
    const firstEnv = readFileSync(join(first, ".env"), "utf8");
    const secondEnv = readFileSync(join(second, ".env"), "utf8");

    expect(firstEnv).not.toBe(secondEnv);
    expect(/^JWT_ACCESS_SECRET=(.+)$/m.exec(firstEnv)?.[1]).not.toBe(
      /^JWT_ACCESS_SECRET=(.+)$/m.exec(secondEnv)?.[1],
    );
    expect(/^JWT_REFRESH_SECRET=(.+)$/m.exec(firstEnv)?.[1]).not.toBe(
      /^JWT_REFRESH_SECRET=(.+)$/m.exec(secondEnv)?.[1],
    );
  });

  it("preserves unrelated user files when force updates a project", () => {
    const temporaryRoot = createTemporaryDirectory();
    const destination = join(temporaryRoot, "example-api");

    generateProject({
      projectName: "example-api",
      destinationDirectory: destination,
      template: "api",
    });
    writeFileSync(join(destination, "USER_OWNED.txt"), "keep me\n");

    generateProject({
      projectName: "example-api",
      destinationDirectory: destination,
      template: "api",
      overwrite: true,
    });

    expect(readFileSync(join(destination, "USER_OWNED.txt"), "utf8")).toBe(
      "keep me\n",
    );
  });
});
