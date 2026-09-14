import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type DockerAssetOptions = {
  buildCommand: string;
  outputDirectory: string;
  hasLockfile: boolean;
  prisma: boolean;
  startCommand?: readonly string[];
  port?: number;
};

function packageInstallCommand(
  hasLockfile: boolean,
  productionOnly = false
): string {
  if (hasLockfile) {
    return productionOnly ? "npm ci --omit=dev" : "npm ci";
  }

  return productionOnly ? "npm install --omit=dev" : "npm install";
}

function dockerJsonCommand(command: readonly string[]): string {
  return JSON.stringify(command);
}

export function renderDockerfile(options: DockerAssetOptions): string {
  const install = packageInstallCommand(options.hasLockfile);
  const productionInstall = packageInstallCommand(options.hasLockfile, true);
  const startCommand = options.startCommand ?? ["npm", "start"];
  const port = options.port ?? 3000;
  const packageFiles = options.hasLockfile
    ? "COPY package.json package-lock.json ./"
    : "COPY package.json ./";
  const prismaCopy = options.prisma ? "COPY prisma ./prisma\n" : "";
  const prismaRuntimeCopy = options.prisma
    ? "COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma\nCOPY --from=build /app/node_modules/@prisma ./node_modules/@prisma\n"
    : "";

  return `FROM node:20-alpine AS dependencies

WORKDIR /app

${packageFiles}
${prismaCopy}
RUN ${install}

FROM node:20-alpine AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN ${options.buildCommand}

FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

${packageFiles}
${prismaCopy}
RUN ${productionInstall} && npm cache clean --force

COPY --from=build /app/${options.outputDirectory} ./${options.outputDirectory}
${prismaRuntimeCopy}
USER node

EXPOSE ${port}

CMD ${dockerJsonCommand(startCommand)}
`;
}

export function renderDockerIgnore(): string {
  return `node_modules
dist
.git
.env
.env.*
!.env.example
.launchstack
coverage
npm-debug.log
`;
}

export function writeCanonicalDockerAssets(
  projectDirectory: string,
  options: Omit<DockerAssetOptions, "hasLockfile" | "prisma"> & {
    hasLockfile?: boolean;
    prisma?: boolean;
  }
): void {
  const hasLockfile = options.hasLockfile ?? existsSync(join(projectDirectory, "package-lock.json"));
  const prisma = options.prisma ?? existsSync(join(projectDirectory, "prisma", "schema.prisma"));

  writeFileSync(
    join(projectDirectory, "Dockerfile"),
    renderDockerfile({
      ...options,
      hasLockfile,
      prisma
    })
  );
  writeFileSync(
    join(projectDirectory, ".dockerignore"),
    renderDockerIgnore()
  );
}
