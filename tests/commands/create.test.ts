import { describe, expect, it } from "vitest";
import { createCommand } from "../../src/commands/create";

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
    const optionFlags = createCommand.options.map(
      (option) => option.flags
    );

    expect(optionFlags).toContain("--no-install");
  });
});
