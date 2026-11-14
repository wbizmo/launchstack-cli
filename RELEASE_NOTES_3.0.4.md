# LaunchStack CLI 3.0.4

**Released:** 2026-11-14

## Verified changes

- Establishes supported Node.js 24.22.3 and 26.13.1 patch baselines, based on the Node.js release index dated 2026-11-10. Node 20 support is removed. This is a breaking runtime support change and is not semver-compatible with a patch release; it is recorded explicitly for review.
- Moves root and generated API container builds to Node 24.22.3. Generated API CI tests Node 24.22.3 and 26.13.1.
- Requires explicit CORS origins and JWT secrets in production Compose configuration.
- Copies the generated healthcheck script into the generated production image.
- Upgrades Zod to 4.6.7 to address the high severity advisory affecting versions below 4.6.6.
- Pins production Node images by digest and carries the generated healthcheck script into the nonroot runtime image.
- Keeps Prisma at 6.19.3, the latest Prisma 6 release. Prisma 7's new client and datasource configuration need a separately tested migration to preserve current generated-project compatibility.
- Rejects malformed recovery journals before touching project or external paths, protects the secret store from symlinks and permissive POSIX modes, and gives new projects unique development JWT secrets.
- Binds generated local services to loopback and expands audit checks for runtime policies, lockfiles and production Compose settings. `launchstack audit --advisories` adds npm registry evidence for production dependencies and reports LS024 when the check cannot complete.
- Marks secret-looking tracked filenames as heuristic findings, bounds Git path enumeration to 16 MiB / 10 seconds and emits LS022 when enumeration is incomplete. LS005 does not inspect file contents. The measured 1k–100k audit results are in `docs/benchmarks/security-audit.md`.
- Rejects non-public IP addresses across all remote OpenAPI DNS answers and pins HTTPS connections to the validated answers to prevent DNS rebinding.
- Serializes stale transaction-lock reclamation by lock inode and treats unreadable Linux process identity as unverifiable/live. Cross-platform absolute path forms are rejected consistently.
- Replaces the root Docker image with a non-root Node 24 CLI image that invokes `dist/cli.js`; the Docker smoke checks both the CLI image and generated API production health/readiness.
- Adds bounded deterministic security corpus checks under a 128 MiB V8 heap and 15 second timeout. The recorded 1,290-case run is in `docs/benchmarks/security-fuzz.md`; it is not coverage-guided fuzzing.
- Documents that generated API rate limiting uses an in-memory per-process store by default; multi-replica deployments need shared storage.
- Sanitizes generated operation-key literals, uses a fixed CLI generation failure message, and suppresses smoke-test exception details that may include inherited environment values.
- Uses a versioned crash-recovery journal, durable file and directory flushes, lock identity checks, compare-and-swap preconditions and one transaction for multi-capability installs.
- Retries transient lock identity changes when one writer releases and another acquires the project lock; independent 8/32 process writer tests cover the handoff.
- Measures 100 / 1,000 / 10,000 file mutations against v3.0.0 and verifies 8 / 32 concurrent writer processes. The measured durability latency cost is documented in `docs/benchmarks/transactions.md`.
- Registers the explicit v2.0.0-to-v3.0.0 template upgrade, preserves unrelated TypeScript edits through AST-based integration, tracks shared-file migration bases and reports exact read-only plan diffs.
- Orders migration chains by declared dependencies and validates manifest/state version preconditions and postconditions; synthetic multi-edge chain ordering and mismatched state versions are covered by tests.
- Records the measured v2 upgrade-plan latency and memory comparison at 100 / 1,000 / 10,000 managed files in `docs/benchmarks/upgrades.md`.
- Assembles capability Compose fragments into a validated file consumed by `launchstack dev`, and resolves package and lockfile writes together before committing the transaction.
- Generates a BullMQ worker and cron scheduler with health-checked Redis startup and graceful process shutdown; documents OAuth, storage, observability, WebSocket, email and webhook helpers as helper-only.
- Prevents removal of capabilities still required by another installed capability and removes generated worker/scheduler scripts safely.
- Records 1k/10k-node and up to 100k-edge dependency planning, Redis readiness/shutdown and ten BullMQ roundtrips in `docs/benchmarks/capabilities.md`.
- Gives development and preview projects unique Compose namespaces and dynamically allocated loopback ports; health checks wait for the API, worker and scheduler readiness endpoints.
- Runs generated development migrations only on loopback databases, adds explicit local reset and seed safeguards, and emits structured service status.
- Includes an optional generic local HTTP mock for development adapters, with an explicit note that it does not reproduce provider behavior.
- Tracks child process groups through unexpected parent exit, cleans only the owned Compose project on failure or signals, and keeps database volumes during ordinary development shutdown.
- Supports concurrent preview stages with collision-resistant resource identities, serialized port assignment, merged state updates and temporary BuildKit CA secrets when the host Node runtime supplies a certificate path.
- Allocates Redis capability ports per environment and includes capability services throughout preview stage creation, inspection and teardown.
- Verified two concurrent generated projects and two concurrent Docker preview stages from the packed candidate. Actual startup measurements and the comparison limits are in `docs/benchmarks/orchestration.md`.
- Verified that occupied API and Redis defaults reassign safely and that the queue worker completes a real job through the dynamically configured Redis port.
- Makes generated resource updates atomic with the owner predicate at the database mutation. Read/update/delete continue to return non-disclosing not-found responses for another owner. Lists use a bounded indexed keyset and return `items`, `hasNext` and `nextCursor`; tied timestamps and deletion between pages are covered against PostgreSQL.
- Validates resource names, Prisma fields and generated route-prefix collisions before applying writes.
- Generates SDKs from bounded OpenAPI 3.0/3.1 documents with local references, nullable and composed schemas, enums, parameter groups and response variants. All three targets are compiled and exercised with a fixture request server.
- Scopes generated React query keys by canonical API base URL, operation method/path and caller-provided cache identity.
- Observed database query counts and limits are recorded in `docs/benchmarks/generators.md`.
- Keeps deterministic service ordering with heap-based scheduling at O((V+E) log V), and resolves extension dependency graphs in O(V+E) using an explicit stack that retains actionable cycle paths.
- Hashes managed files in fixed 64 KiB chunks, records the file-byte cost and drift-report sorting in the README, and reuses one operation list while rendering OpenAPI client sections.
- Adds structural tests for 10,000 service vertices, a 12,000-node extension chain, 24 MiB file hashing and descriptor cleanup. The complexity benchmark records graph/hash comparisons, process resource measurements and a V8 CPU profile in `docs/benchmarks/complexity.md`.

