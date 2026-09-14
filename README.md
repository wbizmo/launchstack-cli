# LaunchStack CLI

Production-ready backend scaffolding **and lifecycle management** for TypeScript services.

LaunchStack generates hardened Fastify APIs with TypeScript, Prisma/PostgreSQL, JWT authentication, Zod validation, OpenAPI, Docker and CI, then keeps those projects manageable as they evolve: capabilities, drift-safe upgrades, local orchestration, typed SDKs, production audits, resource generation, preview stages and validated plugins all share one project-state model.

```bash
npm install -g launchstack-cli
```

## Requirements

- Node.js 20+
- PostgreSQL or Docker for generated API runtime work

## Create a backend

```bash
launchstack create my-api
cd my-api
npm run db:up
npm run prisma:migrate -- --name init
launchstack dev
```

Fresh v3 projects contain `launchstack.json` for desired LaunchStack state and `.launchstack/state.json` for LaunchStack-owned hashes, installed extensions and stage metadata. Business/domain code remains user-owned.

## Lifecycle commands

### Add capabilities

```bash
launchstack add --list
launchstack add redis
launchstack add queue
launchstack add oauth google
launchstack add storage s3
launchstack add observability
launchstack add webhooks
```

Capability dependency planning is topological and cycle-safe. Re-applying the same version is a no-op. Managed files are hashed; LaunchStack refuses to silently replace user files or locally drifted generated files.

### Plan, drift and upgrades

```bash
launchstack diff
launchstack plan
launchstack plan --json
launchstack apply
launchstack reconcile
launchstack upgrade --plan
launchstack upgrade
launchstack doctor --fix
```

Plans are read-only. Mutations are path-confined, protected by an exclusive project lock, staged before commit and journaled for rollback/recovery. Existing v2 projects can adopt v3 metadata through the ordered upgrade path; ambiguous edits are reported as conflicts instead of overwritten.

### Local development orchestration

```bash
launchstack dev
launchstack dev --json
```

The orchestrator derives required PostgreSQL/Redis/workers/API services from the project manifest, starts dependencies in deterministic order, checks ports, uses bounded readiness timeouts and terminates LaunchStack-owned children on failure or signals.

### Typed API clients

```bash
launchstack client generate --schema ./openapi.json --output ./src/sdk.ts
launchstack client generate --target react
launchstack client generate --target react-native
launchstack client generate --check
```

OpenAPI generation preserves optional/nullable types, produces deterministic operation names, injects authentication through a token provider rather than hard-coded browser storage, and exposes typed non-2xx `ApiError` responses.

### Architecture-aware modules and CRUD resources

```bash
launchstack generate module billing
launchstack generate resource invoice --field total:number --field paid:boolean
launchstack generate resource invoice --dry-run --json
```

Generated CRUD is authenticated by default and database access is scoped by `ownerId` for user-facing lookup/update/delete operations. LaunchStack generates the mechanical boundary; application-specific RBAC, invariants and privileged workflows still belong in the service/domain layer.

### Production audit

```bash
launchstack audit
launchstack audit --production
launchstack audit --json
launchstack audit --fail-on high
```

Audit findings have stable rule IDs and severities. Local deterministic checks cover lockfiles, CORS, auth throttling, JWT placeholders, Git-tracked secret-like files, container users, migrations, health/readiness, generated drift, source maps and capability state. Suppressions live in `launchstack.json` and require a reason. Secret values are never emitted.

### Preview and stage lifecycle

```bash
launchstack preview pr-142
launchstack deploy --stage pr-142
launchstack status --stage pr-142 --json
launchstack destroy --stage pr-142
```

v3 ships Docker Compose as the first complete preview lifecycle adapter. Stage resource IDs are deterministic per project/path, stage metadata records source commit/provider/status, production is never inferred, and destruction verifies the stored resource identity before teardown. Other providers fail explicitly until they implement the lifecycle adapter contract.

### Plugins / recipes

```bash
launchstack plugin validate @vendor/plugin
launchstack plugin add @vendor/plugin
launchstack plugin list --json
launchstack plugin remove @vendor/plugin
```

Third-party extensions use the same declarative mutation engine as first-party capabilities. Plugin manifests are schema-validated and file operations remain project-root confined. Executable hooks are a supply-chain trust boundary: LaunchStack refuses hook-bearing plugins unless they are explicitly acknowledged and does not execute hooks automatically during reconciliation.

## Generated API security baseline

Generated APIs include database-enforced single-use refresh-token rotation, duplicate-registration race handling, bounded auth payloads, auth rate limiting, explicit production CORS, startup JWT duration validation, non-root multi-stage Docker builds and PostgreSQL-backed concurrency tests.

Swagger UI is available at `http://localhost:3000/docs`, health at `/health`, and readiness at `/ready`.

## Existing workflow commands

```bash
launchstack init --name my-app
launchstack validate
launchstack status
launchstack env staging
launchstack provider render
launchstack deploy
launchstack history
launchstack rollback
launchstack docker init
launchstack github init
```

`launchstack deploy` without `--stage` prepares and validates artifacts and records `prepared`; it does not claim a remote deployment succeeded without provider confirmation.

## Secrets

```bash
launchstack secrets add API_KEY
printf '%s' "$API_KEY" | launchstack secrets add API_KEY --stdin
launchstack secrets list
launchstack secrets remove API_KEY
```

Secret values are not accepted positionally. Local state is atomic, restrictive where supported, and ignored from normal generated-project Git state.

## Quality and release gates

```bash
npm ci
npm run check
npm run release:check
```

The release gate runs linting, strict TypeScript checks, unit/integration tests, deterministic `dist/` verification, `npm pack` inspection, packed-artifact smoke tests, a fresh generated API install/build/test against PostgreSQL, auth race/concurrency tests and runtime vulnerability audits.

## Releases

Every release from v2.1.0 onward has `RELEASE_NOTES_<version>.md` plus the cumulative `CHANGELOG.md`. `docs/RELEASING.md` documents the process.

When a new version reaches `main`, `.github/workflows/publish.yml` reruns the full release gate, verifies the versioned release notes, creates `v<version>` on the exact merged SHA, publishes with npm provenance using the repository secret `LAUNCHSTACK_NPM_TOKEN` exposed only as `NODE_AUTH_TOKEN`, and creates the GitHub Release. Already-published versions are not republished.

## Complexity targets

The v3 lifecycle design keeps capability dependency planning at **O(V+E)**, managed drift/reconciliation at **O(M)** managed entries plus bytes read, OpenAPI traversal at **O(P+S)** paths/schema nodes, and stage state lookup at **O(1)** by key. Mutating commands avoid repeated whole-project scans.

## Contributing

Run `npm run check` for normal changes and `npm run release:check` for release-affecting changes. Do not merge a release PR until its exact head is green.

## Author

**Williams Ashibuogwu** — [GitHub](https://github.com/wbizmo) · [LinkedIn](https://linkedin.com/in/wbizmo) · [npm](https://www.npmjs.com/package/launchstack-cli)
