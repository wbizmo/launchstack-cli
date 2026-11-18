# LaunchStack CLI v3.0.7

Release date: 2026-11-18

## OpenChain license and security assurance

v3.0.7 establishes LaunchStack's evidence-backed OpenChain self-certification programme for ISO/IEC 5230:2020 and ISO/IEC 18974:2023.

- Adds the complete 34 + 35 item evidence register, programme approval/competence record, review record, contribution/license/security procedures and release declaration.
- Publishes and verifies the monitored security and open-source license inquiry route at williams@zivoralabs.xyz.
- Adds deterministic component records and third-party notice registers for both the CLI and generated API template.
- Gives generated API projects an explicit MIT LICENSE and their own THIRD_PARTY_NOTICES.md.
- Adds release-gating low-severity production dependency audits for both scopes.
- Adds exact registry-source archiving with integrity verification for production components.
- Pins GitHub Actions used by CI, CodeQL and release workflows to immutable commit SHAs.
- Adds independent scheduled CLI/template advisory monitoring so one failing target cannot skip the other.
- Extends the guarded release path to produce a committee-ready evidence archive containing exact package/source hashes, CycloneDX SBOMs, audit outputs, component records, policies and source tarballs.

## Runtime behavior

No LaunchStack command semantics are intentionally changed by this patch. The generated project template gains explicit licensing/compliance files, and the release pipeline gains stronger evidence and security gates.

## Verification

The release must pass the existing Node 24/26 quality gates, Windows portability, CodeQL, generated API/database checks, packed artifact smoke, SBOM validation, production dependency audits and OpenChain evidence validation before publication. The release workflow fails closed if the release branch is not the exact default-branch commit or if any evidence/audit step fails.
