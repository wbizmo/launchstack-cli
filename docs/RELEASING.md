# Releasing LaunchStack CLI

LaunchStack releases are produced from a reviewed, verified `main` commit. v3.0.4 supports Node.js 24.22.3 through 24.x and 26.13.1 through 26.x. Dropping Node 20 support is a breaking support change. Production Docker base images are pinned to the reviewed Node 24.22.3 Alpine manifest digest.

## Candidate qualification

1. Update root and generated-project manifests, README, compatibility ledger and `CHANGELOG.md` without conflating package, template and migration versions.
2. Add `RELEASE_NOTES_<version>.md` and record verified changes, compatibility effects, test evidence and benchmark limits.
3. Refresh root/template lockfiles and committed `dist/` from the exact source.
4. Run `npm ci`, then `npm run release:check` on each supported Node line. CI also performs Windows portability checks, CodeQL analysis and Linux/PostgreSQL release checks.
5. Run the applicable benchmark suites and Docker production smoke separately. Record an infrastructure gate as unverified when its runner/daemon is unavailable.
6. Submit one draft for review while implementation, CI and automated review are being resolved. Confirm the final reviewed commit has green required checks and no unresolved high-priority findings.

## Explicit publication gate

`.github/workflows/publish.yml` runs only through manual `workflow_dispatch` on `main` with `authorize_publication=true`. The job is also attached to the `npm-publish` GitHub environment, where repository administrators should configure required reviewers and the npm credential. Ordinary pushes to `main` and tag pushes cannot publish. The workflow verifies that the package is exactly v3.0.4, confirms the version is not already published, reruns `release:check`, checks tag consistency, then creates the matching tag, publishes with npm provenance and creates the GitHub Release.

The boolean workflow input is an explicit release authorization. The protected environment is an additional repository-side check. The draft review must be approved by maintainers before workflow dispatch; the publish workflow does not merge code or change review state.

## npm credential

The workflow reads the repository secret `LAUNCHSTACK_NPM_TOKEN` and exposes it as `NODE_AUTH_TOKEN` only to npm-authenticated release steps. Never print, commit or copy the token into release artifacts. npm account/token policy may require a trusted publisher or an automation/granular token configured to satisfy 2FA requirements.

## Versioned notes

`CHANGELOG.md` is cumulative. Every published release has a root `RELEASE_NOTES_<version>.md`, indexed in [`RELEASE_HISTORY.md`](RELEASE_HISTORY.md); GitHub Release title format is `LaunchStack CLI v<version>`. The package version, generated-project version and project schema/migration version are maintained independently.
