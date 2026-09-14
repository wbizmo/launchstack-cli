# LaunchStack v3 Lifecycle Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement issues #19–#27 as a coherent, secure lifecycle platform and ship LaunchStack CLI 3.0.0.

**Architecture:** A versioned `launchstack.json` manifest and `.launchstack/state.json` feed a shared transactional extension engine. Every lifecycle command consumes these primitives, so add/plugin/reconcile/upgrade/dev/audit/generation/stages share validation, ownership and rollback semantics instead of maintaining parallel state machines.

**Tech Stack:** Node.js 20+, TypeScript, Commander, Zod, Vitest, Fastify/Prisma generated template, Docker Compose, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-14-lifecycle-v3-design.md`

## Global Constraints

- No silent overwrite of user-owned or manually drifted files.
- All project mutation paths are project-root confined; reject traversal, absolute paths and symlink targets.
- Mutating commands must be atomic/rollbackable and guarded against concurrent writers.
- Plans/dry-runs/checks are read-only and deterministic.
- First-party and third-party extensions share the same declarative mutation primitives.
- Complexity targets: dependency planning O(V+E), drift O(M), OpenAPI generation O(P+S), no repeated whole-project scans.
- Secret values are never printed or persisted into history/status output.
- Production is never inferred as a preview/stage default.

---

### Task 1: Public failing CLI contract

**Files:**
- Create: `tests/lifecycle-v3-cli.test.ts`

- [ ] Write CLI integration tests for `add --list`, `plugin list`, `plan --json`, `audit --json`, `client generate`, `generate module --dry-run`, and stage-aware status.
- [ ] Run the release test suite and confirm the tests fail because the v3 commands do not exist.
- [ ] Commit the red tests before implementation.

### Task 2: Manifest, state, paths and atomic mutation

**Files:**
- Create: `src/project/types.ts`
- Create: `src/project/manifest.ts`
- Create: `src/project/state.ts`
- Create: `src/project/paths.ts`
- Create: `src/project/transaction.ts`
- Test: `tests/project-lifecycle.test.ts`

- [ ] Add tests for schema validation, unknown managed keys, traversal/absolute-path rejection, symlink rejection, exclusive project locking, stale-lock recovery, atomic rollback and managed hash drift classification.
- [ ] Verify tests fail for missing behavior.
- [ ] Implement minimal primitives and keep mutation work proportional to intended files rather than full-project size.
- [ ] Verify targeted tests pass.

### Task 3: Shared extension engine and first-party capability registry

**Files:**
- Create: `src/extensions/types.ts`
- Create: `src/extensions/engine.ts`
- Create: `src/extensions/first-party.ts`
- Create: `src/commands/add.ts`
- Test: `tests/extensions.test.ts`

- [ ] Add tests for O(V+E) dependency resolution, cycle detection, conflicts, idempotent re-add, managed-file ownership, package/env/Compose plans, dry-run purity, rollback, and queue→redis ordering.
- [ ] Implement the declarative engine and first-party definitions for redis, queue, oauth, storage, observability, websocket, email, cron and webhooks.
- [ ] Verify targeted tests pass.

### Task 4: Plugin/recipe trust boundary

**Files:**
- Create: `src/extensions/plugins.ts`
- Create: `src/commands/plugin.ts`
- Test: `tests/plugins.test.ts`

- [ ] Add tests for manifest validation, incompatible versions, path escape attempts, undeclared deletes, hook disclosure, opt-in hooks, install/remove/upgrade plans and rollback.
- [ ] Implement local/node_modules plugin discovery without silently executing package hooks.
- [ ] Verify targeted tests pass.

### Task 5: Drift, upgrades and reconciliation

**Files:**
- Create: `src/project/reconcile.ts`
- Create: `src/project/upgrade.ts`
- Create: `src/commands/project.ts`
- Modify: `src/commands/doctor.ts`
- Test: `tests/reconcile.test.ts`

- [ ] Add fixtures representing 2.0.x and 2.1.x metadata and tests for read-only plan, conflict surfacing, ordered migration, state version updates, managed/user/ambiguous drift classification and deterministic doctor fixes.
- [ ] Implement `diff`, `upgrade --plan`, `upgrade`, `plan`, `apply`, `reconcile`, and `doctor --fix` through the extension engine.
- [ ] Verify targeted tests pass.

### Task 6: Development orchestrator

**Files:**
- Create: `src/dev/orchestrator.ts`
- Create: `src/commands/dev.ts`
- Test: `tests/dev-orchestrator.test.ts`

- [ ] Test deterministic service DAGs, occupied ports, bounded readiness timeouts, required-service failure cleanup, repeated termination idempotency, optional Redis/queue absence and JSON planning.
- [ ] Implement injectable process/port/readiness adapters, signal forwarding and child cleanup.
- [ ] Verify targeted tests pass without requiring Docker in unit tests.

### Task 7: Typed OpenAPI clients

**Files:**
- Create: `src/client/openapi.ts`
- Create: `src/client/generate.ts`
- Create: `src/commands/client-generate.ts`
- Test: `tests/client-generator-v3.test.ts`

- [ ] Test optional/nullable mapping, deterministic output, collision-safe operation names, typed non-2xx errors, auth token injection, `--output`, and stale `--check` behavior.
- [ ] Implement file/HTTP JSON schema loading and TypeScript/React/React Native targets.
- [ ] Verify generated TypeScript fixtures compile in strict mode during smoke tests.

### Task 8: Production audit

**Files:**
- Create: `src/audit/types.ts`
- Create: `src/audit/rules.ts`
- Create: `src/audit/run.ts`
- Create: `src/commands/audit.ts`
- Test: `tests/audit-v3.test.ts`

- [ ] Test stable rule IDs/severities, threshold exit logic, insecure fixture findings, hardened fixture baseline, suppression-with-reason validation and secret redaction.
- [ ] Implement deterministic local rules and capability audit hooks.
- [ ] Verify targeted tests pass.

### Task 9: Architecture-aware resource/module generation

**Files:**
- Create: `src/generator/module.ts`
- Create: `src/commands/generate.ts`
- Modify template route registry files.
- Test: `tests/module-generator.test.ts`

- [ ] Test naming/path collisions, dry-run purity, deterministic output, authenticated CRUD defaults, complete route/schema/OpenAPI wiring and rollback.
- [ ] Implement generated-boundary route registry and module/resource slice generation.
- [ ] Verify a generated fixture typechecks/builds after dependency installation.

### Task 10: Preview/stage lifecycle

**Files:**
- Create: `src/stages/types.ts`
- Create: `src/stages/docker.ts`
- Create: `src/stages/manager.ts`
- Create: `src/commands/stages.ts`
- Modify: `src/commands/status.ts`
- Test: `tests/stages-v3.test.ts`

- [ ] Test exact source SHA metadata, stage-scoped secrets redaction, provider capability errors, production-default refusal, verified resource identity on destroy and isolation between stages.
- [ ] Implement Docker Compose as the first complete preview lifecycle provider through an adapter interface.
- [ ] Verify targeted tests pass.

### Task 11: Generated project v3 metadata and route ownership boundary

**Files:**
- Modify: `src/generator/generate.ts`
- Modify: `src/templates/api/*` metadata/route files/package version/docs
- Test: template/generator tests

- [ ] Add tests proving fresh projects include `launchstack.json`, state metadata and `src/routes/launchstack.generated.ts`.
- [ ] Update project generation and template smoke checks.
- [ ] Verify PostgreSQL-backed generated tests still pass.

### Task 12: CLI/export wiring and release documentation

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `package.json`, `package-lock.json`
- Modify: `README.md`, `CHANGELOG.md`
- Create: `RELEASE_NOTES_3.0.0.md`
- Modify: relevant generated-template markdown files

- [ ] Wire all commands and public APIs.
- [ ] Update version to 3.0.0 and document migration/new workflows, command reference, security model and plugin trust boundary.
- [ ] Refresh lockfiles and committed `dist` from a clean CI build.

### Task 13: Full verification, PR, merge and publish

- [ ] Run exact-head CI with lint, typecheck, all unit/integration tests, `verify:dist`, packed-tarball smoke, generated API Postgres/concurrency tests and production audits.
- [ ] Fix only diagnosed failures, using targeted tests before re-running the complete gate.
- [ ] Open PR closing #19–#27 and require the PR exact-head gate to pass.
- [ ] Merge only the verified SHA, then require `main` CI to pass.
- [ ] Let the publish workflow verify release notes/tag, publish `launchstack-cli@3.0.0` with `LAUNCHSTACK_NPM_TOKEN` and provenance, and create GitHub Release `LaunchStack CLI v3.0.0`.
- [ ] Verify npm registry and GitHub release state before reporting completion.
