import {
  describe,
  expect,
  it
} from "vitest";
import {
  TEMPLATE_FEATURES,
  TEMPLATE_VERSION
} from "../../src/release/template-manifest";

describe("template manifest", () => {
  it("uses the v2 template version", () => {
    expect(TEMPLATE_VERSION).toBe("2.0.0");
  });

  it("lists the major generated features", () => {
    expect(TEMPLATE_FEATURES).toContain("Fastify");
    expect(TEMPLATE_FEATURES).toContain("Prisma");
    expect(TEMPLATE_FEATURES).toContain("Zod validation");
    expect(TEMPLATE_FEATURES).toContain("Docker");
  });
});
