# LaunchStack CLI

[![GitHub release](https://img.shields.io/github/v/release/wbizmo/launchstack-cli?display_name=tag)](https://github.com/wbizmo/launchstack-cli/releases)
[![npm version](https://img.shields.io/badge/npm-v3.0.4-CB3837?logo=npm&logoColor=white)](https://www.npmjs.com/package/launchstack-cli)
[![Node.js](https://img.shields.io/badge/Node.js-24%20%7C%2026-339933?logo=node.js&logoColor=white)](docs/COMPATIBILITY.md)
[![License: MIT](https://img.shields.io/github/license/wbizmo/launchstack-cli)](LICENSE)

TypeScript backend scaffolding and lifecycle management. LaunchStack creates Fastify, Prisma and PostgreSQL projects, then helps teams manage generated files, capabilities, upgrades, local environments, typed clients and preview stages as the project changes.

**Release:** [v3.0.4](https://github.com/wbizmo/launchstack-cli/releases/tag/v3.0.4) · [Release notes](RELEASE_NOTES_3.0.4.md) · [Zivora Labs project page](https://www.zivoralabs.xyz/open-source/launchstack-cli)

LaunchStack CLI has evolved from deployment and configuration tooling (v1) into a backend API generator (v2), then a declarative lifecycle platform (v3). Version 3.0.4 is the current release. Browse the [complete release history](docs/RELEASE_HISTORY.md) and [cumulative changelog](CHANGELOG.md) for every published version.

## Requirements

- Node.js 24.22.3 or later in the 24.x line, or Node.js 26.13.1 or later in the 26.x line. Node.js 20 is no longer supported. This runtime support change is breaking under semantic versioning, despite the 3.0.4 patch version.
- PostgreSQL or Docker for generated API and local orchestration workflows.

## Install

```bash
npm install --global launchstack-cli@3.0.4
```

## Quick start

```bash
launchstack create my-api
cd my-api
npm run db:up
npm run prisma:migrate -- --name init
launchstack dev
```

Fresh v3 projects include `launchstack.json` for desired LaunchStack state and `.launchstack/state.json` for LaunchStack-owned hashes, installed capabilities and stage metadata. Business and domain code remains user-owned.

## Capabilities and lifecycle

### What v3.0.4 adds and improves

Version 3.0.4 hardens the CLI, generated API and release tooling across issues #30–#39. It updates supported runtimes to Node.js 24 and 26, updates security-sensitive dependencies, keeps the generated API compatible with Prisma 6, and aligns Docker images and CI with the supported Node versions. Security improvements cover managed paths, secret files, transaction journals and locks, remote OpenAPI DNS validation, bounded audit inputs and generated SDK output. Lifecycle changes add durable mutation recovery, explicit project migrations, safer concurrent capability updates, improved capability assembly, isolated local orchestration and preview stages, bounded owner-scoped resource pagination, and streaming/hash and graph complexity checks. Release qualification adds Windows portability, CodeQL, SBOM validation, generated-project and Docker checks, and reproducible benchmark reports.

The Node 20 support removal is a breaking runtime-policy change despite the patch version. Prisma 7 migration is not included; generated projects remain on Prisma 6. Benchmark measurements and their limitations are summarized below and documented in full in [`docs/benchmarks`](docs/benchmarks/).

### Feature history

- **v1.0.0:** project configuration and validation, environment switching, deployment providers and workflows, deployment history and rollback lookup, local secrets, Git metadata, Docker scaffolding and GitHub Actions generation.
- **v2.0.0–v2.0.2:** generated Fastify/TypeScript APIs with Prisma and PostgreSQL, JWT authentication, validation, layered architecture, health/readiness endpoints, Docker and deployment presets, `doctor`, then release and documentation consistency improvements.
- **v2.1.0:** safer secret entry and storage, database-enforced refresh-token rotation, generated API security controls, artifact-level release checks, transactional project generation and hardened Docker output.
- **v3.0.0:** declarative project state, drift-aware reconciliation and upgrades, capabilities and plugins, local orchestration, typed OpenAPI clients, security audit, resource/module generators and isolated preview stages.
- **v3.0.4:** runtime/dependency modernization and the security, transaction, migration, capability, orchestration, generator, complexity and release-qualification improvements listed above.

### Add capabilities

```bash
launchstack add --list
launchstack add redis
launchstack add queue
launchstack add cron
launchstack add oauth google
launchstack add storage s3
```

Redis, queue and cron include runnable local service or process wiring. OAuth, storage, observability, WebSocket, email and webhooks currently provide helper code, not complete provider integrations. `launchstack add --list` reports the coverage for each capability. Reapplying an installed version is a no-op; LaunchStack hashes managed files and reports drift rather than silently replacing user changes.

Capability dependency ordering, package and lockfile updates, Compose assembly and removal behavior are described in the [capability guide](docs/CAPABILITIES.md).

### Plan and upgrade projects

```bash
launchstack diff
launchstack plan --json
launchstack apply
launchstack reconcile
launchstack upgrade --plan
launchstack upgrade
launchstack doctor --fix
```

Plans are read-only. Mutations are staged, journaled and protected by a project lock to support crash recovery. The registered template migration is v2.0.0 to v3.0.0; the CLI package version does not change a project's template or state schema. See the [upgrade guide](docs/UPGRADING.md).

LaunchStack rejects static symlink traversal and serializes its own project writers. Portable path-based mutations do not guarantee confinement against another process running as the same user and swapping a parent directory during rename. Do not use a project tree that an untrusted concurrent process can modify as a security boundary.

### Run local development environments

```bash
launchstack dev
launchstack dev --plan --json
launchstack dev --json
```

The orchestrator orders services, waits for configured health checks, allocates loopback ports when defaults are busy, and probes the generated API's `/ready` endpoint. It runs migrations only against loopback, non-production-looking database URLs. On failure or SIGINT/SIGTERM, it stops its child process groups and tears down only its named Compose project. It preserves that project's database volume.

### Generate typed clients and resources

```bash
launchstack client generate --schema ./openapi.json --target react
launchstack client generate --target react-native
launchstack generate module billing
launchstack generate resource invoice --field total:number --field paid:boolean
```

OpenAPI generation supports bounded OpenAPI 3.0/3.1 input, local references and TypeScript, React and React Native targets. Remote schemas require HTTPS, reject non-public DNS answers and pin connections to validated addresses. Input, depth, time and output are bounded; external references are rejected.

Generated resource reads, updates and deletes apply the owner predicate at the database boundary. Lists use indexed keyset pagination with a configurable limit from 1 to 100. Application-specific RBAC and domain rules remain the service layer's responsibility.

### Audit and preview stages

```bash
launchstack audit --production
launchstack audit --json
launchstack preview pr-142
launchstack deploy --stage pr-142
launchstack status --stage pr-142 --json
launchstack destroy --stage pr-142
```

Audit findings have stable rule IDs and severities. The optional `--advisories` mode queries the npm registry; if that evidence cannot be obtained, the audit reports it as incomplete. Secret-looking tracked paths are heuristic findings: LaunchStack checks filenames, not file contents. Git path enumeration is capped at 16 MiB and 10 seconds.

Docker Compose is the complete preview lifecycle adapter in v3. Other provider adapters report unsupported lifecycle operations explicitly. `launchstack deploy` without `--stage` prepares and validates artifacts; it does not claim that a remote deployment succeeded.

## Generated API security baseline

Generated APIs include database-enforced single-use refresh-token rotation, duplicate-registration race handling, bounded authentication payloads, auth rate limiting, explicit production CORS, startup JWT validation, non-root Docker images and PostgreSQL-backed concurrency tests. The default rate-limit store is in-memory per process; multi-replica deployments need a shared Fastify rate-limit store.

The generated API exposes Swagger UI at `/docs`, health at `/health` and readiness at `/ready`.

## v3.0.4 benchmark results

These are measured diagnostics from the v3.0.4 qualification work. The reports contain full methodology, environment, raw JSON and comparison limits; all are included in the public [`v3.0.4` source tag](https://github.com/wbizmo/launchstack-cli/tree/v3.0.4/docs/benchmarks).

| Area                                                                                                               | Recorded result                                                                                                                                                                         | Reproduction                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [Runtime](docs/benchmarks/issue-30-runtime.md)                                                                     | No consistent startup speedup: warm `--version` p50 was 5.7% slower, while `--help` p50 was 1.4% faster in this sample.                                                                 | `npm run bench:cli`                                                                                                  |
| [Audit and fuzz](docs/benchmarks/issue-31-security.md) · [fuzz results](docs/benchmarks/issue-31-security-fuzz.md) | 100k tracked paths: 111.1 ms p50 / 141.7 ms p95. The bounded 1,290-case hostile-input corpus passed.                                                                                    | `npm run bench:security` and `npm run security:fuzz`                                                                 |
| [Transactions](docs/benchmarks/issue-32-transactions.md)                                                           | 10k-file apply p50 was 6.27 s vs 1.98 s on v3.0.0. The added time reflects durable staging and flushes. 8- and 32-process writer tests had no lost writes.                              | `npm run bench:transactions`                                                                                         |
| [Upgrades](docs/benchmarks/issue-33-upgrades.md)                                                                   | At 10k files, plan p50 was 82.1 ms vs 46.9 ms on v3.0.0; no speedup is claimed.                                                                                                         | `npm run bench:upgrades`                                                                                             |
| [Capabilities](docs/benchmarks/issue-34-capabilities.md)                                                           | Dense 10k-node / 99,945-edge graph p50 was 9.19 ms. Ten BullMQ jobs completed at 2.00 ms p50 / 6.65 ms p95.                                                                             | `npm run bench:capabilities`; live Redis checks require Docker Compose and `redis:8-alpine`.                         |
| [Orchestration](docs/benchmarks/issue-35-orchestration.md)                                                         | Two projects reached readiness in 19.96 s; two warm preview stages in 68.28 s. These are single-host observations.                                                                      | Follow the packed CLI and Docker Compose steps in the report; no standalone script is provided.                      |
| [Generators](docs/benchmarks/issue-36-generators.md)                                                               | Concurrent owned/cross-owner updates used two owner-scoped `UPDATE`s and no pre-read. Each keyset page used one bounded `SELECT`. This is a query-count check, not a latency benchmark. | `npm run template:smoke`; PostgreSQL required.                                                                       |
| [Complexity](docs/benchmarks/issue-37-complexity.md)                                                               | Service scheduling: O((V+E) log V). Extension ordering: O(V+E). Streaming file hashing: O(B) time with a bounded buffer.                                                                | `npm run bench:complexity`                                                                                           |
| [Release qualification](docs/benchmarks/issue-38-qualification.md)                                                 | At 250k files, candidate drift p50 was 36.41 s vs 2.53 s on v3.0.0 (14.41× slower on this host). No general performance gain is claimed.                                                | `npm run build && npm run bench:qualification`; PostgreSQL, Docker and temporary disk for up to 250k files required. |

Optional 128-writer and 1,000-fault-trial stress targets were not run and are not claimed as achieved. For baseline comparisons, the reports document how to set `LAUNCHSTACK_BENCH_REPO` or `LAUNCHSTACK_BENCH_BASELINE_REPO` to a local v3.0.0 checkout.

## Development and release checks

```bash
npm ci
npm run check
npm run release:check
npm run docker:template:smoke
```

`release:check` runs formatting, lint, strict typechecking, tests, bounded security fuzzing, reproducible distribution checks, package inspection, runtime dependency audit, SBOM validation, packed CLI smoke and a PostgreSQL-backed generated-project smoke. `docker:template:smoke` builds and checks the generated production container.

Publishing is guarded by a manually dispatched workflow on `main`, requires `authorize_publication=true` and uses the protected `npm-publish` environment. A merge or tag push alone does not publish. Read [the release process](docs/RELEASING.md) and [the full issue ledger](docs/release/ISSUES_30_39.md).

## Maintainers

LaunchStack CLI is an open-source project built and maintained by [Zivora Labs](https://www.zivoralabs.xyz).

- Project page: [Zivora Labs Open Source](https://www.zivoralabs.xyz/open-source/launchstack-cli)
- Lead maintainer: [Williams Ashibuogwu](https://github.com/wbizmo)
- License: [MIT](LICENSE)
- Copyright: Zivora Labs
