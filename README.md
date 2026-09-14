# LaunchStack CLI

Production-ready backend scaffolding and workflow tooling for TypeScript developers.

LaunchStack CLI generates Fastify APIs with TypeScript, Prisma/PostgreSQL, JWT authentication, Zod validation, Swagger/OpenAPI, Docker, CI, deployment presets, testing, and an opinionated layered architecture.

```bash
npm install -g launchstack-cli
```

## What LaunchStack generates

- Fastify + strict TypeScript API starter
- Prisma ORM with PostgreSQL
- JWT access and refresh token authentication
- Database-enforced single-use refresh-token rotation
- bcrypt password hashing
- Bounded Zod request/response validation
- Auth endpoint rate limiting
- Production CORS safeguards
- Swagger / OpenAPI documentation
- Layered controllers, services, repositories, schemas, and DTOs
- Health and readiness endpoints
- Multi-stage non-root Docker image
- Docker Compose support
- GitHub Actions CI workflow
- Render, Railway, and Fly.io deployment presets
- Vitest test setup, including concurrency fixtures
- Environment validation that fails fast on unsafe production settings

## Requirements

- Node.js 20 or newer
- PostgreSQL (or Docker Desktop)

## Quick start

Create a new backend API. Dependencies are installed by default:

```bash
launchstack create my-api
cd my-api
```

Start PostgreSQL and initialize the schema:

```bash
npm run db:up
npm run prisma:migrate -- --name init
```

Start development:

```bash
npm run dev
```

Generated endpoints include:

| Endpoint | URL |
| --- | --- |
| Swagger UI | http://localhost:3000/docs |
| Health | http://localhost:3000/health |
| Readiness | http://localhost:3000/ready |

## Core CLI commands

Create without installing dependencies:

```bash
launchstack create my-api --no-install
```

Inspect a generated project:

```bash
launchstack doctor --directory my-api
launchstack doctor --directory my-api --json
```

Initialize and validate LaunchStack project configuration:

```bash
launchstack init --name my-app
launchstack validate
launchstack status
```

Switch environment or deployment preset:

```bash
launchstack env staging
launchstack provider render
launchstack provider fly
```

### Deployment preparation

`launchstack deploy` currently builds and validates local deployment artifacts and records them as `prepared`. It does **not** claim a remote provider deployment succeeded unless a provider adapter confirms that state.

```bash
launchstack deploy
launchstack history
```

`launchstack rollback` only reports an actually successful remote deployment record. Prepared local artifacts are not presented as rollback targets.

### Local secrets

Secret values are no longer accepted as positional command arguments, so they do not need to appear in shell history or process arguments.

Interactive hidden input:

```bash
launchstack secrets add API_KEY
```

Automation/stdin:

```bash
printf '%s' "$API_KEY" | launchstack secrets add API_KEY --stdin
```

List or remove keys:

```bash
launchstack secrets list
launchstack secrets remove API_KEY
```

Local secret state is stored under `.launchstack/`, written atomically with restrictive permissions where the platform supports them, and ignored by generated projects.

### Docker and CI assets

```bash
launchstack docker init
launchstack github init
```

Docker generation and generated API projects share the same hardened Docker renderer: multi-stage builds, lockfile-driven installs when available, production-only runtime dependencies, secret-safe build contexts, and a non-root runtime user.

## Generated project commands

Quality checks:

```bash
npm run typecheck
npm test
npm run build
npm run check
```

Production helpers:

```bash
npm run docker:build
npm run docker:up
npm run docker:prod
npm run docker:down
npm run docker:logs
npm run prisma:deploy
```

## Production configuration notes

Generated applications reject placeholder JWT secrets in production, validate JWT expiry durations during startup, and require an explicit `CORS_ORIGIN` allowlist. Wildcard production CORS is only permitted through the explicit `ALLOW_INSECURE_CORS=true` escape hatch.

Authentication endpoints use configurable limits:

```env
AUTH_RATE_LIMIT_MAX=20
AUTH_RATE_LIMIT_WINDOW_MS=60000
```

`CORS_ORIGIN` accepts a comma-separated allowlist:

```env
CORS_ORIGIN=https://app.example.com,https://admin.example.com
```

## LaunchStack development

Install exactly from the lockfile:

```bash
npm ci
```

Run the normal quality gate:

```bash
npm run check
```

The normal gate includes linting, TypeScript typechecking, tests, a deterministic `dist/` rebuild check, and npm pack inspection.

Run the full release gate. It installs the packed npm artifact in a clean temporary project, checks the packed security behavior/version, generates a fresh API, runs database-backed registration/refresh concurrency tests against PostgreSQL, typechecks/builds/tests the generated application, and audits runtime dependencies:

```bash
npm run release:check
```

## npm releases

Release procedure is documented in [`docs/RELEASING.md`](docs/RELEASING.md). Each published release from v2.1.0 onward gets a root-level `RELEASE_NOTES_<version>.md` file in addition to `CHANGELOG.md`.

When a new package version is merged to `main`, `.github/workflows/publish.yml` reruns the full release gate, verifies the matching release notes, creates the `v<version>` tag at that exact merged commit, publishes to npm with provenance, and creates the corresponding GitHub Release. If that exact npm version already exists, the workflow exits without republishing it.

The npm credential is stored only as the GitHub repository secret `LAUNCHSTACK_NPM_TOKEN`. The workflow exposes it to npm as `NODE_AUTH_TOKEN` only for the guarded publish step; it is never committed to the repository or written to release notes.

## Roadmap

The active feature roadmap is tracked in GitHub issues. Current directions include composable capabilities, project upgrades/drift detection, local orchestration, typed API clients, production auditing, architecture-aware resource generation, preview environments, plugins/recipes, and a declarative LaunchStack project manifest.

## Contributing

Issues and pull requests are welcome. Please run `npm run check` for ordinary changes and `npm run release:check` for release-affecting changes before requesting merge.

## Author

**Williams Ashibuogwu**

- GitHub: https://github.com/wbizmo
- LinkedIn: https://linkedin.com/in/wbizmo
- npm: https://www.npmjs.com/package/launchstack-cli
