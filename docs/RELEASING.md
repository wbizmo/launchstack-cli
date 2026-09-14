# Releasing LaunchStack CLI

LaunchStack releases are artifact-driven: source tests are necessary, but the package is not considered releasable until the packed npm tarball and a freshly generated API have both passed the release gate.

## Release note convention

Starting with v2.1.0, every published version gets a root-level file named:

```text
RELEASE_NOTES_<version>.md
```

For example, v2.1.0 uses `RELEASE_NOTES_2.1.0.md`. `CHANGELOG.md` remains the cumulative history; the per-version file is the detailed release narrative. Existing historical files are preserved rather than rewritten solely to match the new convention.

## Versioning

1. Update the version in root `package.json`. This is the single source of truth for the CLI version.
2. Update the generated template version when the template baseline changes.
3. Refresh the root and generated-template lockfiles.
4. Rebuild `dist/` from source.
5. Add/update `CHANGELOG.md` and `RELEASE_NOTES_<version>.md`.

The CLI version is injected from `package.json` during the tsup build, so `src/cli.ts` must not contain a manually maintained version string.

## Required verification

Run:

```bash
npm ci
npm run release:check
```

The release gate covers linting, root tests, build, npm pack inspection, a clean tarball install, CLI version verification, client credential-forwarding protections, fresh project generation, generated-project dependency installation, Prisma schema application, database-backed concurrency tests, generated-project build/tests, and runtime dependency auditing.

CI runs the same release gate against PostgreSQL before merge.

## npm publishing

Publishing is tag-driven. Push a tag that exactly matches the package version with a leading `v`:

```bash
git tag v2.1.0
git push origin v2.1.0
```

`.github/workflows/publish.yml` verifies that `GITHUB_REF_NAME` equals `v${package.version}` before it can publish.

The npm token is stored as the GitHub repository secret:

```text
LAUNCHSTACK_NPM_TOKEN
```

The workflow does not print the token. It exposes the secret to npm only as `NODE_AUTH_TOKEN` for token presence verification and `npm publish`. The publish job requests `id-token: write` and uses `npm publish --provenance` so npm can attach build provenance to the release.

Do not place an npm token in `.npmrc`, repository files, workflow YAML, release notes, or logs.

## Post-publish checks

After the workflow succeeds:

- confirm the npm package version is the expected version;
- confirm npm provenance/attestation is present;
- install the published package in a clean environment and run `launchstack --version`;
- create a fresh API and confirm the generated baseline matches the release notes;
- create the corresponding GitHub Release using `RELEASE_NOTES_<version>.md` as the basis.
