# LaunchStack CLI v2.1.0

Release date: 2026-09-14

v2.1.0 is a hardening release focused on making the package users install match the security guarantees in source, strengthening generated authentication under concurrency, and turning the release pipeline into an artifact-level quality gate.

## Highlights

### The published artifact is now authoritative

LaunchStack verifies the result of `npm pack` from a clean install. The release gate checks that the installed client refuses unsafe HTTP origins, embedded URL credentials, and redirects that could forward API credentials. It also verifies that `launchstack --version` matches the package version and fails when committed `dist/` output is stale relative to source.

### Safer local secret handling

`launchstack secrets add` no longer accepts the secret value as a positional argument. Values are entered through hidden interactive input or `--stdin`, written atomically, stored with restrictive permissions where supported, and excluded from generated Git/Docker contexts.

### Database-enforced refresh-token rotation

Generated APIs consume refresh tokens conditionally inside a Prisma transaction and create the successor token in that same transaction. A database-backed concurrency test proves that two simultaneous refreshes using one parent token produce exactly one successful rotation.

### Generated API security baseline

Generated APIs now include auth-route rate limiting, bounded auth inputs, explicit production CORS rules, startup JWT duration validation, duplicate-email race handling, and a patched Swagger UI/static dependency line.

### Honest deployment state

`launchstack deploy` builds and verifies deployment artifacts but records them as `prepared` until a remote provider adapter confirms deployment success. Prepared artifacts are not presented as successful rollback targets.

### Hardened generation and Docker output

Project generation is staged transactionally before the destination is replaced. Template substitution is single-pass and avoids decoding binary/static assets as text. `launchstack docker init` and generated API projects now share a canonical Docker renderer with lockfile-driven installs, multi-stage builds, production-only runtime dependencies, secret-safe build contexts, and a non-root runtime user.

### Reproducible, verified releases

The repository now uses lockfile-first CI, intentional semver ranges, Node.js 20-compatible runtime dependencies, linting, TypeScript typechecking, deterministic build-artifact checks, packed-artifact smoke tests, generated-project smoke tests, PostgreSQL-backed concurrency checks, and runtime vulnerability audits.

When a new version reaches `main`, the publish workflow reruns the full release gate, verifies the versioned release notes, creates the matching `v<version>` tag at the exact merged commit, publishes to npm with provenance using the `LAUNCHSTACK_NPM_TOKEN` repository secret, and creates the GitHub Release titled `LaunchStack CLI v<version>` from this file.

## GitHub issues addressed

This release implements the correctness/security/performance hardening backlog tracked in issues #2 through #18, including credential-forwarding release integrity, secret storage, refresh-token concurrency, vulnerable generated dependencies, auth hardening, CORS, duplicate registration races, CI/release gating, deployment semantics, supply-chain reproducibility, JWT configuration validation, CLI version drift, transactional generation, template performance, Git subprocess reduction, Docker hardening, and provider consistency.

## Breaking/behavior changes

- `launchstack secrets add API_KEY value` is replaced by `launchstack secrets add API_KEY` (hidden prompt) or `launchstack secrets add API_KEY --stdin`.
- `launchstack deploy` no longer records a local build as a successful remote deployment; it records `prepared` until remote confirmation exists.
- Production generated APIs require explicit CORS origins by default.

## Release verification

The release candidate must pass:

```bash
npm ci
npm run release:check
```

The merged `main` commit is verified again before tag creation or npm publishing. No release is considered complete until the exact merged commit has a green release gate and the npm/GitHub release workflow succeeds.
