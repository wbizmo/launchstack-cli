# Releasing LaunchStack CLI

LaunchStack releases are artifact-driven: source tests are necessary, but a version is not releasable until the packed npm tarball and a freshly generated API both pass the release gate.

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
4. Rebuild and commit `dist/` from source.
5. Update `README.md` when user-facing behavior changes.
6. Update `CHANGELOG.md` and add `RELEASE_NOTES_<version>.md`.

The CLI version is injected from `package.json` during the tsup build, so `src/cli.ts` must not contain a manually maintained version string.

## Required verification

Run:

```bash
npm ci
npm run release:check
```

The release gate covers linting, TypeScript typechecking, root tests, deterministic `dist/` verification, build/pack inspection, a clean tarball install, CLI version verification, packed client credential-forwarding protections, fresh project generation, generated-project dependency installation, Prisma schema application, database-backed concurrency tests, generated-project typechecking/build/tests, and runtime dependency auditing.

Pull-request CI runs the same release gate against PostgreSQL. A release PR must not be merged until the exact PR head is green.

## Automated npm and GitHub release

`.github/workflows/publish.yml` runs when a new version reaches `main`. It reads `package.json`, requires the matching `RELEASE_NOTES_<version>.md`, checks whether that exact package version already exists on npm, and only publishes when the version is new.

For a new version, the workflow:

1. runs the full release gate again on the merged `main` commit;
2. verifies the intended `v<version>` tag;
3. creates the annotated Git tag at the exact merged commit if it does not already exist;
4. publishes `launchstack-cli@<version>` to npm with provenance;
5. creates the GitHub Release titled `LaunchStack CLI v<version>` using `RELEASE_NOTES_<version>.md` as the release body.

The npm token is stored as the GitHub repository secret:

```text
LAUNCHSTACK_NPM_TOKEN
```

The workflow never prints the token. It exposes the secret to npm only as `NODE_AUTH_TOKEN` for token presence verification and `npm publish`. The publish job requests `id-token: write` and uses `npm publish --provenance` so npm can attach build provenance to the release.

Do not place an npm token in `.npmrc`, repository files, workflow YAML, release notes, or logs.

A matching `v*` tag push is also accepted as a recovery/manual trigger, but normal releases are created automatically from the verified `main` version so the tag, npm artifact, GitHub Release, source commit, and release notes stay aligned.

## Post-publish verification

After the publish workflow succeeds:

- confirm the `v<version>` tag points to the expected merged `main` commit;
- confirm the GitHub Release title and notes match the versioned release-note file;
- confirm npm reports the expected package version;
- confirm npm provenance/attestation is present and identifies this repository/workflow;
- install the published package in a clean environment and verify `launchstack --version`;
- create a fresh API and confirm the generated baseline matches the release notes.
