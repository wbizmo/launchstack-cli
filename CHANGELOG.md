# Changelog

Release notes for all published versions are indexed in [`docs/RELEASE_HISTORY.md`](docs/RELEASE_HISTORY.md).

## [3.0.7] - 2026-11-18

### Supply-chain security and release evidence

- Add explicit generated-project MIT licensing, third-party notice registers, exact production component records, integrity-verified source archiving and a committee-ready release evidence bundle.
- Add low-severity production dependency gates for both CLI and generated API template, public security/license inquiry routes and recurring independent advisory checks.
- Pin release/security workflow actions by immutable commit SHA and fail closed when component metadata, source integrity, audit status or release evidence is incomplete.

### Runtime and distribution

- No intentional CLI command behavior change. Generated projects now include explicit license and third-party notice files.
- The earlier invalid unrendered generated-template SBOM name is corrected by generating its CycloneDX file from a temporary normalized manifest, leaving the distributed template unchanged.

## [3.0.6] - 2026-11-15

### Fixed

- Replan capability installs while holding the project mutation lock, so concurrent independent installs preserve both manifest/state entries and their generated files in serialized transactions.
- Check production CORS and JWT requirements across the base and production Compose files, including inherited settings.
- Report a project outside a Git work tree distinctly from failed or bounded Git path enumeration, and lower the non-Git completeness notice to medium severity.
- Enforce the declared Node.js 24/26 support range for CLI commands with an actionable message while preserving help and version output.

### Documentation

- Add generated Compose instructions for passing a custom CA through BuildKit secrets.
- Record end-to-end v3.0.5 generated-project checks and v3.0.6 local verification in the release notes.

## [3.0.5] - 2026-11-15

### Fixed

- Replace hard-link project mutation locks with directory locks so project changes work on filesystems that do not support hard links. Preserve concurrent-writer serialization and stale-owner recovery; incomplete lock initialization is left for safe manual cleanup instead of being reclaimed by age alone.
- Make `launchstack validate` validate v3 `launchstack.json` manifests while continuing to accept legacy `launchstack.config.json` files.
- Make `launchstack create --directory <parent>` create `<parent>/<project-name>` and add `--verbose` progress for generation stages.
- Accept Node.js 24.22.0+ and 26.13.0+ within those major lines; CI and Docker stay on the current patched releases.
- Keep capability documentation explicit that Redis, queue and cron provide local wiring while OAuth, storage, observability, WebSocket, email and webhooks provide helper code.

### Release checks

- Local verification results and benchmark measurements are recorded in [`RELEASE_NOTES_3.0.5.md`](RELEASE_NOTES_3.0.5.md).

## [3.0.4] - 2026-11-14

### Qualification and release controls

