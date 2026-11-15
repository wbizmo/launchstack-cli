# Compatibility and migration

## CLI runtime

| Surface         | Supported policy                                           | Notes                                                                    |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| LaunchStack CLI | Node.js 24.22.0 through 24.x, or 26.13.0 through 26.x      | Node 20 and Node 22 are outside the declared engine range.               |
| Generated API   | Node.js 24.22.0 through 24.x, or 26.13.0 through 26.x      | CI and Docker use current patched Node 24/26 releases.                   |
| Package manager | npm lockfile version committed by each package             | Use `npm ci` for deterministic installs.                                 |
| Database        | PostgreSQL; generated Prisma client stays on Prisma 6.19.3 | Prisma 7 changes are deferred pending datasource/client migration tests. |

Node.js 20 and 22 are not supported. Consumers must use Node.js 24.22.0+ or 26.13.0+ within the corresponding major line.

## Project metadata and upgrades

The npm package version (3.0.6) and generated project metadata/schema version are separate. Existing v3 projects keep schema version 1 and their generated package metadata; the CLI does not rewrite those values simply because it is updated. The currently registered project migration is the explicit `2.0.0 → 3.0.0` template edge. The registry orders dependencies and validates manifest/state version preconditions and postconditions; unsupported, ambiguous or unsatisfied migration paths stop with a conflict. Plan with `launchstack upgrade --plan --json`, review ownership and conflicts, then apply the supported migration with the CLI.

Lifecycle and capability changes preserve files outside LaunchStack ownership. Shared integration files use recorded base hashes and report conflicts when user edits overlap an intended transformation. Always commit or back up project changes before applying an upgrade.

## Public behavior and extensions

Existing CLI command names and JSON plan output remain available. Project mutations now reject unsafe paths, malformed journals, stale preconditions and user-owned-file overwrites. The capability registry reports complete local integrations separately from helper-only primitives; see [CAPABILITIES.md](CAPABILITIES.md). Plugin manifests are declarative by default; executable extension hooks require explicit opt-in.

The v3.0.6 runtime range accepts Node.js 24.22.0+ and 26.13.0+ within those major versions. Commands outside those ranges stop with an actionable runtime message; help and version output remain available. CI and Docker remain pinned to current patched releases.
