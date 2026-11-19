# LaunchStack CLI v3.0.7

Release date: 18 November 2026

**Release:** v3.0.7 includes a versioned GitHub release, software package and integrity-verified evidence archive.

## What is new in 3.0.7

The 3.0.7 changes focus on open-source provenance, developer security and the quality of supplied project templates. The CLI command surface and its current project lifecycle behavior are not intentionally changed.

- **Explicit licensing for generated applications.** Newly created Fastify/Prisma API projects include an MIT license and their own third-party notice register, so recipients can inspect relevant license information.
- **Two-scope component records.** The CLI package and the shipped generated API template have distinct, deterministic inventories; production dependencies are evaluated with their exact lockfile versions, registry origins, license identifiers and integrity metadata.
- **Source and distribution evidence.** The release process archives registry source packages and verifies lockfile integrity; builds CycloneDX software bills of materials for the CLI and template; preserves component records, notices, vulnerability dispositions and SHA-256 manifest; and attaches the evidence archive to the GitHub release after successful qualification.
- **License and security support.** Component inventories, third-party notices, security auditing, private vulnerability reporting and monitored compliance contacts support responsible distribution.
- **Ongoing security checks.** CLI and generated-template production dependencies receive independent scheduled advisory checks so findings in one do not skip analysis of the other. The prerelease gate rejects missing production component metadata and failed scans rather than treating them as clean.
- **Hardened GitHub Actions.** CI, CodeQL and release actions are pinned to exact commits; publishing workflows independently qualify package and release evidence.
- **Contributor resources.** Contribution guidance, governance, a code of conduct and public CLI interface documentation are maintained.

## Compatibility and migration

Node.js 24.22.0+ (24.x) or 26.13.0+ (26.x) remain supported. Node.js 20/22 are not supported. Generated APIs remain on Prisma 6; Prisma 7 migration is not included. Existing v3 project state and domain code are not intentionally changed by this release, and no automatic project migration is introduced.

The established v3.0.4–3.0.6 capabilities remain: declarative managed state, drift-aware upgrades, transactions and locks, owner-scoped generated CRUD, security audits, Docker/Postgres orchestration, capability management, typed clients and preview stages.

## Install and verify

Install the CLI:

```bash
npm install --global launchstack-cli@3.0.7
launchstack --version
```

To build from source:

```bash
git clone https://github.com/wbizmo/launchstack-cli.git
cd launchstack-cli
git checkout v3.0.7
npm ci
npm run build
node bin/launchstack.cjs --version
```

## Release validation

**Verification passed on 18 November 2026.** The v3.0.7 source release was qualified with Node 24/26 checks, Windows portability, CodeQL, generated API/database tests, packed CLI smoke tests, CycloneDX validation, dependency audits and generated Docker checks. The [release workflow](https://github.com/wbizmo/launchstack-cli/actions/runs/44401159846) attached a versioned integrity-verified evidence archive.

