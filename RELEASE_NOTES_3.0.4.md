# LaunchStack CLI 3.0.4

**Draft / Unreleased**

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
- Marks secret-looking tracked filenames as heuristic findings, bounds Git path enumeration to 16 MiB / 10 seconds and emits LS022 when enumeration is incomplete. LS005 does not inspect file contents. The measured 1k–100k audit results are in `docs/benchmarks/issue-31-security.md`.
- Rejects non-public IP addresses across all remote OpenAPI DNS answers and pins HTTPS connections to the validated answers to prevent DNS rebinding.
- Serializes stale transaction-lock reclamation by lock inode and treats unreadable Linux process identity as unverifiable/live. Cross-platform absolute path forms are rejected consistently.
- Replaces the root Docker image with a non-root Node 24 CLI image that invokes `dist/cli.js`; the Docker smoke checks both the CLI image and generated API production health/readiness.
- Adds bounded deterministic security corpus checks under a 128 MiB V8 heap and 15 second timeout. The recorded 1,290-case run is in `docs/benchmarks/issue-31-security-fuzz.md`; it is not coverage-guided fuzzing.
- Documents that generated API rate limiting uses an in-memory per-process store by default; multi-replica deployments need shared storage.
- Sanitizes generated operation-key literals, uses a fixed CLI generation failure message, and suppresses smoke-test exception details that may include inherited environment values.
- Uses a versioned crash-recovery journal, durable file and directory flushes, lock identity checks, compare-and-swap preconditions and one transaction for multi-capability installs.
- Retries transient lock identity changes when one writer releases and another acquires the project lock; independent 8/32 process writer tests cover the handoff.
- Measures 100 / 1,000 / 10,000 file mutations against v3.0.0 and verifies 8 / 32 concurrent writer processes. The measured durability latency cost is documented in `docs/benchmarks/issue-32-transactions.md`.
- Registers the explicit v2.0.0-to-v3.0.0 template upgrade, preserves unrelated TypeScript edits through AST-based integration, tracks shared-file migration bases and reports exact read-only plan diffs.
- Orders migration chains by declared dependencies and validates manifest/state version preconditions and postconditions; synthetic multi-edge chain ordering and mismatched state versions are covered by tests.
- Records the measured v2 upgrade-plan latency and memory comparison at 100 / 1,000 / 10,000 managed files in `docs/benchmarks/issue-33-upgrades.md`.
- Assembles capability Compose fragments into a validated file consumed by `launchstack dev`, and resolves package and lockfile writes together before committing the transaction.
- Generates a BullMQ worker and cron scheduler with health-checked Redis startup and graceful process shutdown; documents OAuth, storage, observability, WebSocket, email and webhook helpers as helper-only.
- Prevents removal of capabilities still required by another installed capability and removes generated worker/scheduler scripts safely.
- Records 1k/10k-node and up to 100k-edge dependency planning, Redis readiness/shutdown and ten BullMQ roundtrips in `docs/benchmarks/issue-34-capabilities.md`.
- Gives development and preview projects unique Compose namespaces and dynamically allocated loopback ports; health checks wait for the API, worker and scheduler readiness endpoints.
- Runs generated development migrations only on loopback databases, adds explicit local reset and seed safeguards, and emits structured service status.
- Includes an optional generic local HTTP mock for development adapters, with an explicit note that it does not reproduce provider behavior.
- Tracks child process groups through unexpected parent exit, cleans only the owned Compose project on failure or signals, and keeps database volumes during ordinary development shutdown.
- Supports concurrent preview stages with collision-resistant resource identities, serialized port assignment, merged state updates and temporary BuildKit CA secrets when the host Node runtime supplies a certificate path.
- Allocates Redis capability ports per environment and includes capability services throughout preview stage creation, inspection and teardown.
- Verified two concurrent generated projects and two concurrent Docker preview stages from the packed candidate. Actual startup measurements and the comparison limits are in `docs/benchmarks/issue-35-orchestration.md`.
- Verified that occupied API and Redis defaults reassign safely and that the queue worker completes a real job through the dynamically configured Redis port.
- Makes generated resource updates atomic with the owner predicate at the database mutation. Read/update/delete continue to return non-disclosing not-found responses for another owner. Lists use a bounded indexed keyset and return `items`, `hasNext` and `nextCursor`; tied timestamps and deletion between pages are covered against PostgreSQL.
- Validates resource names, Prisma fields and generated route-prefix collisions before applying writes.
- Generates SDKs from bounded OpenAPI 3.0/3.1 documents with local references, nullable and composed schemas, enums, parameter groups and response variants. All three targets are compiled and exercised with a fixture request server.
- Scopes generated React query keys by canonical API base URL, operation method/path and caller-provided cache identity.
- Issue #36's observed database query counts and limits are recorded in `docs/benchmarks/issue-36-generators.md`.
- Keeps deterministic service ordering with heap-based scheduling at O((V+E) log V), and resolves extension dependency graphs in O(V+E) using an explicit stack that retains actionable cycle paths.
- Hashes managed files in fixed 64 KiB chunks, records the file-byte cost and drift-report sorting in the README, and reuses one operation list while rendering OpenAPI client sections.
- Adds structural tests for 10,000 service vertices, a 12,000-node extension chain, 24 MiB file hashing and descriptor cleanup. The issue #37 benchmark records graph/hash comparisons, process resource measurements and a V8 CPU profile in `docs/benchmarks/issue-37-complexity.md`.

