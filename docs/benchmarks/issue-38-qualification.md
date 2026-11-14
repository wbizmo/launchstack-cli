# Issue #38: release qualification measurements

Status: measured on the local v3.0.4 candidate, **Draft / Unreleased**. Workload targets from the issue are not performance claims. The machine-readable run with raw samples and workload details is [`issue-38-qualification.json`](issue-38-qualification.json).

## Method

The benchmark harness runs with Node 24.22.3 on Linux 6.18.57 x64, AMD EPYC 9V74 (4 CPUs available, 35,743,748,096 bytes host RAM), using `NPM_CONFIG_CACHE=/workspace/.npm-cache`. The v3.0.0 reference is the peeled published commit `f76996cc0c3d125abcb1e6f998d2cc037c02b140`; the candidate source at benchmark time was the completed #37 head before #38 harness commits. Both CLI runs use each version's own template copy/render helpers, one warmup and five repetitions. The broader qualification run uses three repetitions and one warmup for drift, plus the per-suite repetitions recorded in JSON. The generated API is built from the packed CLI, uses a fresh local PostgreSQL database, and runs on the same Node/PostgreSQL host for baseline and candidate.

The harness exercises CLI packaging and no-install generation, clean/modified/missing drift scans through 250,000 files, capability graph sorting through 10,000 nodes and 99,945 edges, mutation and recovery through 10,000 files, upgrade planning through 10,000 managed files, generated API authentication and CRUD/pagination at multiple concurrency levels, and complexity regressions. API instrumentation records HTTP status/errors and Prisma query events. Temporary projects and database are cleaned in `finally` blocks. The recorded run completed without benchmark errors.

## Packed CLI and generated template

| Measurement                                        |      v3.0.0 baseline |     v3.0.4 candidate | Notes                                                                                                     |
| -------------------------------------------------- | -------------------: | -------------------: | --------------------------------------------------------------------------------------------------------- |
| Package install from local packed tarball, offline |           993.616 ms |         1,474.153 ms | Includes npm's local package extraction; excludes dependency downloads.                                   |
| First fresh-process `--version`                    |            98.656 ms |           151.574 ms | First invocation after local package install.                                                             |
| Subsequent fresh-process startup p50 / p95         | 103.703 / 125.728 ms | 136.797 / 156.044 ms | Warm filesystem cache, not cleared OS page cache.                                                         |
| Template staging p50 / p95                         |   18.618 / 30.036 ms |  48.640 / 201.039 ms | Each version's own copy implementation; candidate output is larger.                                       |
| Template rendering p50 / p95                       |     2.699 / 5.719 ms |    4.322 / 20.382 ms | Each version's own renderer.                                                                              |
| Packed CLI project generation p50 / p95            | 129.195 / 159.363 ms | 194.146 / 267.561 ms | `create --no-install`; 71 files/195,251 bytes vs 111 files/248,797 bytes. Not normalized for output size. |

These measurements do not show a CLI speed improvement. The candidate has a larger generated project and observed higher elapsed times in this run; the measurements are diagnostic and host-sensitive.

## Drift scan sizes

For each size, the harness hashes files containing 29 bytes each and tests clean trees plus 1% modified or missing files. Three measured repetitions follow one warmup. Values below are full drift scan p50 / p95 in milliseconds.

|   Files |                   Clean |             1% modified |              1% missing |
| ------: | ----------------------: | ----------------------: | ----------------------: |
|   1,000 |         14.377 / 16.913 |        24.086 / 131.354 |         13.758 / 15.291 |
|  10,000 |       126.012 / 130.885 |       156.012 / 322.215 |       133.048 / 139.208 |
|  50,000 |   1,143.922 / 1,329.375 |   1,162.241 / 1,270.721 |   1,162.304 / 1,198.723 |
| 100,000 |   3,096.010 / 3,341.604 |   3,512.772 / 3,554.467 |   3,002.160 / 3,203.174 |
| 250,000 | 15,201.667 / 16,212.812 | 15,088.026 / 16,014.906 | 15,469.489 / 15,703.053 |

The 250,000-file clean/modified runs hashed 7,250,000 logical file bytes; the missing-file run hashed 7,177,500 bytes. The process peak RSS recorded by the drift suite was 591,151,104 bytes. This is a full scan; cached manifest loading time is separately recorded in JSON.

## Graph, mutation, recovery and upgrade workloads

| Workload                      |                     Size |        p50 / p95 (ms) | Correctness                      |
| ----------------------------- | -----------------------: | --------------------: | -------------------------------- |
| Capability graph, sparse      |     1k nodes / 999 edges |         0.527 / 0.780 | deterministic order              |
| Capability graph, dense       |   1k nodes / 9,945 edges |         0.662 / 1.682 | deterministic order              |
| Capability graph, sparse      |  10k nodes / 9,999 edges |        3.270 / 10.691 | deterministic order              |
| Capability graph, dense       | 10k nodes / 99,945 edges |        8.809 / 10.012 | deterministic order              |
| Mutation apply                |                100 files |       81.137 / 84.714 | integrity checks passed          |
| Mutation apply                |                 1k files |     596.510 / 635.700 | integrity checks passed          |
| Mutation apply                |                10k files | 7,602.534 / 8,306.152 | integrity checks passed          |
| Interrupted mutation recovery |                100 files |       30.665 / 36.118 | originals restored               |
| Interrupted mutation recovery |                 1k files |     123.172 / 152.867 | originals restored               |
| Interrupted mutation recovery |                10k files | 1,148.937 / 1,269.360 | originals restored               |
| Upgrade planning              |                100 files |       18.038 / 26.057 | no conflicts; six expected diffs |
| Upgrade planning              |                 1k files |       27.116 / 29.525 | no conflicts; six expected diffs |
| Upgrade planning              |                10k files |      84.073 / 118.658 | no conflicts; six expected diffs |

