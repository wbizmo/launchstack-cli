import {
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

describe("generated project stability", () => {
  it("uses NodeNext module resolution", () => {
    const config = JSON.parse(
      readFileSync(
        resolve(templateRoot, "tsconfig.json"),
        "utf8"
      )
    ) as {
      compilerOptions: {
        module: string;
        moduleResolution: string;
        strict: boolean;
      };
    };

    expect(config.compilerOptions.module).toBe(
      "NodeNext"
    );

    expect(
      config.compilerOptions.moduleResolution
    ).toBe("NodeNext");

    expect(config.compilerOptions.strict).toBe(true);
  });

  it("does not use deprecated request logging config", () => {
    const appSource = readFileSync(
      resolve(templateRoot, "src/app.ts"),
      "utf8"
    );

    expect(appSource).not.toContain(
      "disableRequestLogging"
    );
  });

  it("pins matching Prisma versions", () => {
    const packageJson = JSON.parse(
      readFileSync(
        resolve(templateRoot, "package.json"),
        "utf8"
      )
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(
      packageJson.dependencies["@prisma/client"]
    ).toBe(
      packageJson.devDependencies.prisma
    );
  });

  it("provides a complete quality command", () => {
    const packageJson = JSON.parse(
      readFileSync(
        resolve(templateRoot, "package.json"),
        "utf8"
      )
    ) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.check).toBeDefined();
  });
});
