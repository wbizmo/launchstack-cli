# Issue #35 local orchestration measurements

Run date: 2026-11-14 UTC

Runtime: Node.js 24.22.3, npm 11.19.1

Host: Linux x86_64

Container runtime: Docker 29.9.2, PostgreSQL 16

These are single-run wall-clock observations from the packed 3.0.4 candidate. They verify startup and isolation behavior; they are not performance claims or workload targets.

## Two generated development projects

Two separately generated projects were installed with `npm ci`, then started at the same time using the packed CLI. Both completed their local database setup and returned HTTP 200 from `/ready`. Both received SIGTERM and reported `stopped`; their LaunchStack Compose containers and networks were removed.

| Observation | Result |
| --- | ---: |
| Time from the first infrastructure `started` event until both environments reported `ready` | 19.958 s |
| Project A: infrastructure `started` to environment `ready` | 11.893 s |
| Project B: infrastructure `started` to environment `ready` | 10.648 s |
| PostgreSQL host ports | 5433, 5434 |
| API host ports | 3000, 3001 |

The shared port allocator serialized infrastructure startup while keeping both generated environments live at the same time. Both `/ready` probes passed.

## Two preview stages

Two preview stages for one queue-enabled generated project were created concurrently with the packed CLI. Both Docker Compose resources reached `ready`; `launchstack stage status` reported `providerExists: true` and `providerStatus: healthy` for both, and both `/health` requests returned HTTP 200. The measured time from issuing both create commands to both results was 68.278 s. The Docker builder had cached layers from an earlier run, so this is a warm-cache observation.

| Stage | Compose resource suffix | PostgreSQL host port | API host port |
| --- | --- | ---: | ---: |
| `preview-one` | `49b7185e` | 24017 | 46093 |
| `preview-two` | `96ccc275` | 26278 | 42259 |

Redis was also healthy in both stages, published on ports 36093 and 32259 respectively.

Both stages were destroyed through the CLI. Their containers, networks and stage-owned volumes were removed; the separate baseline PostgreSQL container on port 5432 remained running.

## Occupied default ports with a queue worker

With local TCP listeners deliberately holding API port 3000 and Redis port 6379, a queue-enabled generated project started in 24.128 s. The orchestrator selected API port 3001 and Redis port 6380, passed the Redis URL to the worker, and the worker completed a real BullMQ job. SIGTERM stopped the API and worker process groups and removed only that project's PostgreSQL/Redis containers and network.

A separate packed-CLI run received SIGINT after the API `/ready` probe passed. It exited with status 130, emitted the `stopped` status, and left no containers for its Compose namespace.

## Comparison limits

No comparable v3.0.0 startup timing is claimed. The previous orchestration uses fixed service ports and container names, which cannot provide a valid simultaneous-project comparison in this host where port 5432 is already occupied. The measurements above record behavior of the candidate only.
