# Upgrade planning benchmark

**Baseline:** published v3.0.0, `f76996cc0c3d125abcb1e6f998d2cc037c02b140`

**Candidate:** upgrade improvements implementation; exact commit is recorded in the JSON result.

**Runtime and machine:** Node 24.22.3, Linux x64, AMD EPYC 9V74, 5 visible CPUs, 33.3 GiB RAM. Both versions used the same `/tmp` filesystem.

The benchmark builds v2.0.0 projects with 100, 1,000 or 10,000 actual tracked files and package version 2.1.3. It separately measures a full SHA-256 drift scan and `planUpgrade`, using one warmup and three fresh worker processes per size, without network access. Planning does not apply mutations. Machine-readable observations and state sizes are in [`upgrades.json`](upgrades.json).

| Tracked files | State JSON | Drift scan p50 / p95 | Plan p50 / p95 (baseline) | Plan p50 / p95 (candidate) | Candidate sampled RSS |
| ------------: | ---------: | -------------------: | ------------------------: | -------------------------: | --------------------: |
|           100 |    15.8 kB |       10.5 / 10.7 ms |              5.6 / 5.8 ms |             17.1 / 17.6 ms |              92.1 MiB |
|         1,000 |   157.1 kB |       19.1 / 19.2 ms |            15.8 / 20.0 ms |             29.6 / 30.9 ms |             101.1 MiB |
|        10,000 |    1.57 MB |     109.5 / 131.6 ms |            46.9 / 97.5 ms |             82.1 / 83.2 ms |             143.0 MiB |

The drift scan hashes each tracked file and remains linear in file count and bytes. Candidate planning takes longer and uses more memory because it validates/serializes richer ownership state and parses two TypeScript integration points. It creates six planned mutations (including ownership metadata); v3.0.0 created four. RSS is sampled every 5ms and can miss brief peaks; three measured samples make p95 diagnostic. Runs covered projects up to 10,000 files.

Reproduce with `NPM_CONFIG_CACHE=/workspace/.npm-cache npm run bench:upgrades`. To measure the baseline, check out the recorded published tag and set `LAUNCHSTACK_BENCH_REPO` to that checkout. The script records the actual Node version, warmup and repetitions in its JSON output.
