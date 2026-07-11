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

describe("production template", () => {
  it("contains Docker assets", () => {
    const requiredFiles = [
      "Dockerfile",
      "_dockerignore",
      "docker-compose.yml",
      "docker-compose.production.yml",
      "scripts/healthcheck.cjs",
      "scripts/wait-for-database.cjs"
    ];

    for (const file of requiredFiles) {
      expect(
        existsSync(resolve(templateRoot, file)),
        `Missing production file: ${file}`
      ).toBe(true);
    }
  });

  it("contains CI workflows", () => {
    const requiredFiles = [
      ".github/workflows/ci.yml",
      ".github/workflows/docker.yml"
    ];

    for (const file of requiredFiles) {
      expect(
        existsSync(resolve(templateRoot, file))
      ).toBe(true);
    }
  });

  it("contains deployment presets", () => {
    const requiredFiles = [
      "render.yaml",
      "railway.json",
      "fly.toml"
    ];

    for (const file of requiredFiles) {
      expect(
        existsSync(resolve(templateRoot, file))
      ).toBe(true);
    }
  });

  it("uses a non-root production container", () => {
    const dockerfile = readFileSync(
      resolve(templateRoot, "Dockerfile"),
      "utf8"
    );

    expect(dockerfile).toContain("USER node");
    expect(dockerfile).toContain("npm ci --omit=dev");
  });

  it("registers readiness routing", () => {
    const routes = readFileSync(
      resolve(templateRoot, "src/routes/index.ts"),
      "utf8"
    );

    expect(routes).toContain("readinessRoutes");
  });
});
