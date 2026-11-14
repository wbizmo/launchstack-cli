# Complexity and bounded I/O measurements

Implementation commit: [`6f87296`](https://github.com/wbizmo/launchstack-cli/commit/6f87296b9c3b0e28f8fd3e10fd138d7372fc2326)

## Method

Run `NPM_CONFIG_CACHE=/workspace/.npm-cache npm run bench:complexity` on Node.js 24.22.3. For a V8 CPU profile and machine-readable output, run:

```sh
node --cpu-prof --cpu-prof-dir=/tmp/launchstack-37-profile --import tsx bench/complexity.ts > docs/benchmarks/complexity.json
```

The recorded run used Linux 6.18.57 x86_64 on an AMD EPYC 9V74 (4 CPUs available, 35,743,748,096 bytes reported by the OS). Each timing case had one warmup and five samples. The benchmark uses a deterministic root-with-many-dependents service graph, a deterministic linear extension chain, and temporary files filled in 64 KiB blocks. Baseline comparisons reproduce the prior sort/shift scheduler, recursive path-copy resolver and whole-file SHA-256 read. They run on the same runtime and fixture shape as their candidate functions. The data files are warm in the page cache for hash timing.

The JSON report includes p50/p95 samples, process CPU time, process memory, isolated 50 MiB hash-worker peak RSS, and the open descriptor count before and after repeated hashing. The recorded V8 profile is [`complexity.cpuprofile`](complexity.cpuprofile).

## Measured results

| Workload                                           |   Prior implementation p50 / p95 | Candidate p50 / p95 |
| -------------------------------------------------- | -------------------------------: | ------------------: |
| Service scheduling, 1,001 vertices / 1,000 edges   |               17.082 / 27.831 ms |    0.698 / 0.757 ms |
| Service scheduling, 10,001 vertices / 10,000 edges | Not run for prior implementation |  19.861 / 28.227 ms |
| Extension chain, 1,000 vertices / 999 edges        |                7.537 / 19.452 ms |    0.885 / 0.966 ms |
| Extension chain, 10,000 vertices / 9,999 edges     | Not run for prior implementation |    6.605 / 8.035 ms |
| Hash 1 MiB                                         |                 3.908 / 4.191 ms |    0.934 / 1.021 ms |
| Hash 10 MiB                                        |               39.977 / 43.078 ms |    7.221 / 7.485 ms |
| Hash 50 MiB                                        |             103.563 / 198.815 ms |  34.521 / 36.564 ms |

The isolated one-shot 50 MiB hash workers reported 130,125,824 bytes peak RSS for read-all and 77,901,824 bytes for streaming, including Node startup. Their SHA-256 digests matched. Twenty-four MiB file hashing repeated 20 times in a regression test returned the expected digest each time; Linux `/proc/self/fd` count stayed unchanged in both the test and benchmark. Measurements include Node startup and use the fixtures described above.

## Structural bounds and tradeoffs

- Development-service scheduling uses a binary min-heap and sorted dependent lists: **O((V+E) log V)** time and **O(V+E)** auxiliary memory. This preserves lexical tie ordering while avoiding repeated full-queue sorts and array-front shifts.
- Extension ordering uses an explicit DFS stack, `visiting`/`visited` sets and a parent stack for cycle paths: **O(V+E)** time and **O(V)** auxiliary memory. It handles the 12,000-node chain test without recursion depth failure or copying a dependency path per edge.
- File hashing reads 64 KiB chunks. For `B` file bytes, hashing is **O(B)** time with one bounded chunk buffer and one open descriptor at a time. Drift reporting across `F` tracked files additionally sorts paths, costing **O(F log F)** time and **O(F)** report memory.
- OpenAPI generation now collects sorted operations once and shares that intermediate list for input types, methods and target helpers. JSON input is bounded at 1 MiB / 100,000 nodes; generated output is capped at 2 MiB.

The root `npm run check` gate passed on Node 24.22.3: lint, typecheck, 39 test files / 148 tests, reproducible distribution build and npm pack dry run. The structural suite includes 10,000 ready services, a 12,000-node extension chain, large-file digest checks and file-descriptor leak checks. The benchmark's overall process peak RSS includes whole-file baseline allocations; the separate worker peak RSS values isolate that comparison.

Machine-readable results are in [`complexity.json`](complexity.json). This report does not attempt the larger managed-file and API workloads assigned to qualification work.
