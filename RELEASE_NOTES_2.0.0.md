# LaunchStack CLI v2.0.0

Release date: 2026-07-11

Version 2.0 expanded LaunchStack from deployment workflow tooling into a backend API scaffolder while retaining the v1 project and deployment commands.

## Highlights

- Add `launchstack create <project-name>` and a Fastify/TypeScript API starter.
- Add Prisma and PostgreSQL integration, JWT access and refresh-token authentication, secure refresh-token rotation, bcrypt password hashing, and Zod request/response validation.
- Generate layered controllers, services, repositories and DTOs, structured errors, Swagger documentation, health checks and readiness endpoints.
- Add Docker/Compose support, GitHub Actions CI and Docker workflows, and Render, Railway and Fly.io deployment presets.
- Add the `launchstack doctor` project-health command and generated architecture, deployment, README and changelog documentation.
- Retain project configuration, environment switching, providers, deployments, history, rollback lookup, local secrets, Docker scaffolding and GitHub Actions generation.

## Generated project workflow

```bash
launchstack create my-api
cd my-api
npm install
npm run db:up
npm run prisma:migrate -- --name init
npm run dev
```

Swagger UI is available at `http://localhost:3000/docs`.

## Verification recorded for this release

The published release description records unit and template tests, TypeScript build, packed-package inspection and installation, fresh project generation, generated-project typecheck/tests/build, Docker and PostgreSQL validation, authentication and refresh-token flows, and documentation/package-content audits.

## Requirements and install

- Node.js 20 or newer
- PostgreSQL or Docker for database-backed development

```bash
npm install --global launchstack-cli@2.0.0
```
