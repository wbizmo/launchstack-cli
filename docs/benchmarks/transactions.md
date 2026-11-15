# Transaction benchmark

**Baseline:** published v3.0.0, `f76996cc0c3d125abcb1e6f998d2cc037c02b140`

**Candidate:** v3.0.4 transaction hardening implementation; exact commit is recorded in the JSON result

**Runtime and machine:** Node 24.22.3, Linux x64, AMD EPYC 9V74, 5 visible CPUs, 33.3 GiB RAM. Both versions used the same `/tmp` filesystem.

The benchmark creates a fresh project and writes 100, 1,000 or 10,000 small new files. Each size ran in three isolated processes, with no warmup or network access. The parent measured wall time and sampled child RSS from `/proc` every 5 ms. Results and methodology are in [`transactions.json`](transactions.json).

|  Files |   Bytes |     v3.0.0 p50 / p95 |  Candidate p50 / p95 | Candidate sampled RSS | Candidate p50 change |
| -----: | ------: | -------------------: | -------------------: | --------------------: | -------------------: |
|    100 |   1,090 |       31.6 / 40.7 ms |       78.2 / 94.7 ms |              80.8 MiB |          2.5x slower |
|  1,000 |  11,890 |     224.8 / 232.9 ms |     611.0 / 764.0 ms |              90.5 MiB |          2.7x slower |
| 10,000 | 128,890 | 1,978.3 / 2,210.7 ms | 6,269.9 / 7,024.9 ms |              99.9 MiB |          3.2x slower |

The candidate's additional time is the cost of durable staging, journal writes and filesystem flushes. Timings reflect this host's storage and cache behavior. Structural file work is linear: one staged file write and one final rename per new file, plus a fixed number of lock/journal operations. Backups add one rename per preexisting target. Physical I/O and syscall counts were not traced.

The separate process test ran 8 and 32 simultaneous writers against one project. Each writer created a unique file; all processes exited successfully and all files matched their expected contents. The test validates serialization and no lost writes. Ten-thousand-file timings and RSS are reported above; 128-writer and 1,000-fault-trial workloads were not run.

Reproduce with `NPM_CONFIG_CACHE=/workspace/.npm-cache npm run bench:transactions`. To compare the published baseline, check out tag `v3.0.0`, install its dependencies, and set `LAUNCHSTACK_BENCH_REPO` to that checkout. `LAUNCHSTACK_BENCH_SIZES` and `LAUNCHSTACK_BENCH_WORKER_COUNT` select bounded sizes and repetitions.

## v3.0.5 mutation lock sample

The v3.0.5 directory-lock implementation was measured separately on Node.js 24.22.1, Linux x64, AMD EPYC 9V74, with 5 visible CPUs and 33.3 GiB reported memory. This run used three isolated processes per size and no warmup. It is a local observation, not a direct comparison with the v3.0.4 candidate above because the Node patch level and measured run environment are not guaranteed identical. Full raw values are in [`transactions-3.0.5.json`](transactions-3.0.5.json).

|  Files |        p50 / p95 | Sampled peak RSS |
| -----: | ---------------: | ---------------: |
|    100 |   82.7 / 90.0 ms |         60.7 MiB |
|  1,000 | 546.5 / 547.5 ms |         69.7 MiB |
| 10,000 |    5.12 / 6.19 s |         79.8 MiB |

For a plan with `n` paths and `B` bytes of file content, path sorting is `O(n log n)`, file staging and commit perform `O(n)` filesystem operations, and content I/O is `O(B)`. Lock acquisition uses a fixed number of filesystem operations in the uncontended case; owner-directory inspection occurs only while another or stale lock is present. Concurrent writer tests cover 8 and 32 processes; the benchmark does not measure distributed locking across separate hosts or network partitions.

## v3.0.6 transaction sample

The v3.0.6 sample ran on Node.js 24.22.1, Linux x64, AMD EPYC 9V74, with 4 visible CPUs and 33.3 GiB reported memory. It used three fresh processes per size with no warmup. Each repetition checked every generated file's contents after timing. This is a host-specific sample and is not directly comparable with the v3.0.4 or v3.0.5 measurements. Raw samples, source identity files and source SHA-256 are in [`transactions-3.0.6.json`](transactions-3.0.6.json).

|  Files |        p50 / p95 | Sampled peak RSS |
| -----: | ---------------: | ---------------: |
|    100 | 110.2 / 115.1 ms |         59.7 MiB |
|  1,000 | 727.2 / 731.5 ms |         69.9 MiB |
| 10,000 |    6.06 / 6.28 s |         80.5 MiB |

Reproduce with `NPM_CONFIG_CACHE=/workspace/.npm-cache npm run bench:transactions`.
