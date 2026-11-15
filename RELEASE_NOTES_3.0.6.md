# LaunchStack CLI 3.0.6

LaunchStack CLI 3.0.6 improves concurrent project mutations, production auditing and runtime feedback. It also documents generated Docker builds that need a custom certificate authority.

## Fixes and improvements

- Capability mutations now replan while holding the project lock. Concurrent independent installs are serialized against the latest manifest and state, keeping their generated files and metadata together.
- Production audit checks base and production Compose configuration together, so required CORS and JWT settings inherited from the base file do not produce false findings.
- Audit distinguishes a project outside a Git repository from actual path enumeration failures and resource bounds. The non-Git notice explains that tracked-file secret checks could not run and how to include them.
- Commands on unsupported Node.js versions now stop with an actionable message. `--help` and `--version` remain available. Supported versions are Node.js 24.22.0+ and 26.13.0+ within their respective major lines.
- The [Docker guide](docs/DOCKER.md) shows how to provide a custom CA to generated production builds through a BuildKit secret without adding it to the image.

## Verification

The v3.0.5 package was installed from npm and exercised through project creation, validation, capability installation, client and resource generation, reconciliation, upgrade planning, dependency installation, generated-project checks, PostgreSQL-backed authentication flows and production Docker health/readiness checks. Database tests passed 26/26; generated project checks passed 24 tests with 2 database tests skipped in the separate no-database workspace. The custom CA was provided to BuildKit as a secret for the Docker build.

The local v3.0.6 release gate passed on Node.js 24.22.1 with PostgreSQL 16. Formatting, lint, strict typechecking, 44 root test files / 198 tests, the 1,290-case security corpus, reproducible distribution build, package inspection, production dependency audit (zero vulnerabilities), 23-component SBOM validation, packed CLI smoke and generated-project smoke all passed. Generated API checks passed 9 test files / 28 tests, Prisma 6.19.3 generation, database schema sync, TypeScript build and production dependency audit. The production Docker image passed health and PostgreSQL readiness checks with the custom CA passed to BuildKit as a secret. Runtime checks printed the version on Node.js 24.22.3 and 26.13.1, allowed help/version on Node.js 20.18.0, and returned the documented compatibility error for a Node.js 20 command.

The capability mutation benchmark measured one transaction installing 1, 10 and 100 synthetic file-only capabilities at 20.518 ms, 20.921 ms and 96.562 ms p50. General transaction runs at 100, 1,000 and 10,000 files measured 110.175 ms, 727.163 ms and 6.062 s p50. The 10,000-file p95 was 6.277 s. Workloads, machine details and limitations are in the [benchmark documentation](docs/benchmarks/README.md).

## Install

```bash
npm install --global launchstack-cli@3.0.6
launchstack --version
```

See the [README](README.md), [compatibility guide](docs/COMPATIBILITY.md), [Docker guide](docs/DOCKER.md) and [release history](docs/RELEASE_HISTORY.md) for usage and supported runtimes.
