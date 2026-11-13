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
- Binds generated local services to loopback and expands audit checks for runtime policies, lockfiles and production Compose settings.
- Uses a versioned crash-recovery journal, durable file and directory flushes, lock identity checks, compare-and-swap preconditions and one transaction for multi-capability installs.
- Measures 100 / 1,000 / 10,000 file mutations against v3.0.0 and verifies 8 / 32 concurrent writer processes. The measured durability latency cost is documented in `docs/benchmarks/issue-32-transactions.md`.
- Registers the explicit v2.0.0-to-v3.0.0 template upgrade, preserves unrelated TypeScript edits through AST-based integration, tracks shared-file migration bases and reports exact read-only plan diffs.
- Records the measured v2 upgrade-plan latency and memory comparison at 100 / 1,000 / 10,000 managed files in `docs/benchmarks/issue-33-upgrades.md`.

## Verification

- Root `release:check` passed on Node 24.22.3 and 26.13.1; generated API integration checks passed on PostgreSQL 16 and 17 respectively.
- Production dependency audits reported zero vulnerabilities for both the CLI and generated API.
- The generated production Docker image passed its healthcheck and `/health` request.
- The v3.0.0-to-candidate CLI comparison is recorded in `docs/benchmarks/issue-30-runtime.md`. It shows no consistent startup speedup.
- The Node 24.22.3 full release check passed with PostgreSQL 16, including 36 CLI test files / 119 tests and 8 generated API test files / 26 tests.

## Compatibility and limitations

This release remains in development pending the remaining issue batches, full review and release qualification.
