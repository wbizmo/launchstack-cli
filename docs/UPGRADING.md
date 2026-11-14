# Project upgrade policy

The CLI package version, generated template version and state schema version are independent. v3.0.4 changes the CLI package version only; the generated API template remains 3.0.0 and LaunchStack state schema remains version 1.

## Supported migration edges

| From template | To template | Behavior                                                                                                                                                      |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.0.0         | 3.0.0       | Create missing generated registries, add route/capability integrations through TypeScript syntax trees, and update project/state metadata in one transaction. |
| 3.0.0         | 3.0.0       | No template migration; update CLI metadata only when it is stale.                                                                                             |

No migration is inferred for intermediate or unknown template versions. Legacy projects without `launchstack.json` are identified from their package version and architecture files; a legacy package version such as 2.1.3 selects the v2.0.0 template edge, because package version is not a template schema version.

The migration registry topologically orders declared `dependsOn` edges, rejects duplicate IDs, cycles, ambiguous version paths and unsatisfied dependencies, and checks declared manifest/state template-version preconditions and postconditions. The current registry has one production edge. Synthetic multi-edge tests exercise ordering and dependency handling without claiming that extra template migration edges are already implemented.

## Ownership and conflict handling

Project business files remain user-owned. Files under LaunchStack's generated route/capability registry paths are LaunchStack-owned. Existing route and application files are shared integration points: state records their post-migration hashes, ownership class and pre-migration hash as a migration base.

The v2-to-v3 migration uses the TypeScript parser to locate imports and function bodies, then inserts only missing imports and calls. It leaves unrelated statements and comments in place. An existing conflicting import, malformed source or missing integration function produces a conflict. An existing registry file is preserved and must export the expected function.

Inspect exact before/after text and conflicts without writing:

```bash
launchstack upgrade --plan --json
```

Apply after reviewing the plan:

```bash
launchstack upgrade
```

The apply operation uses the same journaled file transaction as capability and lifecycle changes. Repeating a completed upgrade is a no-op. A failed apply is recovered by the next mutation operation; the journal is confined to `.launchstack` and validated before it can restore files.
