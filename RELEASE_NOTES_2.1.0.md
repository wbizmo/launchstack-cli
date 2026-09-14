# LaunchStack CLI v2.1.0

Release date: 2026-09-14

v2.1.0 is a hardening release focused on making the package users install match the security guarantees in source, strengthening generated authentication under concurrency, and turning the release pipeline into an artifact-level quality gate.

## Highlights

### The published artifact is now authoritative

LaunchStack now verifies the result of `npm pack` from a clean install. The release gate checks that the installed client refuses unsafe HTTP origins, embedded URL credentials, and redirects that could forward API credentials. It also verifies that `launchstack --version` matches the package version.

### Safer local secret handling

`launchstack secrets add` no longer accepts the secret value as a positional argument. Values are entered through hidden interactive input or `--stdin`, written atomically, stored with restrictive permissions where supported, and excluded from generated Git/Docker contexts.

### Database-enforced refresh-token rotation

Generated APIs now consume refresh tokens conditionally inside a Prisma transaction and create the successor token in that same transaction. A database-backed concurrency test proves that two simultaneous refreshes using one parent token produce exactly one successful rotation.

### Generated API security baseline

Generated APIs now include auth-route rate limiting, bounded auth inputs, explicit production CORS rules, startup JWT duration validation, duplicate-email race handling, and a patched Swagger UI/static dependency line.

### Honest deployment state

`launchstack deploy` builds and verifies deployment artifacts but records them as `prepared` until a remote provider adapter confirms deployment success. Prepared artifacts are not presented as successful rollback targets.

### Reproducible releases

The repository now uses lockfile-first CI, intentional semver ranges, a real lint gate, npm package provenance, packed-artifact smoke tests, generated-project smoke tests, database-backed concurrency checks, and runtime vulnerability audits.

## GitHub issues addressed

This release implements the correctness/security/performance hardening backlog tracked in issues #2 through #18, including credential-forwarding release integrity, secret storage, refresh-token concurrency, vulnerable generated dependencies, auth hardening, CORS, duplicate registration races, CI/release gating, deployment semantics, supply-chain reproducibility, JWT configuration validation, CLI version drift, transactional generation, template performance, Git subprocess reduction, Docker hardening, and provider consistency.

## Breaking/behavior changes

- `launchstack secrets add API_KEY value` is replaced by `launchstack secrets add API_KEY` (hidden prompt) or `... --stdin`.
- `launchstack deploy` no longer records a local build as a successful remote deployment; it records `prepared` until remote confirmation exists.
- Production generated APIs require explicit CORS origins by default.

## Release verification

Before publishing v2.1.0:

```bash
npm ci
npm run release:check
```

Publishing is triggered by the `v2.1.0` Git tag only after the release gate passes. The GitHub Actions workflow uses the repository secret `LAUNCHSTACK_NPM_TOKEN` as npm's `NODE_AUTH_TOKEN` and publishes with provenance.
