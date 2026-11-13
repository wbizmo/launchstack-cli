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

## Verification

- Root `release:check` passed on Node 24.22.3 and 26.13.1; generated API integration checks passed on PostgreSQL 16 and 17 respectively.
- Production dependency audits reported zero vulnerabilities for both the CLI and generated API.
- The generated production Docker image passed its healthcheck and `/health` request.
- The v3.0.0-to-candidate CLI comparison is recorded in `docs/benchmarks/issue-30-runtime.md`. It shows no consistent startup speedup.

## Compatibility and limitations

This release remains in development pending the remaining issue batches, full review and release qualification.
