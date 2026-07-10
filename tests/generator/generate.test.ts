import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateProject } from "../../src/generator/generate";

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(
    join(tmpdir(), "launchstack-generator-")
  );

  temporaryDirectories.push(directory);

  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {
      recursive: true,
      force: true
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
      template: "api"
    });

    expect(existsSync(join(destination, "package.json"))).toBe(true);
    expect(existsSync(join(destination, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(destination, ".gitignore"))).toBe(true);
    expect(existsSync(join(destination, ".env.example"))).toBe(true);
    expect(existsSync(join(destination, "src", "server.ts"))).toBe(true);

    const packageJson = JSON.parse(
      readFileSync(join(destination, "package.json"), "utf8")
    ) as {
      name: string;
      description: string;
    };

    expect(packageJson.name).toBe("example-api");
    expect(packageJson.description).toContain("Example Api");

    const serverFile = readFileSync(
      join(destination, "src", "server.ts"),
      "utf8"
    );

    expect(serverFile).toContain("Example Api");
    expect(serverFile).not.toContain("{{PROJECT_DISPLAY_NAME}}");
  });

  it("refuses to overwrite a non-empty directory without force", () => {
    const temporaryRoot = createTemporaryDirectory();

    generateProject({
      projectName: "first-api",
      destinationDirectory: temporaryRoot,
      template: "api"
    });

    expect(() =>
      generateProject({
        projectName: "second-api",
        destinationDirectory: temporaryRoot,
        template: "api"
      })
    ).toThrow("Destination is not empty");
  });
});
