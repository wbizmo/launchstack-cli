# LaunchStack CLI 3.0.5

LaunchStack CLI 3.0.5 is a hotfix release focused on project mutation reliability and day-to-day CLI behavior.

## Fixes and improvements

- Project mutations use an atomic directory lock, avoiding hard-link requirements on FUSE, network and restricted filesystems. Stale-owner detection and concurrent writer serialization remain in place.
- Existing lock files from older CLI releases remain compatible while live. If one is stale, the CLI asks the user to verify no mutation is running and remove that legacy lock; new directory locks recover stale owners automatically.
- `launchstack validate` reads and validates v3 `launchstack.json` project manifests and retains support for legacy `launchstack.config.json` files.
- `launchstack create <name> --directory <parent>` now creates `<parent>/<name>`. Add `--verbose` to see the generation stages.
- The declared runtime floor is Node.js 24.22.0 or later in the 24.x line, or Node.js 26.13.0 or later in the 26.x line. CI and Docker continue to use current patched Node.js 24 and 26 releases.
- Capability documentation distinguishes complete local wiring for Redis, queue and cron from helper-only OAuth, storage, observability, WebSocket, email and webhook support.

## Verification

`npm run release:check` passed on Node.js 24.22.1 and Node.js 26.13.1, each with PostgreSQL 17. Both runs passed formatting, lint, typecheck, 43 test files / 186 tests, the 1,290-case security corpus, reproducible distribution build, package inspection, production dependency audit (zero vulnerabilities), 23-component SBOM validation, packed CLI smoke and generated-project smoke. Each generated API check passed 9 test files / 28 tests, Prisma 6.19.3 generation, TypeScript build and production dependency audit. Node.js 26.13.1 ran in an Alpine container.

`npm run docker:template:smoke` passed: the generated production image passed its healthcheck and PostgreSQL readiness probe. The transaction benchmark ran three isolated samples each at 100, 1,000 and 10,000 files; p50 was 82.7 ms, 546.5 ms and 5.12 s, with 6.19 s p95 at 10,000 files. The full measurements, memory samples and methodology are in [`docs/benchmarks/transactions.md`](docs/benchmarks/transactions.md). This Node.js 24.22.1 run is not directly comparable with v3.0.4's separate host sample. CI remains configured for both supported Node.js lines.

## Runtime and installation

```bash
npm install --global launchstack-cli@3.0.5
launchstack --version
```

See the [README](README.md), [compatibility guide](docs/COMPATIBILITY.md), [capability guide](docs/CAPABILITIES.md) and [release process](docs/RELEASING.md) for command usage and supported runtimes.
