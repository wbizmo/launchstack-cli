# Security audit path-scanning benchmark

**Candidate:** audit bound and classification correction at `eb2a6f9a7d1869f5f32aa17addc8990262d5d056`.

**Runtime and machine:** Node 24.22.3, Linux x64, kernel 6.18.57, AMD EPYC 9V74, four CPUs available. The fixture is a synthetic Git index with one shared blob and deterministic path labels. It exercises `git ls-files` and the LS005 tracked-path heuristic without creating or reading file contents. One warmup and three measured samples ran at each size. The [machine-readable output](security-audit.json) records CPU, sampled descriptor counts, RSS, workload bytes and integrity outcomes.

| Tracked paths | Git path bytes | LS005 path candidates |   Scan p50 / p95 | Filesystem content bytes read | Descriptor count before / after |
| ------------: | -------------: | --------------------: | ---------------: | ----------------------------: | ------------------------------: |
|         1,000 |         33,886 |                     1 |     3.8 / 6.3 ms |                             0 |                         29 / 29 |
|        10,000 |        348,823 |                    10 |   13.8 / 14.6 ms |                             0 |                         29 / 29 |
|        50,000 |      1,788,503 |                    50 |   63.2 / 69.9 ms |                             0 |                         29 / 29 |
|       100,000 |      3,588,103 |                   100 | 111.1 / 141.7 ms |                             0 |                         29 / 29 |

The scan examines tracked path names only. LS005 does not read file contents, so it can miss a secret stored in an ordinary filename; this benchmark does not report content-classification recall. In these synthetic path labels, the heuristic found each planted `.pem` path and produced no path-label false positives. The result is marked `verified: false` because a sensitive-looking filename is evidence for review, not proof of secret content. A regression test confirms that neither secret values nor key contents are copied into findings.

The audit bounds Git path output at 16 MiB and waits at most 10 seconds. On failure or bound exhaustion it emits high-severity LS022 that says the path audit is incomplete, rather than silently returning an empty result. The 100k fixture produced 3.59 MB of path output, completed with zero errors, and left the descriptor count unchanged. Peak process RSS across this run was 235,491,328 bytes; the process includes the TypeScript runner and benchmark fixture setup, so it is not an isolated scanner-only peak.

Reproduce with `NPM_CONFIG_CACHE=/workspace/.npm-cache LAUNCHSTACK_BENCH_REPETITIONS=3 LAUNCHSTACK_BENCH_WARMUPS=1 npm run bench:security`. Sizes are configurable through `LAUNCHSTACK_BENCH_SIZES` and capped at 100,000. Results were measured on one host.
