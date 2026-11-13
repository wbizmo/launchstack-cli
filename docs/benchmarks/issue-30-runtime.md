# Issue #30 runtime comparison

**Baseline:** published v3.0.0 tag, `c27e7f6ff06ac33b2b8c877ab57966e5f19ceb9`

**Candidate:** v3.0.4 issue #30 changes, measured on Node 24.22.3

**Machine:** Linux 6.18.57 x64, AMD EPYC 9V74, 5 visible CPUs, 33.3 GiB RAM. Both trees ran on the same `/tmp` filesystem.
**Method:** 11 independent process launches for `--version` and `--help`; first launch reported separately, remaining ten summarized by p50/p95. Six fresh `create --no-install` runs per version, with the first reported separately. The harness measured parent-observed wall time and sampled child peak RSS from `/proc` every 2 ms. Generation performed no network requests. RSS sampling can miss short peaks; small sample counts make p95 diagnostic.

| Workload | v3.0.0 warm p50 / p95 | Candidate warm p50 / p95 | Candidate change |
|---|---:|---:|---:|
| `--version` | 92.5 / 160.2 ms | 97.8 / 176.9 ms | 5.7% slower p50 |
| `--help` | 93.2 / 122.4 ms | 91.9 / 104.4 ms | 1.4% faster p50 |
| Fresh project generation | 92.4 / 95.8 ms | 109.5 / 161.6 ms | 18.5% slower p50 |

Sampled warm peak RSS was 65–68 MiB. Generation output increased from 71 files / 195,004 bytes to 107 files / 241,602 bytes. Generation timings are not normalized for this 51% increase in output file count, so they do not establish a regression in per-file work. The measurements show no consistent startup speedup from this change; runtime modernization was selected for supported security fixes and compatibility, not speed.

Machine-readable observations are in [`issue-30-runtime.json`](issue-30-runtime.json). The benchmark records process startup and no-install generation only. Dependency install duration, Docker startup/readiness, steady-state API memory and workload throughput are measured separately by the applicable integration checks; no throughput claim is made here.
