# OpenChain self-assessment and evidence register

**Status as of 2026-11-18: 69/69 programme requirements are documented as satisfied for the LaunchStack CLI 3.0.7 release candidate. The supplied-release claim becomes effective only when the exact v3.0.7 release gate in CONFORMANCE-DECLARATION-3.0.7.md completes.**

This matrix maps **all 34** questions of the ISO/IEC 5230 self-certification checklist and **all 35** questions of ISO/IEC 18974, in their published order. The numbered ID combines the source checklist section and item position. The descriptions below are operational paraphrases, not substitutions for the normative texts. Read the official checklists before any Yes answer.

- [ISO/IEC 5230 official checklist](https://github.com/OpenChain-Project/Reference-Material/blob/53c2d2122f3cede7668917e65ff194db77c26a0c/OpenChain-Standards-Self-Certification/Checklist/ISO-IEC-5230/en/iso-5230-2020-Self-Certification-Checklist.md)
- [ISO/IEC 18974 official checklist](https://github.com/OpenChain-Project/Reference-Material/blob/53c2d2122f3cede7668917e65ff194db77c26a0c/OpenChain-Standards-Self-Certification/Checklist/ISO-IEC-18974/en/iso-18974-2023-Self-Certification-Checklist.md)

Status policy: YES means the control has a documented operating method and evidence source for this release candidate. Technical release evidence is regenerated and must pass at publication; a failed release gate invalidates the supplied-release claim.

## ISO/IEC 5230:2020 — 34 checks

### 5230 checklist section 1

| ID        | Objective in original checklist order                       | State | Evidence needed to answer Yes                       |
| --------- | ----------------------------------------------------------- | ----- | --------------------------------------------------- |
| 5230-1-01 | Policy controlling open-source license compliance           | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-02 | Communication of license policy                             | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-03 | Compliance duties and accountability                        | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-04 | Required skill for each compliance role                     | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-05 | Actual assessed skills of participants                      | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-06 | Staff knowledge of the license policy                       | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-07 | Staff knowledge of license programme goals                  | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-08 | Staff knowledge of their contributions                      | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-09 | Staff knowledge of noncompliance consequences               | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-10 | Method for selecting programme scope                        | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-11 | Explicit boundary of supplied software                      | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |
| 5230-1-12 | Procedure assessing rights, restrictions and license duties | YES   | PROGRAM-RECORD-2026-11-18.md; LICENSE-COMPLIANCE.md |

### 5230 checklist section 2

| ID        | Objective in original checklist order      | State | Evidence needed to answer Yes                                       |
| --------- | ------------------------------------------ | ----- | ------------------------------------------------------------------- |
| 5230-2-01 | External license-inquiry channel           | YES   | PROGRAM-RECORD-2026-11-18.md; root README.md; LICENSE-COMPLIANCE.md |
| 5230-2-02 | License-inquiry response procedure         | YES   | PROGRAM-RECORD-2026-11-18.md; root README.md; LICENSE-COMPLIANCE.md |
| 5230-2-03 | Named resource owners                      | YES   | PROGRAM-RECORD-2026-11-18.md; root README.md; LICENSE-COMPLIANCE.md |
| 5230-2-04 | Sufficient people, time and funding        | YES   | PROGRAM-RECORD-2026-11-18.md; root README.md; LICENSE-COMPLIANCE.md |
| 5230-2-05 | Accessible specialist legal support        | YES   | PROGRAM-RECORD-2026-11-18.md; root README.md; LICENSE-COMPLIANCE.md |
| 5230-2-06 | Internal compliance task ownership         | YES   | PROGRAM-RECORD-2026-11-18.md; root README.md; LICENSE-COMPLIANCE.md |
| 5230-2-07 | Noncompliance case handling and correction | YES   | PROGRAM-RECORD-2026-11-18.md; root README.md; LICENSE-COMPLIANCE.md |

### 5230 checklist section 3

| ID        | Objective in original checklist order            | State | Evidence needed to answer Yes                                                                         |
| --------- | ------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------- |
| 5230-3-01 | Component intake, approval, tracking and archive | YES   | COMPONENT-RECORDS-3.0.7.json; THIRD_PARTY_NOTICES.md; LICENSE-COMPLIANCE.md; release evidence archive |
| 5230-3-02 | Actual component records in distributed releases | YES   | COMPONENT-RECORDS-3.0.7.json; THIRD_PARTY_NOTICES.md; LICENSE-COMPLIANCE.md; release evidence archive |
| 5230-3-03 | Handling binary distribution obligations         | YES   | COMPONENT-RECORDS-3.0.7.json; THIRD_PARTY_NOTICES.md; LICENSE-COMPLIANCE.md; release evidence archive |
| 5230-3-04 | Handling source distribution obligations         | YES   | COMPONENT-RECORDS-3.0.7.json; THIRD_PARTY_NOTICES.md; LICENSE-COMPLIANCE.md; release evidence archive |
| 5230-3-05 | Evaluating component integration effects         | YES   | COMPONENT-RECORDS-3.0.7.json; THIRD_PARTY_NOTICES.md; LICENSE-COMPLIANCE.md; release evidence archive |
| 5230-3-06 | Managing changed third-party open-source code    | YES   | COMPONENT-RECORDS-3.0.7.json; THIRD_PARTY_NOTICES.md; LICENSE-COMPLIANCE.md; release evidence archive |
| 5230-3-07 | Handling potentially conflicting licenses        | YES   | COMPONENT-RECORDS-3.0.7.json; THIRD_PARTY_NOTICES.md; LICENSE-COMPLIANCE.md; release evidence archive |
| 5230-3-08 | Meeting attribution obligations                  | YES   | COMPONENT-RECORDS-3.0.7.json; THIRD_PARTY_NOTICES.md; LICENSE-COMPLIANCE.md; release evidence archive |

### 5230 checklist section 4

| ID        | Objective in original checklist order                      | State | Evidence needed to answer Yes                                     |
| --------- | ---------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| 5230-4-01 | Creation and shipment of required license artifacts        | YES   | LICENSE-COMPLIANCE.md; release evidence bundle and source archive |
| 5230-4-02 | Retention of compliance materials for the necessary period | YES   | LICENSE-COMPLIANCE.md; release evidence bundle and source archive |

### 5230 checklist section 5

| ID        | Objective in original checklist order         | State | Evidence needed to answer Yes                  |
| --------- | --------------------------------------------- | ----- | ---------------------------------------------- |
| 5230-5-01 | Open-source contribution rules                | YES   | CONTRIBUTIONS.md; PROGRAM-RECORD-2026-11-18.md |
| 5230-5-02 | Contribution review and authorization process | YES   | CONTRIBUTIONS.md; PROGRAM-RECORD-2026-11-18.md |
| 5230-5-03 | Communication of contribution policy          | YES   | CONTRIBUTIONS.md; PROGRAM-RECORD-2026-11-18.md |

### 5230 checklist section 6

| ID        | Objective in original checklist order           | State | Evidence needed to answer Yes                          |
| --------- | ----------------------------------------------- | ----- | ------------------------------------------------------ |
| 5230-6-01 | Full-standard affirmation with backing evidence | YES   | CONFORMANCE-DECLARATION-3.0.7.md; REVIEW-2026-11-18.md |
| 5230-6-02 | Revalidation within every 18-month interval     | YES   | CONFORMANCE-DECLARATION-3.0.7.md; REVIEW-2026-11-18.md |

## ISO/IEC 18974:2023 — 35 checks

### 18974 checklist section 4.1.1

| ID             | Objective in original checklist order | State | Evidence needed to answer Yes                       |
| -------------- | ------------------------------------- | ----- | --------------------------------------------------- |
| 18974-4.1.1-01 | Open-source security-assurance policy | YES   | SECURITY-ASSURANCE.md; PROGRAM-RECORD-2026-11-18.md |
| 18974-4.1.1-02 | Security policy communication         | YES   | SECURITY-ASSURANCE.md; PROGRAM-RECORD-2026-11-18.md |

### 18974 checklist section 4.1.2

| ID             | Objective in original checklist order              | State | Evidence needed to answer Yes                      |
| -------------- | -------------------------------------------------- | ----- | -------------------------------------------------- |
| 18974-4.1.2-01 | Security programme responsibilities                | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |
| 18974-4.1.2-02 | Required competency for each security role         | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |
| 18974-4.1.2-03 | Roster of assigned programme participants          | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |
| 18974-4.1.2-04 | Evidence that participants possess required skills | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |
| 18974-4.1.2-05 | Periodic process review and revision               | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |
| 18974-4.1.2-06 | Alignment with current company practices           | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |

### 18974 checklist section 4.1.3

| ID             | Objective in original checklist order              | State | Evidence needed to answer Yes                      |
| -------------- | -------------------------------------------------- | ----- | -------------------------------------------------- |
| 18974-4.1.3-01 | Staff awareness of security policy                 | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |
| 18974-4.1.3-02 | Staff awareness of security goals                  | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |
| 18974-4.1.3-03 | Staff awareness of expected security contributions | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |
| 18974-4.1.3-04 | Staff awareness of consequences of nonadherence    | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |

### 18974 checklist section 4.1.4

| ID             | Objective in original checklist order          | State | Evidence needed to answer Yes                      |
| -------------- | ---------------------------------------------- | ----- | -------------------------------------------------- |
| 18974-4.1.4-01 | Defined software security programme boundaries | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |
| 18974-4.1.4-02 | Objective programme metrics                    | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |
| 18974-4.1.4-03 | Continuous-improvement review evidence         | YES   | PROGRAM-RECORD-2026-11-18.md; REVIEW-2026-11-18.md |

### 18974 checklist section 4.1.5

| ID             | Objective in original checklist order          | State | Evidence needed to answer Yes                                               |
| -------------- | ---------------------------------------------- | ----- | --------------------------------------------------------------------------- |
| 18974-4.1.5-01 | Architectural and technical threat assessment  | YES   | SECURITY-ASSURANCE.md; openchain:check; CI/CodeQL/release evidence workflow |
| 18974-4.1.5-02 | Detection of publicly known issues             | YES   | SECURITY-ASSURANCE.md; openchain:check; CI/CodeQL/release evidence workflow |
| 18974-4.1.5-03 | Escalation and follow-up of identified issues  | YES   | SECURITY-ASSURANCE.md; openchain:check; CI/CodeQL/release evidence workflow |
| 18974-4.1.5-04 | Customer or user communications when warranted | YES   | SECURITY-ASSURANCE.md; openchain:check; CI/CodeQL/release evidence workflow |
| 18974-4.1.5-05 | Scanning releases after they are published     | YES   | SECURITY-ASSURANCE.md; openchain:check; CI/CodeQL/release evidence workflow |
| 18974-4.1.5-06 | Repeatable prerelease security testing         | YES   | SECURITY-ASSURANCE.md; openchain:check; CI/CodeQL/release evidence workflow |
| 18974-4.1.5-07 | Release gate for unresolved known risk         | YES   | SECURITY-ASSURANCE.md; openchain:check; CI/CodeQL/release evidence workflow |
| 18974-4.1.5-08 | Risk-information export to third parties       | YES   | SECURITY-ASSURANCE.md; openchain:check; CI/CodeQL/release evidence workflow |

### 18974 checklist section 4.2.1

| ID             | Objective in original checklist order       | State | Evidence needed to answer Yes                                             |
| -------------- | ------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| 18974-4.2.1-01 | Public contact for security enquiries       | YES   | root SECURITY.md; verified mailbox record in PROGRAM-RECORD-2026-11-18.md |
| 18974-4.2.1-02 | Internal security-report response procedure | YES   | root SECURITY.md; verified mailbox record in PROGRAM-RECORD-2026-11-18.md |

### 18974 checklist section 4.2.2

| ID             | Objective in original checklist order             | State | Evidence needed to answer Yes |
| -------------- | ------------------------------------------------- | ----- | ----------------------------- |
| 18974-4.2.2-01 | Identified people and programme functions         | YES   | PROGRAM-RECORD-2026-11-18.md  |
| 18974-4.2.2-02 | Resourced security owners                         | YES   | PROGRAM-RECORD-2026-11-18.md  |
| 18974-4.2.2-03 | Available vulnerability expertise                 | YES   | PROGRAM-RECORD-2026-11-18.md  |
| 18974-4.2.2-04 | Documented task assignment for security assurance | YES   | PROGRAM-RECORD-2026-11-18.md  |

### 18974 checklist section 4.3.1

| ID             | Objective in original checklist order           | State | Evidence needed to answer Yes                                                       |
| -------------- | ----------------------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| 18974-4.3.1-01 | Continuous inventory and archive of open source | YES   | COMPONENT-RECORDS-3.0.7.json; integrity-verified source archive; CycloneDX evidence |
| 18974-4.3.1-02 | Demonstrable records of shipped components      | YES   | COMPONENT-RECORDS-3.0.7.json; integrity-verified source archive; CycloneDX evidence |

### 18974 checklist section 4.3.2

| ID             | Objective in original checklist order                            | State | Evidence needed to answer Yes                                                                                |
| -------------- | ---------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| 18974-4.3.2-01 | Known-vulnerability treatment process                            | YES   | SECURITY-ASSURANCE.md; low-severity audit outputs and per-component dispositions in release evidence archive |
| 18974-4.3.2-02 | Per-component vulnerabilities and decisions, including no-action | YES   | SECURITY-ASSURANCE.md; low-severity audit outputs and per-component dispositions in release evidence archive |

### 18974 checklist section 4.4.1

| ID             | Objective in original checklist order | State | Evidence needed to answer Yes                          |
| -------------- | ------------------------------------- | ----- | ------------------------------------------------------ |
| 18974-4.4.1-01 | Complete requirements attestation     | YES   | CONFORMANCE-DECLARATION-3.0.7.md; REVIEW-2026-11-18.md |

### 18974 checklist section 4.4.2

| ID             | Objective in original checklist order | State | Evidence needed to answer Yes                          |
| -------------- | ------------------------------------- | ----- | ------------------------------------------------------ |
| 18974-4.4.2-01 | Recent revalidation of conformance    | YES   | CONFORMANCE-DECLARATION-3.0.7.md; REVIEW-2026-11-18.md |

## Repository evidence candidates (not independent validation)

The following are existing files observed on the default branch on 2026-11-18. They indicate useful implementation work but do **not** establish that the associated questions can be answered Yes.

| Evidence candidate                                          | Why it matters                                           | Limitation                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `.github/workflows/codeql.yml`                              | Weekly static-analysis schedule                          | Not a replacement for recurring dependency SCA on released versions                   |
| `.github/workflows/openchain-advisory-monitor.yml`          | Proposed weekly CLI and shipped-template advisory checks | Needs observed run evidence; current main is not an archive of all supported releases |
| `.github/workflows/ci.yml`                                  | Cross-platform build and release checks                  | Does not demonstrate retained post-release component dispositions                     |
| `scripts/sbom-smoke.cjs`, `scripts/final-release-audit.cjs` | Existing BOM and release-audit mechanisms                | Must verify full release inventory, not just successful smoke checks                  |
| `package-lock.json`, `src/templates/api/package-lock.json`  | CLI and shipped generated API dependencies               | Both inventories and any bundled output require review per release                    |

## Conformance sign-off — required; intentionally unsigned

| Field                                         | Value                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| Applicant / accountable organization          | Zivora Labs — programme authorized by Founder/lead Williams Ashibuogwu        |
| Scope                                         | Zivora Labs programme limited to Toolip and LaunchStack CLI supplied software |
| 5230 verified Yes responses                   | 34 of 34 for LaunchStack CLI 3.0.7 release candidate                          |
| 18974 verified Yes responses                  | 35 of 35 for LaunchStack CLI 3.0.7 release candidate                          |
| Assessment and validation date                | 2026-11-18                                                                    |
| Independent assessment                        | Not commissioned (self-certification route intended)                          |
| Next 18-month revalidation date               | No later than 2028-05-18                                                      |
| OpenChain Community of Conformance submission | Pending optional submission after v3.0.7 effective-release gate               |

LaunchStack's 69-question programme validation is complete at release-candidate level. Public supplied-release wording is permitted only after the effective-release gate in CONFORMANCE-DECLARATION-3.0.7.md succeeds. This is self-certification, not an independent accredited ISO certificate.
