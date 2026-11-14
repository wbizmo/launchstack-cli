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

## Command reference

- **Create and configure projects:** `create`, `init`, `validate`, `env`, `provider`, `doctor`.
- **Manage project state:** `plan`, `apply`, `reconcile`, `diff`, `upgrade`.
- **Add capabilities and plugins:** `add`, `plugin list`, `plugin validate`, `plugin add`, `plugin upgrade`, `plugin remove`.
- **Develop and generate code:** `dev`, `client generate`, `generate module`, `generate resource`.
- **Audit and manage preview stages:** `audit`, `preview`, `stage status`, `destroy`, `status --stage`, `deploy --stage`.
- **Deployment and configuration workflows:** `deploy`, `status`, `history`, `rollback`, `secrets add`, `secrets list`, `secrets remove`, `docker init`, `github init`.
- **CLI help:** `help`.

This reference includes every top-level command and nested subcommand. Use `launchstack --help` to list them, `launchstack help <command>` for command help, or `launchstack <command> --help` to see that command's options. Use `launchstack --version` to print the installed version.

## Capabilities and lifecycle

### What v3.0.4 adds and improves

Version 3.0.4 hardens the CLI, generated API and release tooling. It updates supported runtimes to Node.js 24 and 26, updates security-sensitive dependencies, keeps the generated API compatible with Prisma 6, and aligns Docker images and CI with the supported Node versions. Security improvements cover managed paths, secret files, transaction journals and locks, remote OpenAPI DNS validation, bounded audit inputs and generated SDK output. Lifecycle changes add durable mutation recovery, explicit project migrations, safer concurrent capability updates, improved capability assembly, isolated local orchestration and preview stages, bounded owner-scoped resource pagination, and streaming/hash and graph complexity checks. Release qualification adds Windows portability, CodeQL, SBOM validation, generated-project and Docker checks, and reproducible benchmark reports.

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
launchstack preview preview-demo
launchstack deploy --stage preview-demo
launchstack status --stage preview-demo --json
launchstack destroy --stage preview-demo
```

Audit findings have stable rule IDs and severities. The optional `--advisories` mode queries the npm registry; if that evidence cannot be obtained, the audit reports it as incomplete. Secret-looking tracked paths are heuristic findings: LaunchStack checks filenames, not file contents. Git path enumeration is capped at 16 MiB and 10 seconds.

Docker Compose is the complete preview lifecycle adapter in v3. Other provider adapters report unsupported lifecycle operations explicitly. `launchstack deploy` without `--stage` prepares and validates artifacts.

## Generated API security baseline

Generated APIs include database-enforced single-use refresh-token rotation, duplicate-registration race handling, bounded authentication payloads, auth rate limiting, explicit production CORS, startup JWT validation, non-root Docker images and PostgreSQL-backed concurrency tests. The default rate-limit store is in-memory per process; multi-replica deployments need a shared Fastify rate-limit store.

The generated API exposes Swagger UI at `/docs`, health at `/health` and readiness at `/ready`.

## v3.0.4 benchmarks

Full results, methodology, reproduction commands and limitations are in the [benchmark documentation](docs/benchmarks/README.md). Measured v3.0.4 results include:

- **Runtime:** warm `--version` p50 was 5.7% slower than v3.0.0; warm `--help` p50 was 1.4% faster. No consistent startup speedup was measured.
- **Security:** scanning 100,000 tracked paths took 111.1 ms p50 / 141.7 ms p95. The bounded hostile-input corpus passed 1,290 cases.
- **Transactions:** applying 10,000 file changes took 6.27 s p50 vs. 1.98 s on v3.0.0. Tests with 8 and 32 concurrent writer processes lost no updates.
- **Upgrades:** planning a 10,000-file migration took 82.1 ms p50 vs. 46.9 ms on v3.0.0.
- **Capabilities:** a 10,000-node / 99,945-edge graph resolved in 9.19 ms p50. Ten BullMQ jobs completed at 2.00 ms p50 / 6.65 ms p95.
- **Orchestration:** two generated projects reached readiness in 19.96 s; two warm preview stages completed in 68.28 s.
- **Generators:** concurrent owned and cross-owner updates used two owner-scoped `UPDATE` queries with no pre-read; each keyset page used one bounded `SELECT`.
- **Complexity:** service scheduling is O((V+E) log V), extension ordering O(V+E), and streaming hashing O(B) time with a bounded buffer.
- **Release qualification:** at 250,000 files, drift-scan p50 was 36.41 s vs. 2.53 s on v3.0.0 (14.41× slower on this host).

## Development checks

```bash
npm ci
npm run check
npm run release:check
npm run docker:template:smoke
```

`release:check` runs formatting, lint, strict typechecking, tests, bounded security fuzzing, reproducible distribution checks, package inspection, runtime dependency audit, SBOM validation, packed CLI smoke and a PostgreSQL-backed generated-project smoke. `docker:template:smoke` builds and checks the generated production container.

## Maintainers

LaunchStack CLI is an open-source project built and maintained by [Zivora Labs](https://www.zivoralabs.xyz).

- Project page: [Zivora Labs Open Source](https://www.zivoralabs.xyz/open-source/launchstack-cli)
- Lead maintainer: [Williams Ashibuogwu](https://github.com/wbizmo)
- License: [MIT](LICENSE), maintained by Zivora Labs
