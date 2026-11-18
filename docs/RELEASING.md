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

## Scoped OpenChain license and security assurance evidence

Zivora Labs is preparing ISO/IEC 5230:2020 and ISO/IEC 18974:2023 **self-certification only for Toolip and LaunchStack CLI**. The [programme](openchain/README.md) and [69-question evidence register](openchain/SELF-ASSESSMENT.md) describe prerequisites that have **not yet been declared satisfied**. For LaunchStack release qualification, include the actual CLI tarball **and generated API templates** when building and archiving the component inventory, reviewing licenses and testing for vulnerabilities. Archive notices, source-delivery decisions and per-component vulnerability dispositions alongside the immutable artifact hashes. A normal green release check alone does not establish OpenChain conformance. The existing release/version workflow remains unchanged; governance-only edits do not authorize npm publication.

## OpenChain evidence release gate

Starting with v3.0.7, every GitHub source release must run npm run openchain:check, create exact component records for the CLI and generated API template, archive registry source tarballs with lockfile integrity verification, generate CycloneDX SBOMs, retain low-severity production audit JSON and package SHA-256, and attach the resulting evidence archive to the GitHub release. Release failure or unavailable evidence means the release is not qualified. Even a complete release evidence archive does not independently establish satisfaction of every organizational OpenChain self-certification requirement. See docs/openchain/README.md.

## 3.0.7 GitHub-only release — explicit separation from npm

The one-time `.github/workflows/release-openchain-3.0.7.yml` workflow runs **only** when a branch named `release/github-only-3.0.7` is created from the _exact_ protected `main` commit. It runs the full release checks, builds and archives component-source/evidence records, creates the matching `v3.0.7` tag, then creates the GitHub release and attaches the evidence archive. **It contains no npm publish command, npm publication token, or npm-publish environment.** Never use the old `release/openchain-3.0.7` branch trigger for publication.

The separate `.github/workflows/publish.yml` is the only npm publishing path and requires an intentional manual `workflow_dispatch` from `main`, `authorize_publication=true`, and the npm-publish protected environment. **Do not invoke it for the GitHub-only release.** Do not describe `launchstack-cli@3.0.7` as available on npm until a separately authorized job has succeeded and the registry verifies that exact version.

A release tag should reference the exact qualified protected-main commit. Once created, verify tag SHA, GitHub release and attached evidence/archive hashes; retain these alongside the PR and CI records. A GitHub release is not in itself an ISO/IEC certification or OpenSSF badge.

## Verified v3.0.7 GitHub source release (18 November 2026)

The [GitHub-only workflow run 44401159846](https://github.com/wbizmo/launchstack-cli/actions/runs/44401159846) passed and created annotated tag `v3.0.7` pointing to protected-main commit `7633e826a9b870fdf2cd54f0aa4ba9c82dc9d034`. The GitHub release includes the versioned 62,651,467-byte evidence archive, including the npm-packed artifact, exact dependency component inventories, source archives and SHA-256 hashes. The published npm version was **not** changed; `launchstack-cli@3.0.6` remains the installation target until a separate manual npm publication. Do not re-run the one-time release branch merely to edit documentation.
