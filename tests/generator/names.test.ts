import { describe, expect, it } from "vitest";
import {
  toDisplayName,
  validateProjectName
} from "../../src/generator/names";

describe("project naming utilities", () => {
  it("accepts valid package-style project names", () => {
    expect(() => validateProjectName("my-api")).not.toThrow();
    expect(() => validateProjectName("api2")).not.toThrow();
  });

  it("rejects invalid project names", () => {
    expect(() => validateProjectName("My API")).toThrow();
    expect(() => validateProjectName("my_api")).toThrow();
    expect(() => validateProjectName("")).toThrow();
  });

  it("creates a display name", () => {
    expect(toDisplayName("my-api")).toBe("My Api");
  });
});
