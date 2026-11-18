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

Starting with v3.0.7, every public release must run npm run openchain:check, create exact component records for the CLI and generated API template, archive registry source tarballs with lockfile integrity verification, generate CycloneDX SBOMs, retain low-severity production audit JSON and package SHA-256, and attach the resulting evidence archive to the GitHub release. Release failure or unavailable evidence invalidates the supplied-release self-certification claim. See docs/openchain/README.md.
