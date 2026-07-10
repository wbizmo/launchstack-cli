import {
  existsSync,
  readFileSync
} from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const templateRoot = resolve(
  process.cwd(),
  "src",
  "templates",
  "api"
);

describe("Fastify API template", () => {
  it("contains the server application structure", () => {
    const requiredFiles = [
      "src/app.ts",
      "src/server.ts",
      "src/config/env.ts",
      "src/plugins/config.ts",
      "src/plugins/cors.ts",
      "src/plugins/error-handler.ts",
      "src/plugins/index.ts",
      "src/plugins/sensible.ts",
      "src/routes/health.ts",
      "src/routes/index.ts",
      "tests/health.test.ts"
    ];

    for (const file of requiredFiles) {
      expect(
        existsSync(resolve(templateRoot, file)),
        `Missing template file: ${file}`
      ).toBe(true);
    }
  });

  it("declares Fastify runtime dependencies", () => {
    const packageJson = JSON.parse(
      readFileSync(
        resolve(templateRoot, "package.json"),
        "utf8"
      )
    ) as {
      dependencies: Record<string, string>;
    };

    expect(packageJson.dependencies.fastify).toBeDefined();
    expect(
      packageJson.dependencies["@fastify/cors"]
    ).toBeDefined();
    expect(
      packageJson.dependencies["@fastify/sensible"]
    ).toBeDefined();
    expect(
      packageJson.dependencies["fastify-plugin"]
    ).toBeDefined();
  });

  it("contains a health endpoint", () => {
    const healthRoute = readFileSync(
      resolve(templateRoot, "src/routes/health.ts"),
      "utf8"
    );

    expect(healthRoute).toContain('"/health"');
    expect(healthRoute).toContain(
      '"{{PROJECT_NAME}}"'
    );
  });
});
