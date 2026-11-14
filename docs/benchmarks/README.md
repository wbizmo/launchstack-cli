# v3.0.4 benchmark reports

These reports document measured runtime, security, lifecycle and generated-project workloads for v3.0.4. Each report includes its environment and methodology, actual observations, reproduction steps where available, raw machine-readable results, and limitations. Results are host-specific diagnostics; workload goals are not performance claims.

| Area                                          | Report                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| CLI startup and generation                    | [Runtime](runtime.md)                                                      |
| Audit traversal and hostile-input corpus      | [Security audit](security-audit.md) · [Security fuzzing](security-fuzz.md) |
| Durable file mutations and concurrent writers | [Transactions](transactions.md)                                            |
| Template migration planning                   | [Upgrades](upgrades.md)                                                    |
| Dependency graphs and local integrations      | [Capabilities](capabilities.md)                                            |
| Concurrent local projects and preview stages  | [Orchestration](orchestration.md)                                          |
| Generated database queries and SDK output     | [Generators](generators.md)                                                |
| Graph scheduling and file hashing             | [Complexity](complexity.md)                                                |
| Cross-system release workloads                | [Release qualification](qualification.md)                                  |

The comparison baseline is the published v3.0.0 source. Measurements use the recorded local environment; they do not establish production performance guarantees. Some optional high-load targets were not run. Refer to the individual reports for the precise sample counts and limitations.
