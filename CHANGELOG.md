# Changelog

## 2.1.0 - 2026-09-14

### Security

- Ship the API credential-forwarding protections in the actual packed npm artifact and verify them from a clean tarball install.
- Replace positional secret values with hidden interactive/`--stdin` input, restrictive file permissions, atomic writes, key validation, and generated `.launchstack/` ignores.
- Make refresh-token rotation single-use under concurrency by consuming the parent token conditionally inside the same database transaction that creates its successor.
- Upgrade generated Swagger UI dependencies away from vulnerable `@fastify/static` resolutions.
- Add auth endpoint rate limiting and maximum input sizes before bcrypt/JWT/database work.
- Require explicit production CORS origins unless unrestricted CORS is explicitly opted into.
- Map concurrent duplicate registration races to HTTP 409 rather than generic 500 errors.

### Reliability and release engineering

- Validate JWT expiry durations during startup.
- Derive the CLI version from `package.json` at build time instead of maintaining a second hard-coded version.
- Add lint, TypeScript typechecking, tests, deterministic `dist/` verification, packed-artifact smoke tests, generated-project checks, runtime audits, and database-backed concurrency tests to the release gate.
- Add reproducible lockfile handling, repository metadata, npm provenance, and guarded automatic npm/GitHub release creation from verified `main` versions.
- Use the `LAUNCHSTACK_NPM_TOKEN` repository secret only as npm's `NODE_AUTH_TOKEN` during publishing.
- Pin intentional dependency ranges, keep the CLI compatible with its documented Node.js 20 baseline, and upgrade Vitest to a patched release.

### Correctness and developer experience

- Make project generation transactional and clean up template alias collisions.
- Render templates in one placeholder pass and avoid decoding binary/static assets as UTF-8.
- Reduce Git metadata process spawning and remove shell interpolation from fixed Git commands.
- Centralize hardened Docker generation so `launchstack docker init` and generated API projects share the same multi-stage, lockfile-aware, non-root baseline.
- Align Fly.io/provider support through a shared provider registry.
- Reframe `launchstack deploy` as deployment preparation until a remote provider confirms deployment success.
- Validate deployment output paths before recording prepared artifacts.

## 2.0.2

- Security source hardening for LaunchStack API credential forwarding.

## 2.0.0

LaunchStack CLI v2 expanded the project from deployment workflow tooling into a backend API scaffolding and production workflow CLI.

### Added

- `launchstack create <project-name>`
- Fastify API starter
- TypeScript strict-mode template
- Prisma and PostgreSQL
- Docker Compose database service
- JWT access and refresh tokens
- Password hashing
- Registration, login, refresh, logout, and profile routes
- Zod request and response validation
- Swagger/OpenAPI documentation
- Layered controllers, services, repositories, and DTOs
- Structured application errors
- Production Docker image
- GitHub Actions workflows
- Render, Railway, and Fly.io presets
- Readiness and health endpoints
- `launchstack doctor`

### Existing capabilities retained

- Project initialization
- Environment switching
- Provider management
- Deployment history
- Rollback visibility
- Secrets management
- Docker scaffolding
- GitHub Actions generation
