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

describe("refresh-token implementation", () => {
  it("uses the Fastify JWT instance with an explicit refresh key", () => {
    const service = readFileSync(
      resolve(
        templateRoot,
        "src/modules/auth/auth.service.ts"
      ),
      "utf8"
    );

    expect(service).toContain(
      "app.jwt.sign"
    );

    expect(service).toContain(
      "this.app.jwt.verify"
    );

    expect(service).toContain(
      "app.config.jwtRefreshSecret"
    );

    expect(service).toContain(
      "this.app.config.jwtRefreshSecret"
    );

    expect(service).not.toContain(
      "app.refreshJwt"
    );
  });

  it("does not register an invalid refreshJwt namespace API", () => {
    const plugin = readFileSync(
      resolve(
        templateRoot,
        "src/plugins/auth.ts"
      ),
      "utf8"
    );

    expect(plugin).not.toContain(
      'namespace: "refreshJwt"'
    );
  });
});
