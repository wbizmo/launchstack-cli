# Capability lifecycle benchmark

**Baseline:** published v3.0.0, `f76996cc0c3d125abcb1e6f998d2cc037c02b140`
**Candidate:** capability integration work implementation; exact commit is recorded in the JSON result.
**Runtime and host:** Node 24.22.3, Linux x64, AMD EPYC 9V74, 5 visible CPUs. Both graph runs used `/tmp` on the same host.

The synthetic dependency benchmark uses seeded acyclic graphs. It warms each case once, measures five runs, and verifies the resolver returns all nodes. Results are diagnostic; they do not include npm resolution or filesystem writes.

|  Nodes |  Edges |   v3.0.0 p50 / p95 | Candidate p50 / p95 |
| -----: | -----: | -----------------: | ------------------: |
|  1,000 |    999 |   0.219 / 3.725 ms |    0.447 / 0.637 ms |
|  1,000 |  9,945 |   6.121 / 7.062 ms |    0.694 / 2.562 ms |
| 10,000 |  9,999 |  6.379 / 10.598 ms |    3.639 / 8.252 ms |
| 10,000 | 99,945 | 11.097 / 12.117 ms |   9.188 / 10.694 ms |

The full graph output, including process RSS and user CPU totals, is in [`capabilities.json`](capabilities.json). The latest resolver's results are faster in the three denser/larger cases measured and slower at 1,000 nodes / 999 edges. These five-sample timings are sensitive to process and host noise and are not throughput claims.

The generated-project exercise used the packed CLI to add `queue`, then `cron`; `npm ci`, TypeScript checks and `docker compose config --quiet` passed after the lockfile changes. Redis container health readiness took 5,996–6,067 ms over three create/start/readiness runs on this host; shutdown took 318–368 ms. The image was cached before these runs. After connection readiness, ten BullMQ jobs completed with the expected payload: p50 1.998 ms, p95 6.647 ms, no integrity errors. A one-second scheduled task emitted two ticks and exited after SIGTERM. PostgreSQL generated-project integration is covered by the full template smoke (26 passing tests).

The v3.0.0 CLI does not assemble capability Compose fragments or provide the generated queue worker, so there is no comparable baseline integration startup measurement. Reproduce graph measurements with `NPM_CONFIG_CACHE=/workspace/.npm-cache npm run bench:capabilities`; set `LAUNCHSTACK_BENCH_REPO` to the baseline checkout for the comparison. Redis and queue measurements require a generated project with `queue` installed, the generated Compose file, Docker Compose and a cached `redis:8-alpine` image.
