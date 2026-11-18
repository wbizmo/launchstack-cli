# LaunchStack CLI v3.0.7 — GitHub source release

Release date: 18 November 2026

**Distribution status:** v3.0.7 is prepared as a **GitHub tag and source release with a verified packed-package artifact and evidence archive**. It is **not published to npm**. The latest npm package remains `launchstack-cli@3.0.6`. No `npm publish` runs in the GitHub-only release workflow; npm publication requires a separate, explicitly authorized manual workflow.

## What is new in 3.0.7

The 3.0.7 changes focus on open-source provenance, developer security and the quality of supplied project templates. The CLI command surface and its current project lifecycle behavior are not intentionally changed.

- **Explicit licensing for generated applications.** Newly created Fastify/Prisma API projects include an MIT license and their own third-party notice register, so recipients can inspect relevant license information.
- **Two-scope component records.** The CLI package and the shipped generated API template have distinct, deterministic inventories; production dependencies are evaluated with their exact lockfile versions, registry origins, license identifiers and integrity metadata.
- **Source and distribution evidence.** The release process archives registry source packages and verifies lockfile integrity; builds CycloneDX software bills of materials for the CLI and template; preserves component records, notices, vulnerability dispositions and SHA-256 manifest; and attaches the evidence archive to the GitHub release after successful qualification.
- **OpenChain preparation.** Documented license-compliance and security-assurance programmes map all 34 ISO/IEC 5230:2020 and 35 ISO/IEC 18974:2023 self-assessment questions to reviewable evidence. Public inquiries and confidential vulnerability reports can use the documented monitored channel.
- **Ongoing security checks.** CLI and generated-template production dependencies receive independent scheduled advisory checks so findings in one do not skip analysis of the other. The prerelease gate rejects missing production component metadata and failed scans rather than treating them as clean.
- **Hardened GitHub Actions.** CI, CodeQL and release actions are pinned to exact commits. The 3.0.7 GitHub release uses a dedicated, exact-main-commit, evidence-gated workflow that **never publishes to npm**.
- **OpenSSF readiness.** Published contribution, governance, code-of-conduct and command-interface documentation is accompanied by a 145-item Passing/Silver/Gold evidence register. The Gold badge has **not** been awarded.

## Compatibility and migration

Node.js 24.22.0+ (24.x) or 26.13.0+ (26.x) remain supported. Node.js 20/22 are not supported. Generated APIs remain on Prisma 6; Prisma 7 migration is not included. Existing v3 project state and domain code are not intentionally changed by this release, and no automatic project migration is introduced.

The established v3.0.4–3.0.6 capabilities remain: declarative managed state, drift-aware upgrades, transactions and locks, owner-scoped generated CRUD, security audits, Docker/Postgres orchestration, capability management, typed clients and preview stages.

## Install and verify

For the currently published npm version:

```bash
npm install --global launchstack-cli@3.0.6
launchstack --version
```

For the GitHub v3.0.7 source release:

```bash
git clone https://github.com/wbizmo/launchstack-cli.git
cd launchstack-cli
git checkout v3.0.7
npm ci
npm run build
node bin/launchstack.cjs --version
```

## Release validation

The release must pass the repository's Node 24/26 CI and Windows gates, CodeQL, `npm run release:check`, generated-project/database tests, packed-CLI smoke, generated-template CycloneDX validation, production dependency audits and generated Docker image tests. The exact tagged commit, package archive, notices and SHA-256 evidence must be attached to the GitHub release.

**Certification clarification:** Shipping a GitHub release and evidence archive does not itself prove all 69 OpenChain controls are satisfied in operation, make LaunchStack independently ISO certified, or award an OpenSSF Gold badge. All organizational attestations and any public certification or logo claims remain subject to genuine evidence, authorization and, where applicable, badge-service approval.
