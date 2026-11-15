import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createCommand,
  resolveCreateDestination,
} from "../../src/commands/create";

describe("create command", () => {
  it("is registered with the expected name", () => {
    expect(createCommand.name()).toBe("create");
  });

  it("requires a project name argument", () => {
    const argumentsList = createCommand.registeredArguments;

    expect(argumentsList).toHaveLength(1);
    expect(argumentsList[0]?.required).toBe(true);
  });

  it("supports skipping dependency installation", () => {
    const optionFlags = createCommand.options.map((option) => option.flags);

    expect(optionFlags).toContain("--no-install");
  });

  it("creates the named project inside the selected parent directory", () => {
    expect(resolveCreateDestination("my-api", "/tmp/projects", "/work")).toBe(
      join(resolve("/tmp/projects"), "my-api"),
    );
    expect(resolveCreateDestination("my-api", undefined, "/work")).toBe(
      join(resolve("/work"), "my-api"),
    );
  });

  it("offers verbose generation progress", () => {
    const optionFlags = createCommand.options.map((option) => option.flags);
    expect(optionFlags).toContain("--verbose");
  });
});