- Add a repeatable cross-system qualification suite for drift scanning through 250,000 files, dense capability graphs, mutation/recovery, upgrade plans, packed CLI behavior and generated PostgreSQL API workloads. Results and environment limitations are recorded in `docs/benchmarks/qualification.md` and its JSON companion.
- Fix generated Compose and Render YAML project-name placeholders and reset development PostgreSQL host-port mappings in production Compose; Docker smoke now builds the generated production image and checks image health plus PostgreSQL readiness.
- The matched v3.0.0 / v3.0.4 CLI measurements show higher candidate startup and total generation times on this run; the candidate template is larger.
- Add a v3.0.4 engineering summary and compatibility/migration table, including the Node 20 support break, Prisma 6 compatibility and the explicit v2.0.0-to-v3.0.0 project migration edge.
- Extend the release gate with Prettier, CycloneDX production SBOM validation and Windows portability CI; add CodeQL security analysis.
- v3.0.4 is released as [LaunchStack CLI v3.0.4](https://github.com/wbizmo/launchstack-cli/releases/tag/v3.0.4). Post-merge `release:check` passed on Node 24.22.3 and 26.13.1; generated production Docker smoke, main CI and CodeQL passed. The README and [`RELEASE_NOTES_3.0.4.md`](RELEASE_NOTES_3.0.4.md) contain measured benchmark summaries, reproduction commands and links to the reports and machine-readable results.

### Changed

- Set the supported Node.js lines to patched Node 24.22.3 and 26.13.1; dropping Node 20 is a breaking support-policy change despite the patch version.
- Updated generated Docker stages and CI policy to Node 24.22.3, with generated API CI testing both supported Node lines.
- Upgraded root and generated-template Zod dependencies to 4.6.7 for the high severity advisory affecting earlier 4.x versions.
- Require explicit CORS origins and JWT secrets in the generated production Compose configuration.
- Document that the generated auth rate-limit store is per process and must be shared for multi-replica deployments.

### Fixed

- Copy the generated healthcheck script into the production Docker image.

### Verification

- Root `release:check` passed on Node 24.22.3 with PostgreSQL 16, including 36 test files / 110 tests, production audit, packed CLI smoke, and generated API tests (8 files / 26 tests), build, and audit.
- The same root and generated-project checks passed on Node 26.13.1; the generated API database integration suite used PostgreSQL 17.
- A generated production Docker image passed its non-root healthcheck and `/health` request. The image was built with a BuildKit CA secret because this environment's npm proxy certificate is not in the base image store.
- Runtime measurements are in `docs/benchmarks/runtime.md`; they show no consistent startup speedup.

### Security and generated defaults

- Validate and size-limit recovery journals, reject unrecognized fields and reconstruct all staging/backup paths inside `.launchstack` before recovery.
- Keep malformed locks active, verify a lock token before release, and reject symlinked secret files/directories or permissive POSIX secret modes.
- Serialize stale lock reclamation with a per-inode claim so a stale-lock contender cannot unlink a replacement lock; treat unreadable Linux process identity as unverifiable/live.
- Reject cross-platform absolute managed paths and block remote OpenAPI access to non-public DNS answers, pinning HTTPS connections to the validated addresses.
- Add bounded deterministic hostile-input corpus checks for paths and encodings, project/plugin manifests, journals, symlinks, oversized inputs, cyclic schemas and hostile OpenAPI URLs; results and limits are recorded in `docs/benchmarks/security-fuzz.md`.
- Escape HTML-sensitive characters and Unicode line separators in generated SDK operation-key literals, use a fixed client-generation failure message, and suppress environment-derived smoke-test errors.
- Give generated projects distinct JWT development secrets, loopback host/origin defaults, and loopback Compose port bindings. Production Compose requires explicit origin and JWT settings.
- Extend production audit findings to cover runtime policy, npm lock consistency and production Compose requirements; `launchstack audit --advisories` adds npm registry evidence for production dependencies, with LS024 when that check cannot complete. Unsupported-runtime findings are marked heuristic.
- Final v3.0.0-to-candidate upgrade scans at 100k and 250k files show higher candidate latency and sampled RSS after file/path safety checks. The comparison is in `docs/benchmarks/qualification.md`.
- Mark secret-looking tracked filenames as heuristic findings, bound Git path enumeration at 16 MiB / 10 seconds, and emit LS022 when enumeration cannot complete. Add a 1k–100k path traversal benchmark; it records that file contents are not scanned.
- Security regression checks passed: lint, strict typecheck and 4 focused files / 17 tests.

### Atomic lifecycle mutations

- Add a versioned prepared/committing/committed journal, file and directory flushes, compare-and-swap preconditions, overlap rejection, process-start lock identity and bounded lock waiting.
- Recover uncommitted plans idempotently; committed plans retain the complete new state while cleanup can resume.
- Treat a lock descriptor/path mismatch during concurrent release-and-reacquire as a transient replacement race and retry verification; the independent 8/32 writer process regression now passes locally and in CI.
- Batch multi-capability reconciliation installs into one package, manifest, state and generated-file transaction.
- Benchmark 100 / 1,000 / 10,000 file plans against v3.0.0 and run 8 / 32 independent writer processes. Results, including the measured fsync cost, are in `docs/benchmarks/transactions.md`.
- Transaction checks passed on Node 24.22.3: lint, strict typecheck and 2 focused files / 14 tests.
- The full `release:check` also passed on Node 24.22.3 with PostgreSQL 16: 36 files / 119 tests, production audit, packed artifact smoke and generated API PostgreSQL checks (8 files / 26 tests), build and audit.

### Versioned project upgrades

- Register the explicit template edge 2.0.0 → 3.0.0 and reject unsupported intermediate versions rather than skipping them.
- Model migration dependencies and declarative manifest/state version preconditions and postconditions; topologically order chains and reject ambiguous, cyclic or unsatisfied migrations.
- Use TypeScript syntax trees to place missing integration imports and calls while retaining user statements and comments.
- Record LaunchStack-owned and shared integration ownership in state, including the migration base hash for shared files.
- Make `upgrade --plan --json` read-only and include exact before/after text for every planned mutation.
- Added upgrade fixtures for read-only planning, preservation, idempotency, legacy CLI/template version separation, and unsupported edges.
- Measured clean v2-to-v3 plans with 100 / 1,000 / 10,000 tracked files against v3.0.0; timing and memory increases are recorded in `docs/benchmarks/upgrades.md`.

### Capability wiring

- Assemble generated Compose service fragments into `docker-compose.launchstack.yml`, validate the merged structure against the project's base Compose services, and load it for `launchstack dev` with health-aware `docker compose up --wait`.
- Resolve package and script changes with npm in a temporary directory and commit `package.json` plus the matching `package-lock.json` in the same recoverable project transaction. `npm ci` succeeds immediately after adding capabilities.
- Generate a runnable BullMQ worker and a scheduler with error handling and graceful signal shutdown. Redis, queue and cron are marked complete local integrations; OAuth, storage, observability, WebSocket, email and webhook entries are explicitly identified as helper-only.
- Refuse capability removal when another installed capability depends on it; remove generated process scripts and regenerate Compose state without deleting modified or user-owned files.
- Verified packed CLI capability addition, lockfile installation, Compose validation, Redis health/readiness and a real BullMQ job roundtrip. The scheduler emitted repeated ticks and stopped on SIGTERM.

### Local orchestration and previews

- Use project and stage specific Compose namespaces, allocate loopback ports, and wait for Compose health checks plus API, worker and scheduler HTTP readiness.
- Keep development migrations on loopback, add guarded local reset and seed scripts, and report structured service states.
- Add an optional generic local HTTP mock endpoint for development adapters. The stub returns generic responses rather than service-specific behavior.
- Track process groups through child exit so failure cleanup still stops descendants; preserve database volumes during development shutdown.
- Serialize host port allocation and merge concurrent stage state updates. Pass an available Node CA file to BuildKit as a temporary secret during local preview builds.
- Carry allocated Redis ports into generated capability Compose files and include those services in isolated preview stage create/status/destroy operations.
- Verified a fresh packed CLI with two simultaneous generated projects and two simultaneous preview stages, including real PostgreSQL and API health checks. Measurements are recorded in `docs/benchmarks/orchestration.md`.
- With default API/Redis ports occupied, verified reassignment to 3001/6380 and completed a real BullMQ job through the generated worker.
- Added regression coverage for migration/reset/seed safeguards, premature child exits, readiness retry, Docker failure cleanup and operation timeouts.
- Full `release:check` passed on Node 24.22.3/PostgreSQL 16 and Node 26.13.1/PostgreSQL 17: each run passed 38 root test files / 137 tests and 8 generated API test files / 26 tests, with zero production audit findings.
- Generates resource updates with the owner predicate in the database mutation, keeping the existing 404 non-disclosure behavior. Resource list endpoints now use bounded `(createdAt, id)` keyset pagination and an owner/time/id index.
- Rejects invalid Prisma/resource identifiers, duplicate generated route prefixes and unsafe field names before writing generated files.
- Supports bounded OpenAPI 3.0/3.1 schema loading, local references, nullable/composed/enum types, parameter groups and successful response variants. TypeScript, React and React Native outputs are compiled and exercised against request fixtures.
- Scopes generated React query keys by canonical API base URL, operation method/path and caller-provided cache identity.
- Records PostgreSQL query counts, concurrent owner checks and SDK fixture verification in `docs/benchmarks/generators.md`.
- Orders development services with a deterministic min-heap and resolves extension dependencies with an explicit DFS stack, preserving cycle paths without recursive path copies.
- Streams SHA-256 file hashing in fixed 64 KiB chunks and reuses the validated manifest and sorted OpenAPI operation list within a single planning/rendering operation.
- Adds 10k-node graph, large-file digest and descriptor-leak regression checks. `npm run bench:complexity` records actual graph, resolver and hash timings, isolated hash RSS and a CPU profile in `docs/benchmarks/complexity.md`.

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

## 2.1.0 - 2026-09-14

- Security/correctness/performance hardening release covering the v2.1.0 hardening work: packed credential-forwarding protections, safer local secrets, atomic refresh rotation, auth/CORS/race hardening, reproducible release gates, transactional generation, Docker/provider/deployment corrections, and release provenance.

## 2.0.2

- Security source hardening for LaunchStack API credential forwarding.
- Improve installation, Quick Start and command documentation, package/template metadata consistency, and release audits.

## 2.0.1 - 2026-07-11

- Redesign the README and improve installation, Quick Start, command, generated-project quality, production workflow and developer documentation.
- No runtime or API changes; generated v2.0.0 projects remain compatible.

## 2.0.0

- Expanded LaunchStack from deployment workflow tooling into a production Fastify/TypeScript/Prisma API scaffolder.
- Added PostgreSQL, JWT authentication, validation, layered architecture, health/readiness checks, Docker/Compose, CI workflows, deployment presets and `launchstack doctor`.

## 1.0.0 - 2026-06-18

- Initial release with project configuration and validation, environment switching, deployment providers/workflows/history, rollback lookup, local secrets, Git metadata, Docker scaffolding and GitHub Actions generation.