## Release qualification and controls

- Adds the full release qualification harness and measured 250,000-file drift, graph, mutation, recovery, upgrade, packed CLI and generated API/PostgreSQL workloads. See [`docs/benchmarks/qualification.md`](docs/benchmarks/qualification.md) and the raw JSON. Measurements are single-host diagnostics; they are not performance targets or guarantees.
- Matched CLI runs on v3.0.0 commit `f76996cc0c3d125abcb1e6f998d2cc037c02b140` and the v3.0.4 candidate show higher startup and generation times in this sample. The candidate template contains 111 files versus 71 in v3.0.0, so raw generation totals are not normalized.
- Adds the v3.0.4 engineering summary and compatibility policy in `docs/release/V3.0.4_RELEASE_SUMMARY.md` and `docs/COMPATIBILITY.md`.
- Adds Prettier, SBOM, Windows portability and CodeQL release/CI checks. npm publishing is restricted to a manually dispatched workflow on `main` with `authorize_publication=true` and the protected `npm-publish` environment.
- Fixes generated Compose and Render project-name placeholders and uses a Compose reset override to remove the development PostgreSQL host port from production. The local generated production image now passes its container health check and PostgreSQL readiness request.
- The merged release passed local `release:check` on Node 24.22.3 and 26.13.1, and the production Docker image passed health/readiness checks. GitHub CI, Windows portability, TypeScript analysis and CodeQL passed. CodeRabbit skipped the full diff at its 100-file limit. The two documented limitations below are accepted for v3.0.4. See [LaunchStack CLI v3.0.4](https://github.com/wbizmo/launchstack-cli/releases/tag/v3.0.4).

## Verification

- Post-merge `main` release checks passed on Node 24.22.3/PostgreSQL 16 and Node 26.13.1/PostgreSQL 17: 42 root test files / 179 tests and 9 generated-project test files / 28 tests on each runtime. The 1,290-case security corpus passed with observed peak RSS of 91.4 MiB and 96.0 MiB respectively.

- Root `release:check` passed on Node 24.22.3 and 26.13.1; generated API integration checks passed on PostgreSQL 16 and 17 respectively.
- After orchestration work, full `release:check` passed on both runtimes with 38 root test files / 137 tests and 8 generated API test files / 26 tests; both production dependency audits reported zero vulnerabilities.
- Production dependency audits reported zero vulnerabilities for both the CLI and generated API.
- The generated production Docker image passed its healthcheck and `/health` request.
- Final GitHub CI and CodeQL pass on merged `main`. The v3.0.0-to-candidate CLI comparison is recorded in `docs/benchmarks/runtime.md`; it shows no consistent startup speedup.
- At 100k and 250k managed files, the candidate upgrade drift scan is substantially slower than the single-sample v3.0.0 baseline on this host after file/path safety checks. The direct comparison and limitations are recorded in `docs/benchmarks/qualification.md`; no speedup is claimed.
- The Node 24.22.3 full release check passed with PostgreSQL 16, including 36 CLI test files / 119 tests and 8 generated API test files / 26 tests.
- At the intermediate generator work checkpoint, focused checks passed on Node 24.22.3: 2 test files / 13 tests, and the generated project smoke passed 9 files / 28 tests plus PostgreSQL CRUD/pagination checks, build and production audit. The later full release qualification is recorded above.
- Node 24.22.3 `release:check` passed: 38 root test files / 145 tests, lint, typecheck, reproducible dist, npm pack dry run, packed CLI smoke, zero-vulnerability runtime audit, and the 9-file / 28-test PostgreSQL-backed generated project smoke.
- Node 24.22.3 `npm run check` passed: lint, typecheck, 39 root test files / 148 tests, reproducible dist and npm pack dry run. The 10k service and extension workloads completed; the 50 MiB isolated hash workers produced matching digests and reported peak RSS of 130,125,824 bytes (read-all) and 77,901,824 bytes (streaming).

## Published benchmark reports

All reports and machine-readable results are in the public [v3.0.4 source tag](https://github.com/wbizmo/launchstack-cli/tree/v3.0.4/docs/benchmarks). Run `npm ci` first, use Node 24.22.3 for the recorded benchmark environment, and set `NPM_CONFIG_CACHE` to a writable directory. Results below are host-specific diagnostics, not guarantees.

| Report                                                                                | Recorded result                                                                                                                            | Reproduction command                                                                                                 |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [Runtime](docs/benchmarks/runtime.md)                                                 | No consistent startup speedup; warm `--version` p50 was 5.7% slower and `--help` p50 1.4% faster in this sample.                           | `npm run bench:cli`                                                                                                  |
| [Audit](docs/benchmarks/security-audit.md) · [fuzz](docs/benchmarks/security-fuzz.md) | 100k tracked paths: 111.1 ms p50 / 141.7 ms p95; 1,290 bounded hostile-input cases passed.                                                 | `npm run bench:security` and `npm run security:fuzz`                                                                 |
| [Transactions](docs/benchmarks/transactions.md)                                       | 10k-file apply p50 was 6.27 s vs 1.98 s on v3.0.0; durable staging/flushes add cost. Eight and 32 process writer tests had no lost writes. | `npm run bench:transactions`                                                                                         |
| [Upgrades](docs/benchmarks/upgrades.md)                                               | At 10k files, plan p50 was 82.1 ms vs 46.9 ms on v3.0.0; no speedup is claimed.                                                            | `npm run bench:upgrades`                                                                                             |
| [Capabilities](docs/benchmarks/capabilities.md)                                       | Dense 10k-node / 99,945-edge graph p50 was 9.19 ms; ten BullMQ jobs completed at 2.00 ms p50 / 6.65 ms p95.                                | `npm run bench:capabilities`; live Redis/queue checks require Docker Compose and `redis:8-alpine`.                   |
| [Orchestration](docs/benchmarks/orchestration.md)                                     | Two generated projects reached readiness in 19.96 s; two warm preview stages in 68.28 s.                                                   | Reproduce with the packed-CLI and Docker Compose scenarios described in the report; no standalone script exists.     |
| [Generators](docs/benchmarks/generators.md)                                           | Concurrent owned/cross-owner updates used two owner-scoped `UPDATE`s and no pre-read; each keyset page used one bounded `SELECT`.          | `npm run template:smoke`; PostgreSQL is required.                                                                    |
| [Complexity](docs/benchmarks/complexity.md)                                           | Scheduler: O((V+E) log V); extension ordering: O(V+E); streaming file hashing: O(B) time with a bounded buffer.                            | `npm run bench:complexity`                                                                                           |
| [Release qualification](docs/benchmarks/qualification.md)                             | At 250k files, candidate drift p50 was 36.41 s vs 2.53 s baseline (14.41× slower on this host); API results and limits are in the report.  | `npm run build && npm run bench:qualification`; requires PostgreSQL, Docker and temporary disk for up to 250k files. |

For the complete release gate, use `npm run release:check` on Node 24.22.3 and 26.13.1 with PostgreSQL; run `npm run docker:template:smoke` with a working Docker daemon. Optional 128-writer and 1,000-fault-trial targets were not run and are not claimed as achieved.

## Compatibility and limitations

Project mutations reject static symlink traversal and serialize LaunchStack writers; portable path-based mutations do not guarantee confinement against a separate same-user process actively swapping parent directories during rename. Do not treat a concurrently hostile project tree as a supported trust boundary. Generated API rate limiting uses an in-memory per-process store by default, so multi-replica deployments need a shared Fastify rate-limit store. These two limitations are accepted for v3.0.4 and must be considered when deploying into those environments.
