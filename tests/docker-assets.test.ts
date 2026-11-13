import { describe, expect, it } from "vitest";
import {
  renderDockerfile,
  renderDockerIgnore
} from "../src/docker-assets";

describe("canonical Docker assets", () => {
  it("renders a deterministic hardened lockfile-based image", () => {
    const dockerfile = renderDockerfile({
      buildCommand: "npm run build",
      outputDirectory: "dist",
      hasLockfile: true,
      prisma: true,
      healthcheck: true,
      startCommand: ["node", "dist/server.js"],
      port: 3000
    });

    expect(dockerfile).toContain("FROM node:24.22.3-alpine@sha256:");
    expect(dockerfile.match(/AS dependencies|AS build|AS production/g)).toHaveLength(3);
    expect(dockerfile).toContain("npm ci; else npm ci; fi");
    expect(dockerfile).toContain("npm ci --omit=dev; else npm ci --omit=dev; fi");
    expect(dockerfile).toContain("COPY prisma ./prisma");
    expect(dockerfile).toContain("COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma");
    expect(dockerfile).toContain("COPY --chown=node:node scripts/healthcheck.cjs ./scripts/healthcheck.cjs");
    expect(dockerfile).toContain("COPY --chown=node:node package.json package-lock.json ./");
    expect(dockerfile).toContain("HEALTHCHECK --interval=10s --timeout=5s --retries=10 CMD");
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).toContain("CMD [\"node\",\"dist/server.js\"]");
  });

  it("falls back to npm install only when no lockfile exists", () => {
    const dockerfile = renderDockerfile({
      buildCommand: "npm run build",
      outputDirectory: "build",
      hasLockfile: false,
      prisma: false
    });

    expect(dockerfile).toContain("npm install; else npm install; fi");
    expect(dockerfile).toContain("npm install --omit=dev; else npm install --omit=dev; fi");
    expect(dockerfile).not.toContain("package-lock.json");
    expect(dockerfile).not.toContain("COPY prisma ./prisma");
    expect(dockerfile).toContain("USER node");
  });

  it("keeps local secrets and LaunchStack state out of Docker build contexts", () => {
    const dockerIgnore = renderDockerIgnore();

    expect(dockerIgnore).toContain(".env\n");
    expect(dockerIgnore).toContain(".env.*\n");
    expect(dockerIgnore).toContain("!.env.example\n");
    expect(dockerIgnore).toContain(".launchstack\n");
  });
});
