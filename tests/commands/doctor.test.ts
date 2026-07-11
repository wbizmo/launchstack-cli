import {
  describe,
  expect,
  it
} from "vitest";
import { doctorCommand } from "../../src/commands/doctor";

describe("doctor command", () => {
  it("uses the expected command name", () => {
    expect(doctorCommand.name()).toBe("doctor");
  });

  it("supports JSON output", () => {
    const flags = doctorCommand.options.map(
      (option) => option.flags
    );

    expect(flags).toContain("--json");
  });
});
