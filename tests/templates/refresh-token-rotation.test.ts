import {
  readFileSync
} from "node:fs";
import {
  resolve
} from "node:path";
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

describe("refresh-token rotation", () => {
  it("adds a unique JWT ID to every refresh token", () => {
    const service = readFileSync(
      resolve(
        templateRoot,
        "src/modules/auth/auth.service.ts"
      ),
      "utf8"
    );

    expect(service).toContain(
      "randomUUID"
    );

    expect(service).toMatch(
      /jti:\s*randomUUID\(\)/
    );
  });

  it("declares the refresh-token JWT ID", () => {
    const types = readFileSync(
      resolve(
        templateRoot,
        "src/modules/auth/auth.types.ts"
      ),
      "utf8"
    );

    expect(types).toMatch(
      /jti:\s*string/
    );
  });
});
