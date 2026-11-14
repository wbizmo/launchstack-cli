# v3.0.4 benchmark reports

These reports document measured runtime, security, lifecycle and generated-project workloads for v3.0.4. Each report includes its environment, methodology, observations, reproduction steps where available and raw machine-readable results.

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

The comparison baseline is the published v3.0.0 source. Reports record the host, workloads and sample counts. Optional high-load targets are identified in their reports.
