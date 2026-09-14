import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  renderDirectory,
  renderTemplate
} from "../../src/generator/template";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("template renderer", () => {
  it("replaces known template variables in a single token pass", () => {
    const result = renderTemplate(
      "Welcome to {{PROJECT_DISPLAY_NAME}} ({{PROJECT_NAME}})",
      {
        PROJECT_NAME: "my-api",
        PROJECT_DISPLAY_NAME: "My Api"
      }
    );

    expect(result).toBe("Welcome to My Api (my-api)");
  });

  it("leaves unknown variables unchanged", () => {
    expect(renderTemplate("{{UNKNOWN}}", {})).toBe("{{UNKNOWN}}");
  });

  it("does not decode or rewrite binary-looking assets", () => {
    const directory = mkdtempSync(join(tmpdir(), "launchstack-template-"));
    directories.push(directory);
    const asset = join(directory, "logo.png");
    const original = Buffer.from([0, 255, 123, 123, 80, 82, 79, 74, 69, 67, 84, 95, 78, 65, 77, 69, 125, 125]);
    writeFileSync(asset, original);

    renderDirectory(directory, { PROJECT_NAME: "changed" });

    expect(readFileSync(asset)).toEqual(original);
  });
});
