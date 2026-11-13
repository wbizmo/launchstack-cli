import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type DockerAssetOptions = {
  buildCommand: string;
  outputDirectory: string;
  hasLockfile: boolean;
  prisma: boolean;
  healthcheck?: boolean;
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
  const productionPackageFiles = options.hasLockfile
    ? "COPY --chown=node:node package.json package-lock.json ./"
    : "COPY --chown=node:node package.json ./";
  const prismaCopy = options.prisma ? "COPY prisma ./prisma\n" : "";
  const prismaRuntimeCopy = options.prisma
    ? "COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma\nCOPY --from=build /app/node_modules/@prisma ./node_modules/@prisma\n"
    : "";
  const healthcheckCopy = options.healthcheck
    ? "COPY --chown=node:node scripts/healthcheck.cjs ./scripts/healthcheck.cjs\n"
    : "";
  const healthcheckDirective = options.healthcheck
    ? `HEALTHCHECK --interval=10s --timeout=5s --retries=10 CMD ["node","scripts/healthcheck.cjs"]\n`
    : "";

  return `# syntax=docker/dockerfile:1.7
FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS dependencies

WORKDIR /app

${packageFiles}
${prismaCopy}
RUN --mount=type=secret,id=npmca,required=false if [ -f /run/secrets/npmca ]; then NODE_EXTRA_CA_CERTS=/run/secrets/npmca ${install}; else ${install}; fi

FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN ${options.buildCommand}

FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS production

ENV NODE_ENV=production

WORKDIR /app

${productionPackageFiles}
${prismaCopy}
RUN --mount=type=secret,id=npmca,required=false if [ -f /run/secrets/npmca ]; then NODE_EXTRA_CA_CERTS=/run/secrets/npmca ${productionInstall}; else ${productionInstall}; fi && npm cache clean --force

COPY --from=build /app/${options.outputDirectory} ./${options.outputDirectory}
${prismaRuntimeCopy}
${healthcheckCopy}
USER node

EXPOSE ${port}
${healthcheckDirective}

CMD ${dockerJsonCommand(startCommand)}
`;
}

export function renderDockerIgnore(): string {
  return `node_modules
dist
coverage
.git
.github
.env
.env.*
!.env.example
.launchstack
*.log
npm-debug.log*
docker-compose*.yml
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
  const healthcheck = existsSync(join(projectDirectory, "scripts", "healthcheck.cjs"));

  writeFileSync(
    join(projectDirectory, "Dockerfile"),
    renderDockerfile({
      ...options,
      hasLockfile,
      prisma,
      healthcheck
    })
  );
  writeFileSync(
    join(projectDirectory, ".dockerignore"),
    renderDockerIgnore()
  );
}
