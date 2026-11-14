# Transaction benchmark

**Baseline:** published v3.0.0, `f76996cc0c3d125abcb1e6f998d2cc037c02b140`

**Candidate:** transaction hardening implementation; exact commit is recorded in the JSON result

**Runtime and machine:** Node 24.22.3, Linux x64, AMD EPYC 9V74, 5 visible CPUs, 33.3 GiB RAM. Both versions used the same `/tmp` filesystem.

The benchmark creates a fresh project and writes 100, 1,000 or 10,000 small new files. Each size ran in three isolated processes, with no warmup or network access. The parent measured wall time and sampled child RSS from `/proc` every 5 ms. Results and methodology are in [`transactions.json`](transactions.json).

|  Files |   Bytes |     v3.0.0 p50 / p95 |  Candidate p50 / p95 | Candidate sampled RSS | Candidate p50 change |
| -----: | ------: | -------------------: | -------------------: | --------------------: | -------------------: |
|    100 |   1,090 |       31.6 / 40.7 ms |       78.2 / 94.7 ms |              80.8 MiB |          2.5x slower |
|  1,000 |  11,890 |     224.8 / 232.9 ms |     611.0 / 764.0 ms |              90.5 MiB |          2.7x slower |
| 10,000 | 128,890 | 1,978.3 / 2,210.7 ms | 6,269.9 / 7,024.9 ms |              99.9 MiB |          3.2x slower |

The candidate's additional time is the cost of durable staging, journal writes and filesystem flushes. The measurement does not establish a throughput target and is not normalized for storage-device cache behavior. The structural file work is linear: one staged file write and one final rename per new file, plus a fixed number of lock/journal operations. Backups add one rename per preexisting target. Physical I/O and syscall counts were not traced.

The separate process test ran 8 and 32 simultaneous writers against one project. Each writer created a unique file; all processes exited successfully and all files matched their expected contents. The test validates serialization and no lost writes, not throughput at 128 workers. Ten-thousand-file timings and RSS are diagnostic; the optional 128-writer and 1,000-fault-trial goals were not run.

Reproduce with `NPM_CONFIG_CACHE=/workspace/.npm-cache npm run bench:transactions`. To compare the published baseline, check out tag `v3.0.0`, install its dependencies, and set `LAUNCHSTACK_BENCH_REPO` to that checkout. `LAUNCHSTACK_BENCH_SIZES` and `LAUNCHSTACK_BENCH_WORKER_COUNT` select bounded sizes and repetitions.