Graph data and full operation details are in JSON. Mutation/recovery cases are isolated synthetic fixtures; they complement but do not replace the separate process-concurrency and fault-injection tests.

## Generated API and database observations

The harness installed the packed candidate, generated an owner-scoped resource, ran Prisma generation and build, then issued authenticated requests against local PostgreSQL. Candidate startup-to-ready was 451.003 ms and API process peak RSS was 178,860,032 bytes. Setup durations were 145.539 ms project creation, 155.426 ms resource generation, 7,744.051 ms `npm ci`, 1,101.103 ms database push and 2,853.991 ms generated build.

| Candidate workload  | Requests | Concurrency |         p50 / p95 / p99 ms |     Throughput | Errors | Prisma query events |
| ------------------- | -------: | ----------: | -------------------------: | -------------: | -----: | ------------------: |
| Login + refresh     |       20 |  sequential | 15.888 / 404.065 / 411.941 |     6.01 req/s |      0 |                  80 |
| Authenticated GET   |    1,000 |          50 |   16.909 / 32.043 / 81.344 | 2,464.51 req/s |      0 |               1,000 |
| Authenticated GET   |    1,000 |         200 |   41.423 / 83.573 / 86.141 | 3,961.80 req/s |      0 |               1,000 |
| Authenticated GET   |    1,000 |         500 | 54.017 / 300.555 / 313.441 | 3,010.29 req/s |      0 |               1,000 |
| Resource CRUD       |       51 |       mixed |      1.580 / 2.431 / 2.991 |   638.67 req/s |      0 |                 101 |
| Resource pagination |      100 |  sequential |   10.057 / 14.944 / 15.493 | 1,905.12 req/s |      0 |                 100 |

The v3.0.0 API baseline used the same 1,000 request and concurrency workloads. Its p50/p95/p99 observations and throughput are preserved in the JSON: at concurrency 50, GET was 14.937/45.304/94.659 ms at 2,516.28 req/s; at 200, 29.457/224.264/238.526 ms at 4,015.46 req/s; at 500, 90.401/216.424/273.168 ms at 3,424.95 req/s. Both runs reported zero HTTP errors. Single-host variation is visible; these results do not support a general throughput claim.

### Final managed-file upgrade comparison (2026-11-14)

The final source was qualified at 100,000 and 250,000 managed files on Node 24.22.3 / Linux x64 (AMD EPYC 9V74). Each version ran one measured sample per size, with no warmup and a freshly rebuilt fixture. Baseline source is published v3.0.0 commit `f76996cc0c3d125abcb1e6f998d2cc037c02b140`; candidate source is `fd9a174004e0d13f4463efab602f93bec045b70d`. The raw samples are in [`issue-38-upgrade-baseline.json`](issue-38-upgrade-baseline.json) and [`issue-38-upgrade-scale.json`](issue-38-upgrade-scale.json). Both used the same harness, Node runtime and host; baseline code was loaded from a detached checkout.

| Managed files | v3.0.0 drift / plan | Candidate drift | Candidate plan | Sampled peak RSS (baseline / candidate) | Planned diffs (baseline / candidate) | Conflicts |
| ------------: | ------------------: | --------------: | -------------: | --------------------------------------: | -----------------------------------: | --------: |
|       100,000 |     0.934 / 0.760 s |         5.792 s |        1.283 s |                           396 / 532 MiB |                                4 / 6 |     0 / 0 |
|       250,000 |     2.478 / 1.676 s |        37.623 s |        2.960 s |                           631 / 787 MiB |                                4 / 6 |     0 / 0 |

The candidate's measured drift scan was about 6.2x slower at 100k and 15.2x slower at 250k; upgrade planning was about 1.7x and 1.8x slower, respectively. It also used more sampled RSS. The candidate adds canonical path validation, no-follow file opens, regular-file and size checks, and path-identity checks after hashing; v3.0.0 does not perform these checks. Candidate output had six expected diffs versus four for baseline, with no conflicts. RSS is sampled every 5 ms and can miss short-lived peaks. The earlier full-system qualification JSON (`issue-38-qualification.json`) records an earlier candidate snapshot at commit `0abacda904b0bbc4abee0b59a5b8ff0989841d54`; this final direct comparison supersedes its managed-file scan timing. These figures document the security cost observed on this host and do not claim a speedup.

## Limits

The final upgrade comparison has one baseline sample and one candidate sample per size; those counts are too small to establish stable percentiles. This is one four-CPU local container host, not a production topology. npm install measurements depend on the shared cache and registry/proxy. Template output differs between versions, so generation duration is not a normalized comparison. The benchmark does not simulate slow/network filesystems, large file contents, external database latency, cross-region traffic or multi-tenant load. No issue target is reported as achieved unless its measured result appears above.
