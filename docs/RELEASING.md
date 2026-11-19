# Preparing a LaunchStack release

This guide helps contributors prepare release documentation and verify changes. LaunchStack supports Node.js 24.22.0 and later in the 24.x line, and Node.js 26.13.0 and later in the 26.x line. Node.js 20 and 22 are not supported. CI tests current patched releases on Node.js 24 and 26.

## Before proposing a release

1. Update the package and generated-project metadata, README, compatibility guide and `CHANGELOG.md`. Keep package, template and project schema versions clear.
2. Add `RELEASE_NOTES_<version>.md` with the user-visible changes, migration notes and compatibility details.
3. Refresh lockfiles and committed `dist/` output from the source.
4. Run `npm ci`, `npm run check` and `npm run release:check` on each supported Node.js line.
5. Run relevant benchmarks and Docker checks, then record measured results in the benchmark documentation.
6. Submit the changes for review with the verification results.

## Release documentation

`CHANGELOG.md` records changes across versions. Versioned release notes are indexed in [`RELEASE_HISTORY.md`](RELEASE_HISTORY.md). The README describes the current release and links to its user-facing notes. Keep compatibility and migration details in [`COMPATIBILITY.md`](COMPATIBILITY.md) and [`UPGRADING.md`](UPGRADING.md).

Package, generated-project and project schema versions are managed independently; describe each one clearly when a change affects it.

## Release evidence and security

Release checks cover the CLI package and supplied generated API templates, component inventories, license notices, vulnerability audits, CycloneDX SBOMs, source archives, and SHA-256 artifact checksums. Keep evidence for each distributed release.

## npm publication

The protected `.github/workflows/publish.yml` requires an authorized manual dispatch from `main` and the `npm-publish` environment. It runs the release quality gates, validates the version/tag, and publishes with npm provenance. Verify the package and GitHub release after publication.

The v3.0.7 [GitHub release](https://github.com/wbizmo/launchstack-cli/releases/tag/v3.0.7) contains the versioned evidence archive and source tag.
