import { describe, expect, it } from "vitest";
import { renderTemplate } from "../../src/generator/template";

describe("template renderer", () => {
  it("replaces template variables", () => {
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
});
