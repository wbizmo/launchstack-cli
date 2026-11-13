# Changelog

## [3.0.4] - Draft / Unreleased

### Changed
- Set the supported Node.js lines to patched Node 24.22.3 and 26.13.1; dropping Node 20 is a breaking support-policy change despite the patch version.
- Updated generated Docker stages and CI policy to Node 24.22.3, with generated API CI testing both supported Node lines.
- Upgraded root and generated-template Zod dependencies to 4.6.7 for the high severity advisory affecting earlier 4.x versions.
- Require explicit CORS origins and JWT secrets in the generated production Compose configuration.

### Fixed
- Copy the generated healthcheck script into the production Docker image.

### Verification
- Root `release:check` passed on Node 24.22.3 with PostgreSQL 16, including 36 test files / 110 tests, production audit, packed CLI smoke, and generated API tests (8 files / 26 tests), build, and audit.
- The same root and generated-project checks passed on Node 26.13.1; the generated API database integration suite used PostgreSQL 17.
- A generated production Docker image passed its non-root healthcheck and `/health` request. The image was built with a BuildKit CA secret because this environment's npm proxy certificate is not in the base image store.
- Runtime measurements are in `docs/benchmarks/issue-30-runtime.md`; they show no consistent startup speedup.

## 3.0.0 - 2026-09-14

### Lifecycle platform

- Add a versioned `launchstack.json` desired-state manifest and `.launchstack/state.json` ownership/state record.
- Add `launchstack add` for composable Redis, BullMQ queue, OAuth, storage, observability, WebSocket, email, cron and webhook capabilities.
- Add shared declarative extension primitives for first-party capabilities and validated third-party plugin manifests.
- Add `diff`, `plan`, `apply`, `reconcile`, `upgrade --plan`, `upgrade`, and deterministic `doctor --fix` flows.
- Add `launchstack dev` capability-aware local orchestration with dependency ordering, port checks, bounded readiness and child cleanup.
- Add deterministic typed OpenAPI client generation for TypeScript, React and React Native targets.
- Add `launchstack audit` production-readiness findings with stable IDs/severities and reasoned suppressions.
- Add architecture-aware module and authenticated owner-scoped CRUD resource generation.
- Add preview/stage lifecycle commands with a complete Docker Compose adapter, deterministic resource identities and guarded production teardown.

### Safety, correctness and performance

- Path-confine all managed mutations and reject traversal/symlink mutation targets.
- Serialize concurrent project mutations through an exclusive lock with stale-lock recovery.
- Stage/journal mutations before commit and recover interrupted writes.
- Detect local drift with SHA-256 hashes instead of overwriting changed managed files.
- Resolve capability dependency graphs in O(V+E) with cycle/conflict detection and idempotent re-application.
- Keep drift/reconciliation linear in managed state rather than repeatedly scanning the repository.
- Keep OpenAPI generation linear in operation/schema traversal and use stable hashes for naming collisions.
- Preserve v2 generated API auth race/concurrency protections and production security baseline.

### Release engineering

- Promote the generated API template and package to 3.0.0.
- Expand v3 unit/CLI/security/edge-case coverage while retaining packed-artifact and PostgreSQL-backed generated-project release gates.
- Publish through the existing provenance-enabled workflow using `LAUNCHSTACK_NPM_TOKEN` only as `NODE_AUTH_TOKEN`.

## 2.1.0 - 2026-09-14

- Security/correctness/performance hardening release covering issues #2-#18: packed credential-forwarding protections, safer local secrets, atomic refresh rotation, auth/CORS/race hardening, reproducible release gates, transactional generation, Docker/provider/deployment corrections, and release provenance.

## 2.0.2

- Security source hardening for LaunchStack API credential forwarding.

## 2.0.0

- Expanded LaunchStack from deployment workflow tooling into a production Fastify/TypeScript/Prisma API scaffolder.
