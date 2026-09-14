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
      startCommand: ["node", "dist/server.js"],
      port: 3000
    });

    expect(dockerfile).toContain("FROM node:20-alpine AS dependencies");
    expect(dockerfile).toContain("FROM node:20-alpine AS build");
    expect(dockerfile).toContain("FROM node:20-alpine AS production");
    expect(dockerfile).toContain("RUN npm ci\n");
    expect(dockerfile).toContain("RUN npm ci --omit=dev && npm cache clean --force");
    expect(dockerfile).toContain("COPY prisma ./prisma");
    expect(dockerfile).toContain("COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma");
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

    expect(dockerfile).toContain("RUN npm install\n");
    expect(dockerfile).toContain("RUN npm install --omit=dev && npm cache clean --force");
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
