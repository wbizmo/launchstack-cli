# Zivora Labs OpenChain programme — LaunchStack CLI

> **Active programme.** LaunchStack CLI 3.0.7 is governed by the ISO/IEC 5230:2020 license-compliance and ISO/IEC 18974:2023 security-assurance controls in this directory. The published-release claim remains subject to the effective-release gate in CONFORMANCE-DECLARATION-3.0.7.md.

## Standards and programme scope

- ISO/IEC **5230:2020**: open-source license compliance of supplied software.
- ISO/IEC **18974:2023**: open-source security assurance of supplied software.
- Programme organization and sponsor: **Zivora Labs**; executive sponsor and programme lead: **Williams Ashibuogwu**.
- This repository validates **LaunchStack CLI 3.0.7**. Toolip is governed separately by its v3.2.1 epic/evidence programme. No other Zivora Labs systems, customer services, deployments, apps or repositories are included in this LaunchStack product validation.
- This repository's supplied source, npm package, embedded third-party resources, third-party integrations supplied by this repository, and their release pipelines are within the programme. **LaunchStack also supplies generated API templates**: evaluate template dependencies and delivered generated files, not just the CLI package.
- Version boundaries: include each currently supported released version and every new release after adoption; keep dated records of which versions were assessed. Unreleased Toolip v3.2.1 work remains unreleased until the separate delivery programme is approved.

### Scope decision and change process

The programme owner records the products, shipped distribution formats, active supported versions, dependency boundaries and reason for inclusion or exclusion. Any new product, distribution channel, embedded component, release format or organizational boundary requires a dated impact assessment and updated scope, inventory, security model and approval **before** it can be claimed covered. Record changes in `RECORDS.md` templates.

## Organizational accountabilities (positions, not invented appointments)

| Function                      | Required duties                                                                                  | Competence to assess                                                    | Assignment        |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------- |
| Executive sponsor             | Authorize programme, resources, scope and final self-declaration                                 | Authority and ability to allocate time and funds                        | **Not confirmed** |
| Open-source programme owner   | Coordinate policy, records, reviews, metrics and corrective actions                              | Supply-chain processes and ISO checklist interpretation                 | **Not confirmed** |
| License-compliance lead       | Review component provenance, obligations, notices, exceptions and inbound/outbound contributions | SPDX, permissive/weak-copyleft license duties and escalation criteria   | **Not confirmed** |
| Security-assurance lead       | Threat analysis, advisory triage, risk acceptance and public reporting                           | CVE/OSV/OSV-like feeds, SCA, secure build/release and incident response | **Not confirmed** |
| Maintainer / release approver | Inventory shipped artifacts, enforce gates, archive evidence and verify release                  | Packaging, source control, CI and actual project dependency graph       | **Not confirmed** |
| Legal escalation resource     | Decide difficult license conflicts, modifications and customer agreements                        | Qualified open-source licensing advice                                  | **Not confirmed** |

Roles may be held by the same qualified person when separation of review and approval remains credible; document who actually fills each role. Do not assert competence, staffing or funding without evidence. A resource review must document assigned time, training, tooling, budget and specialist availability.

## Policy adoption and participant awareness

1. Before adopting this policy, the executive sponsor approves this document, the two detailed procedures and the programme scope with a dated review record.
2. The programme owner keeps a roster covering maintainers, release engineers, security reviewers and any contractors contributing to supplied software. Identify responsibilities and required competence per person.
3. Deliver the current policy and the [license](LICENSE-COMPLIANCE.md), [security](SECURITY-ASSURANCE.md) and [contribution](CONTRIBUTIONS.md) procedures to each participant. Record delivery date, acknowledged version, awareness test, expected contribution and consequences of nonadherence. New participants complete this before release responsibility.
4. Assess each participant's competency and record training, relevant experience and remediation where competence is inadequate. Review competence on role change and at least annually.
5. Treat bypassed reviews, undisclosed vulnerabilities, missed notices or falsified evidence as nonconformances; stop affected release, escalate and document corrective action.

## Release and ongoing review

- A release cannot be marked **OpenChain-cleared** without the immutable version/commit ID, complete shipped-component inventory, license dispositions, attribution/source-delivery artifacts, dated security findings (including zero findings), risk approvals, go/no-go decision and retained artifact hashes.
- Repeat known-vulnerability monitoring for each supported release after distribution and document checks even if none is found. Mere weekly CodeQL execution does not establish complete dependency monitoring.
- Review metrics at least quarterly: inventory coverage, license-review completion, unapproved notices, vulnerability scan coverage, remediation age, exceptional risk acceptance, training completeness, and archived release evidence retrieval.
- Review policies and role assignments at least annually and after material incidents; revalidate both standards **within 18 months of actual successful programme validation**, not from this draft date.
- Store evidence in access-controlled, tamper-evident records or immutable CI artifacts with links and retention appropriate to license obligations, including any longer duration promised in source offers. Never publish sensitive vulnerability details or personal training assessments.

## Recordkeeping and truthfulness

The [self-assessment matrix](SELF-ASSESSMENT.md) is the authoritative 34+35-question response register. [Record templates](RECORDS.md) describe the minimum evidentiary fields. Every Yes must cite dated evidence of **actual operation**, not this policy alone. Any missing evidence remains OPEN. Complete all questions, obtain accountable approval, then optionally submit Zivora Labs to the OpenChain Community of Conformance. Being listed is not third-party ISO certification.

**Review status:** Initial programme validation completed 2026-11-18 for LaunchStack CLI 3.0.7 release preparation. See PROGRAM-RECORD-2026-11-18.md, REVIEW-2026-11-18.md, SELF-ASSESSMENT.md and CONFORMANCE-DECLARATION-3.0.7.md.
