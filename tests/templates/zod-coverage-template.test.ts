import {
  existsSync,
  readFileSync
} from "node:fs";
import { resolve } from "node:path";
import {
  describe,
  expect,
  it
} from "vitest";

const templateRoot = resolve(
  process.cwd(),
  "src",
  "templates",
  "api"
);

describe("Zod validation coverage", () => {
  it("ships generated-project validation tests", () => {
    const requiredFiles = [
      "tests/validation.test.ts",
      "tests/openapi-validation.test.ts"
    ];

    for (const file of requiredFiles) {
      expect(
        existsSync(resolve(templateRoot, file)),
        `Missing validation test file: ${file}`
      ).toBe(true);
    }
  });

  it("derives request types from Zod schemas", () => {
    const typesSource = readFileSync(
      resolve(
        templateRoot,
        "src/modules/auth/auth.types.ts"
      ),
      "utf8"
    );

    expect(typesSource).toContain("z.infer");
    expect(typesSource).toContain("registerBodySchema");
    expect(typesSource).toContain("loginBodySchema");
    expect(typesSource).toContain("refreshBodySchema");
  });

  it("uses Zod for both request and response schemas", () => {
    const authSchemaSource = readFileSync(
      resolve(
        templateRoot,
        "src/modules/auth/auth.schemas.ts"
      ),
      "utf8"
    );

    expect(authSchemaSource).toContain(
      "body: registerBodySchema"
    );

    expect(authSchemaSource).toContain(
      "201: authResponseSchema"
    );

    expect(authSchemaSource).toContain(
      "200: tokenPairSchema"
    );
  });

  it("keeps deprecated schema plugin removed", () => {
    expect(
      existsSync(
        resolve(
          templateRoot,
          "src/plugins/schemas.ts"
        )
      )
    ).toBe(false);
  });
});