## Release qualification and controls (issues #38–#39)

- Adds the full release qualification harness and measured 250,000-file drift, graph, mutation, recovery, upgrade, packed CLI and generated API/PostgreSQL workloads. See [`docs/benchmarks/issue-38-qualification.md`](docs/benchmarks/issue-38-qualification.md) and the raw JSON. Measurements are single-host diagnostics; they are not performance targets or guarantees.
- Matched CLI runs on v3.0.0 commit `f76996cc0c3d125abcb1e6f998d2cc037c02b140` and the v3.0.4 candidate show higher startup and generation times in this sample. The candidate template contains 111 files versus 71 in v3.0.0, so raw generation totals are not normalized.
- Adds the issues #30–#39 completion ledger and compatibility policy in `docs/release/ISSUES_30_39.md` and `docs/COMPATIBILITY.md`.
- Adds Prettier, SBOM, Windows portability and CodeQL release/CI checks. npm publishing is restricted to a manually dispatched workflow on `main` with `authorize_publication=true` and the protected `npm-publish` environment.
- Fixes generated Compose and Render project-name placeholders and uses a Compose reset override to remove the development PostgreSQL host port from production. The local generated production image now passes its container health check and PostgreSQL readiness request.
- Local combined `release:check` passes on Node 24.22.3 and 26.13.1. The production Docker image builds and passes health/readiness checks. GitHub PR review and CI remain to be verified on the pushed head; this release is still a draft.

## Verification

- Forensic follow-up release checks passed on Node 24.22.3/PostgreSQL 16 and Node 26.13.1/PostgreSQL 17: 42 root files / 179 tests and 9 generated-project files / 28 tests on each runtime. The 1,290-case security corpus peaked at 107.3 MiB and 112.7 MiB observed RSS respectively.

- Root `release:check` passed on Node 24.22.3 and 26.13.1; generated API integration checks passed on PostgreSQL 16 and 17 respectively.
- After issue #35, full `release:check` passed on both runtimes with 38 root test files / 137 tests and 8 generated API test files / 26 tests; both production dependency audits reported zero vulnerabilities.
- Production dependency audits reported zero vulnerabilities for both the CLI and generated API.
- The generated production Docker image passed its healthcheck and `/health` request.
- The v3.0.0-to-candidate CLI comparison is recorded in `docs/benchmarks/issue-30-runtime.md`. It shows no consistent startup speedup.
- At 100k and 250k managed files, the candidate upgrade drift scan is substantially slower than the single-sample v3.0.0 baseline on this host after file/path safety checks. The direct comparison and limitations are recorded in `docs/benchmarks/issue-38-qualification.md`; no speedup is claimed.
- At 100k and 250k managed files, the candidate upgrade drift scan is slower than the single-sample v3.0.0 baseline on this host. The direct comparison and limitations are recorded in `docs/benchmarks/issue-38-qualification.md`; no speedup is claimed.
- The Node 24.22.3 full release check passed with PostgreSQL 16, including 36 CLI test files / 119 tests and 8 generated API test files / 26 tests.
- Issue #36 focused checks passed on Node 24.22.3: 2 test files / 13 tests, and the generated project smoke passed 9 files / 28 tests plus PostgreSQL CRUD/pagination checks, generated project build and production audit. Full release qualification remains pending later batches.
- After #36, Node 24.22.3 `release:check` passed: 38 root test files / 145 tests, lint, typecheck, reproducible dist, npm pack dry run, packed CLI smoke, zero-vulnerability runtime audit, and the 9-file / 28-test PostgreSQL-backed generated project smoke.
- After #37, Node 24.22.3 `npm run check` passed: lint, typecheck, 39 root test files / 148 tests, reproducible dist and npm pack dry run. The 10k service and extension workloads completed; the 50 MiB isolated hash workers produced matching digests and reported peak RSS of 130,125,824 bytes (read-all) and 77,901,824 bytes (streaming).

## Compatibility and limitations

This release remains in development pending review and exact-head release qualification. Project mutations reject static symlink traversal and serialize LaunchStack writers; the current portable path operations do not guarantee confinement against a separate same-user process actively swapping parent directories during rename. Do not treat a concurrently hostile project tree as a supported trust boundary.
