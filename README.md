# LaunchStack CLI

Production-ready backend scaffolding **and lifecycle management** for TypeScript services.

LaunchStack generates hardened Fastify APIs with TypeScript, Prisma/PostgreSQL, JWT authentication, Zod validation, OpenAPI, Docker and CI, then keeps those projects manageable as they evolve: capabilities, drift-safe upgrades, local orchestration, typed SDKs, production audits, resource generation, preview stages and validated plugins all share one project-state model.

```bash
npm install -g launchstack-cli
```

## Requirements

- Node.js 24.22.3+ within 24.x, or 26.13.1+ within 26.x. Node 20 is no longer supported; this is a breaking support change under semantic versioning despite the requested 3.0.4 patch version.
- PostgreSQL or Docker for generated API runtime work

The initial CLI runtime comparison records measurements and limitations in [the benchmark report](docs/benchmarks/issue-30-runtime.md); it shows no consistent startup speedup.

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

Capability dependency planning is topological and cycle-safe. Package and lockfile changes are prepared together, and the generated Compose file is assembled and checked against the project's existing services. `redis`, `queue` and `cron` include runnable local service/process wiring. `oauth`, `storage`, `observability`, `websocket`, `email` and `webhooks` currently install helper-only code; `launchstack add --list` and `launchstack add <capability>` identify that coverage. Re-applying the same version is a no-op. Managed files are hashed; LaunchStack refuses to silently replace user files or locally drifted generated files.

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

Plans are read-only. Mutations are path-confined, protected by a project lock, staged before commit and journaled for recovery. The supported template migration is v2.0.0 to v3.0.0; CLI package 3.0.4 does not change template or state schema versions. See the [upgrade policy](docs/UPGRADING.md) for ownership and conflict behavior.

Upgrade planning parses the tracked state of `F` managed files and the syntax trees of the integration files (`A` TypeScript nodes), then emits diffs proportional to changed bytes. Its time and auxiliary memory are `O(F + S + A)`, where `S` is the serialized state size. The v3.0.0 comparison is in [the issue #33 benchmark](docs/benchmarks/issue-33-upgrades.md); the AST and ownership evidence increases planning time and memory in these measurements.

Capability coverage and removal behavior are documented in [the first-party capability guide](docs/CAPABILITIES.md). Dependency graph, Redis readiness, queue roundtrip and scheduler measurements are in [the issue #34 benchmark](docs/benchmarks/issue-34-capabilities.md).

Lifecycle mutation plans write staged files, journal each transaction and flush affected directories before marking the new project state committed. For `N` new files, the file work is `O(N)` with two logical file operations per file, plus lock and journal work; existing-file replacements add one backup rename. The 100 / 1,000 / 10,000 file v3.0.0 comparison records a measured latency increase from durable flushing in [the issue #32 report](docs/benchmarks/issue-32-transactions.md).

### Local development orchestration

```bash
launchstack dev
launchstack dev --plan --json
launchstack dev --json
```

The orchestrator gives each project a hashed Compose namespace and dynamically allocates loopback ports when defaults are busy. It waits for Compose health checks, runs migrations only against loopback non-production-looking database URLs, and probes the API `/ready` endpoint plus worker/scheduler health endpoints. JSON mode emits `started`, `ready`, `degraded`, `failed` and `stopped` events; `--plan --json` prints the plan and exits. On failure or SIGINT/SIGTERM it stops process groups and tears down only that named Compose project, preserving its database volume. Generated templates include guarded `npm run db:reset` and configurable `npm run db:seed` commands. `npm run dev:mock` starts an optional generic local HTTP stub for development adapters; it does not emulate provider behavior.

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

Generated API projects bind local PostgreSQL and API ports to loopback by default. Each new project receives distinct 48-byte access and refresh secrets in its ignored `.env`; `.env.example` contains replaceable placeholders. Production Compose requires explicit CORS and JWT values and binds the API to loopback for use behind a host reverse proxy. Change the published port binding deliberately when remote access is required.

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
