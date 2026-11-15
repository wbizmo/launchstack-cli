# Capability mutation benchmark

**Version:** v3.0.6
**Runtime and host:** Node.js 24.22.1, Linux x64, AMD EPYC 9V74, 4 visible CPUs, 33.3 GiB reported memory.

This benchmark creates a fresh project for each sample, plans a single install transaction for 1, 10 or 100 synthetic file-only capabilities, and applies it. Timing includes the initial plan, locked re-planning, dependency ordering, file planning, metadata compare-and-swap checks, staging and commit. Each workload ran three times without warmup. There are no npm dependencies, database calls or Docker services in this workload.

| Capabilities and files |       p50 |        p95 |
| ---------------------: | --------: | ---------: |
|                      1 | 20.518 ms |  21.381 ms |
|                     10 | 20.921 ms |  21.128 ms |
|                    100 | 96.562 ms | 101.719 ms |

At 100 capabilities, the benchmark commits 100 generated files plus manifest and state metadata in one transaction. The work increases with capability and file count; dependency ordering is O(V + E), while transaction path sorting is O(n log n) and staging/commit operations are O(n) filesystem operations, plus content I/O proportional to total bytes. This synthetic workload does not establish production latency targets. Three samples make p95 diagnostic, and these figures are not directly comparable with previous host reports.

All three samples per workload passed generated-file content checks. The raw sample arrays, source identity files and source SHA-256 are in [`capability-mutations-3.0.6.json`](capability-mutations-3.0.6.json). Reproduce with `NPM_CONFIG_CACHE=/workspace/.npm-cache npm run bench:capability-mutations`.
