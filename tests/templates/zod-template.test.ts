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

describe("Zod validation template", () => {
  it("declares Zod dependencies", () => {
    const packageJson = JSON.parse(
      readFileSync(
        resolve(templateRoot, "package.json"),
        "utf8"
      )
    ) as {
      dependencies: Record<string, string>;
    };

    expect(
      packageJson.dependencies.zod
    ).toBeDefined();

    expect(
      packageJson.dependencies[
        "fastify-type-provider-zod"
      ]
    ).toBeDefined();
  });

  it("configures the Zod type provider", () => {
    const appSource = readFileSync(
      resolve(templateRoot, "src/app.ts"),
      "utf8"
    );

    expect(appSource).toContain(
      "withTypeProvider<ZodTypeProvider>()"
    );

    expect(appSource).toContain(
      "setValidatorCompiler"
    );

    expect(appSource).toContain(
      "setSerializerCompiler"
    );
  });

  it("uses Zod route schemas", () => {
    const authSchemas = readFileSync(
      resolve(
        templateRoot,
        "src/modules/auth/auth.schemas.ts"
      ),
      "utf8"
    );

    expect(authSchemas).toContain("z.object");
    expect(authSchemas).toContain("registerBodySchema");
    expect(authSchemas).toContain("loginBodySchema");
  });

  it("keeps Swagger compatible with Zod", () => {
    const swaggerSource = readFileSync(
      resolve(templateRoot, "src/plugins/swagger.ts"),
      "utf8"
    );

    expect(swaggerSource).toContain("jsonSchemaTransform");
    expect(swaggerSource).toContain(
      "jsonSchemaTransformObject"
    );
  });

  it("does not register raw Zod schemas with addSchema", () => {
    const pluginIndex = readFileSync(
      resolve(templateRoot, "src/plugins/index.ts"),
      "utf8"
    );

    expect(pluginIndex).not.toContain("schemasPlugin");
    expect(
      existsSync(
        resolve(templateRoot, "src/plugins/schemas.ts")
      )
    ).toBe(false);
  });
});
