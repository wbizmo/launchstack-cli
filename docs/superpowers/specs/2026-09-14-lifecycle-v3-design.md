# LaunchStack v3 Lifecycle Platform Design

**Issues:** #19–#27

## Intent

LaunchStack v3 turns the CLI from a one-shot scaffolder into a lifecycle tool. The authoritative state model is a versioned `launchstack.json` manifest plus `.launchstack/state.json`. The manifest describes LaunchStack-managed capabilities, provider/stage settings, generation choices, and audit suppressions. The state file records installed extension versions, managed-file hashes, template version, and stage metadata; application business logic remains user-owned.

## Architecture

The implementation is deliberately split into independent units:

1. **Project metadata + transactional mutation engine.** All managed writes are path-confined to the project root, reject traversal/symlink targets, are staged to temporary files, and are committed with rollback snapshots. Managed-file SHA-256 hashes let LaunchStack distinguish clean managed files, manual drift, and ambiguous conflicts without scanning or copying the full project.
2. **Shared extension engine.** First-party `launchstack add` capabilities and third-party plugin manifests compile into the same declarative mutation plan. The engine validates compatibility/dependencies/conflicts before mutation, topologically resolves dependencies, refuses user-file overwrite, and applies plans transactionally. Third-party executable hooks are opt-in and surfaced explicitly; v3 defaults to declarative operations only.
3. **Manifest reconciliation + upgrades.** `plan`, `apply`, `reconcile`, `diff`, `upgrade --plan`, and `upgrade` operate on desired manifest state versus recorded/detected state. Plans are deterministic and read-only; apply reuses extension primitives. Historical 2.x projects can be adopted incrementally and conflicting route/config edits are surfaced instead of overwritten.
4. **Lifecycle services.** `dev`, `audit`, typed client generation, resource/module generation, and stage/preview management consume the same manifest/state model. This avoids duplicate capability detection and keeps complexity linear in the number of managed resources/files.

## Manifest

v3 standardizes on JSON to avoid adding a parser dependency to the CLI:

```json
{
  "$schema": "https://launchstack.dev/schemas/project-v1.json",
  "schemaVersion": 1,
  "project": { "name": "my-api", "templateVersion": "3.0.0" },
  "capabilities": {
    "database": { "version": "1.0.0", "provider": "postgres" },
    "auth": { "version": "1.0.0", "provider": "jwt" }
  },
  "provider": { "id": "docker" },
  "stages": {}
}
```

Unknown keys are rejected in managed sections to prevent typo-driven destructive reconciliation. Existing projects can adopt the manifest without regeneration.

## First-party capabilities

The registry starts with `redis`, `queue`, `oauth`, `storage`, `observability`, `websocket`, `email`, `cron`, and `webhooks`. Capabilities declare dependencies/conflicts, package dependencies, environment variables, generated files, Compose fragments, doctor checks, and audit requirements. `queue` depends on `redis`; dependency resolution is cycle-safe and O(V+E). Re-adding the same version is a no-op. Changing a managed file outside LaunchStack creates a conflict rather than silent overwrite.

## Plugins

Third-party plugins are loaded from a validated `launchstack-plugin.json` in an installed package or explicit local manifest path. The manifest is schema-validated before any action. Path traversal, absolute paths, symlink targets, unsupported LaunchStack versions, conflicting file ownership, and undeclared destructive deletes are rejected. Arbitrary executable hooks are not run by default; hook-bearing manifests require an explicit allow flag and remain outside automatic reconciliation.

## Upgrade and drift

`.launchstack/state.json` records hashes only for LaunchStack-owned files. `diff` compares those hashes in one pass. Upgrade migrations are ordered, versioned transformations. v3 includes metadata adoption for 2.0.x/2.1.x fixtures and a safe route-registry insertion that only applies when recognized anchors are present; otherwise the plan reports an ambiguous conflict. `doctor --fix` is limited to deterministic metadata repairs.

## Development orchestration

`launchstack dev` constructs a deterministic service DAG from capabilities, starts Compose infrastructure first, waits with bounded readiness timeouts, optionally applies development migrations, then starts API/workers. Port checks occur before process creation. Child processes are tracked in a Set for O(1) membership/removal; termination is idempotent and shuts down all LaunchStack-owned children on failure or repeated signals.

## Typed clients

`launchstack client generate` consumes OpenAPI JSON from a file or HTTP(S) endpoint. Operation names prefer sanitized `operationId`; collisions receive stable method/path hashes. Schema conversion preserves required/optional and nullable semantics. The generated fetch client exposes an injected token provider, throws a typed `ApiError` for non-2xx responses, and never hard-codes token storage. Output is deterministic and `--check` compares exact bytes for CI drift detection. React/TanStack Query and React Native targets layer on the base TypeScript client.

## Resource generation

Generated modules/resources live under `src/modules/<name>` and route registration is isolated in `src/routes/launchstack.generated.ts`, a LaunchStack-owned boundary. CRUD generation produces schemas, repository/service/controller/routes and test skeletons without pretending to know domain business rules. Generated user-facing CRUD routes require an explicit authorization hook and default to authenticated access. Name/path collisions are validated before staging.

## Production audit

`launchstack audit` emits stable rule IDs with informational/low/medium/high/critical severity. Local deterministic checks cover lockfiles, CORS, auth rate limiting, JWT defaults, Git-tracked secrets, Docker user, health/readiness, migration safeguards, generated-client drift markers, Swagger production policy, logging, debug/source maps, environment defaults, and capability-specific requirements. Suppressions are per-rule and require a reason; secret values are never printed.

## Stage lifecycle

The provider adapter interface advertises capabilities. v3 ships a complete Docker Compose preview adapter as the first supported lifecycle provider: non-production stages use unique Compose project names, verified state identities, stage-scoped env/secrets, source commit metadata, URLs and lifecycle records. Production is never inferred. Destroy verifies the stored provider/resource identity before calling Compose down. Other providers fail with explicit capability errors until a remote adapter is implemented.

## Complexity and concurrency

- Manifest/state parsing: O(bytes).
- Capability dependency planning: O(V+E).
- Drift/reconciliation: O(M) managed entries plus bytes read; no nested full-project scans.
- Client generation: O(P+S) OpenAPI paths/schema nodes.
- Resource collision checks: O(K) intended paths.
- Stage lookup/update: O(1) by stage key.
- Atomic state writes use temp-file + rename; in-process project mutations use a lock file created with exclusive mode so concurrent `add/apply/upgrade/generate` commands cannot race. Stale locks are bounded and recoverable.

## Verification

Unit tests cover manifests, path confinement, transactional rollback, idempotency, dependency cycles, conflicts, deterministic generation, nullable OpenAPI semantics, audit redaction/severity, resource collisions, dev shutdown and stage identity safeguards. CLI integration tests cover the public command surface. Release CI additionally rebuilds committed `dist`, packs the tarball, smoke-installs it, generates a project, runs PostgreSQL-backed generated API tests/concurrency checks, and audits production dependencies.
