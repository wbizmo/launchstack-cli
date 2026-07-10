import {
  existsSync,
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

const templateRoot =
  resolve(
    process.cwd(),
    "src",
    "templates",
    "api"
  );

describe("enterprise architecture template", () => {
  it("contains core application layers", () => {
    const requiredFiles = [
      "src/core/errors/application-error.ts",
      "src/core/errors/error-codes.ts",
      "src/core/http/api-response.ts",
      "src/core/types/pagination.ts",
      "src/modules/auth/auth.controller.ts",
      "src/modules/auth/auth.repository.ts",
      "src/modules/auth/auth.service.ts",
      "src/modules/users/user.controller.ts",
      "src/modules/users/user.dto.ts",
      "src/modules/users/user.repository.ts",
      "src/modules/users/user.service.ts",
      "tests/architecture.test.ts"
    ];

    for (
      const file of requiredFiles
    ) {
      expect(
        existsSync(
          resolve(
            templateRoot,
            file
          )
        ),
        `Missing architecture file: ${file}`
      ).toBe(true);
    }
  });

  it("routes delegate to controllers", () => {
    const source =
      readFileSync(
        resolve(
          templateRoot,
          "src/modules/auth/auth.routes.ts"
        ),
        "utf8"
      );

    expect(source).toContain(
      "registerController"
    );

    expect(source).toContain(
      "loginController"
    );

    expect(source).toContain(
      "getCurrentUserController"
    );
  });

  it("services use repositories", () => {
    const authService =
      readFileSync(
        resolve(
          templateRoot,
          "src/modules/auth/auth.service.ts"
        ),
        "utf8"
      );

    const userService =
      readFileSync(
        resolve(
          templateRoot,
          "src/modules/users/user.service.ts"
        ),
        "utf8"
      );

    expect(authService).toContain(
      "AuthRepository"
    );

    expect(userService).toContain(
      "UserRepository"
    );
  });

  it("uses structured application errors", () => {
    const source =
      readFileSync(
        resolve(
          templateRoot,
          "src/plugins/error-handler.ts"
        ),
        "utf8"
      );

    expect(source).toContain(
      "ApplicationError"
    );

    expect(source).toContain(
      "ErrorCode"
    );
  });
});
