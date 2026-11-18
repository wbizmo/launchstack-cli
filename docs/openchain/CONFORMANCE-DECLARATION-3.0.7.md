# LaunchStack CLI 3.0.7 — OpenChain self-certification declaration

Standards: ISO/IEC 5230:2020 and ISO/IEC 18974:2023
Organization: Zivora Labs
Product scope: LaunchStack CLI 3.0.7 npm package and generated API template supplied with that release
Validation date: 18 November 2026
Revalidation due: no later than 18 May 2028

Zivora Labs documents that the LaunchStack CLI 3.0.7 programme satisfies all 34 questions in the OpenChain ISO/IEC 5230 self-certification checklist and all 35 questions in the OpenChain ISO/IEC 18974 self-certification checklist, subject to the effective-release gate below.

The authoritative item-level mapping is SELF-ASSESSMENT.md. Programme approval, competence, resourcing, awareness and contact verification are in PROGRAM-RECORD-2026-11-18.md; the improvement audit is in REVIEW-2026-11-18.md; component records are in COMPONENT-RECORDS-3.0.7.json. The guarded release process creates the exact npm tarball, CycloneDX SBOMs, low-severity production audit outputs, integrity-verified upstream source tarballs and SHA-256 manifest.

## Effective-release gate

This declaration becomes an assertion about the published supplied release only when all of the following are true for one exact commit:

1. v3.0.7 points to that commit and the same commit is the default-branch release commit.
2. Root and generated-template release gates pass, including release:check, CI/CodeQL and both low-severity production dependency audits.
3. launchstack-cli@3.0.7 is successfully published to npm with provenance.
4. The GitHub v3.0.7 release exists and carries the versioned OpenChain evidence archive produced by the guarded release workflow.
5. The evidence archive includes the package tarball hash, component records, source archive manifest and tarballs, CycloneDX SBOMs, audit results, programme records and SHA-256 checksums.

If any item fails, the supplied release must not be represented as self-certified.

Authorization record: Williams Ashibuogwu, Founder and lead of Zivora Labs, directly authorized on 18 November 2026 that LaunchStack must satisfy all 69 OpenChain self-certification requirements before a compliance claim and authorized a new release where necessary. This records that authorization; it does not claim third-party accredited certification or an OpenChain/ISO signature.
