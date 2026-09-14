# LaunchStack CLI v3.0.0

Release date: 2026-09-14

LaunchStack v3 turns the CLI from a one-time backend scaffolder into a project lifecycle platform while keeping user business logic outside LaunchStack ownership.

## Highlights

### Declarative project lifecycle

Fresh projects include `launchstack.json` plus `.launchstack/state.json`. `plan`, `apply`, `reconcile`, `diff`, `upgrade --plan` and `doctor --fix` operate from the same state model. Managed files carry hashes, so LaunchStack reports local drift instead of silently replacing changed code.

### Composable capabilities and plugins

`launchstack add` installs first-party Redis, queues, OAuth, storage, observability, WebSockets, email, cron and webhook capability slices. Dependencies resolve topologically with cycle/conflict checks and idempotent re-application. Third-party plugins use schema-validated declarative manifests; path traversal and managed-file ownership conflicts are rejected, and executable hooks are never silently run.

### Local orchestration, SDKs and generators

`launchstack dev` derives infrastructure/process ordering from installed capabilities. `launchstack client generate` creates deterministic typed clients from OpenAPI with injected auth and typed errors. `launchstack generate module/resource` preserves the generated layered architecture; CRUD data access is owner-scoped by default to avoid object-ID-only authorization patterns.

### Production audit and preview stages

`launchstack audit` provides stable security/readiness rules with severity thresholds and reasoned suppressions. Preview/stage commands ship with a complete Docker Compose lifecycle adapter, source-commit/state tracking, deterministic isolated resource IDs and explicit production acknowledgement before destructive teardown.

## Concurrency and efficiency

- Concurrent mutating LaunchStack commands are serialized by a per-project exclusive lock.
- Mutations are staged and journaled before commit and support stale/interrupted recovery.
- Capability dependency planning is O(V+E).
- Managed drift and reconciliation are O(M) in LaunchStack-owned entries plus file bytes read.
- OpenAPI generation traverses paths/schema nodes once and uses deterministic collision suffixes.
- Existing generated API database-enforced refresh-token and registration race tests remain in the release gate.

## Issues addressed

This release implements the v3 roadmap tracked in #19 through #27: composable capabilities, project drift/upgrades, local orchestration, typed API clients, production audit, resource/module generation, preview/stage lifecycle, plugin recipes, and the declarative project manifest/reconciliation engine.

## Upgrade

Existing v2 projects should review the plan first:

```bash
launchstack upgrade --plan
launchstack upgrade
launchstack doctor --fix
```

Ambiguous user edits are reported as conflicts and must be resolved explicitly.

## Verification

The release is only considered complete after the exact PR head and merged `main` SHA pass `npm run release:check`, followed by a successful provenance-enabled npm publish and GitHub Release creation.
