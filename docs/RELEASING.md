# Releasing LaunchStack CLI

LaunchStack releases are produced from verified `main` commits only.

The v3.0.4 candidate supports Node.js 24.22.3 through 24.x and 26.13.1 through 26.x. Dropping Node 20 is a breaking support change; maintainers must review that semver impact before release. Production Docker base images are pinned to a reviewed Node 24.22.3 Alpine manifest digest. Update the patch and digest together with image build and health checks.

1. Update `package.json`, generated template metadata, README and `CHANGELOG.md`.
2. Add `RELEASE_NOTES_<version>.md` with the public release title/content.
3. Refresh root/template lockfiles and committed `dist/` from the exact source.
4. Run `npm ci` and `npm run release:check`.
5. Open the release PR and require the exact PR head to pass CI before merge.
6. Merge only the verified head. Require `main` CI to pass again.
7. `.github/workflows/publish.yml` verifies that `v<version>` matches `package.json`, reruns the complete release gate, creates the tag on the exact merged SHA, publishes `launchstack-cli@<version>` with npm provenance and creates/updates the GitHub Release from `RELEASE_NOTES_<version>.md`.
8. Verify the npm registry version/provenance and GitHub Release before reporting completion.

## npm credential

The workflow reads the repository secret `LAUNCHSTACK_NPM_TOKEN` and exposes it as `NODE_AUTH_TOKEN` only to npm-authenticated release steps. Never print, commit or copy the token into a release document. npm account/token policy may still require trusted publishing or an automation/granular token configured to satisfy 2FA requirements.

## Versioned notes

`CHANGELOG.md` is cumulative. Each release from v2.1.0 onward also has a root `RELEASE_NOTES_<version>.md`; GitHub Release title format is `LaunchStack CLI v<version>`.
