# LaunchStack CLI external interface reference

Use launchstack --help and launchstack <command> --help for the exact options in your installed version. This document describes the public command families, their primary inputs and observable outputs.

| Command family                       | Primary inputs                                             | Outputs or effects                                              |
| ------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------- |
| create / init                        | Project name, generation options and target path           | Generated API, manifest and managed-state files                 |
| validate / doctor / audit            | Existing project and validation options                    | Configuration, environment and security findings                |
| plan / diff                          | Desired state and existing managed state                   | Read-only proposed changes and drift diagnostics                |
| apply / reconcile / upgrade          | Validated plans and project directory                      | Locked, journaled mutations or explicit errors                  |
| add / plugin                         | Capability or plugin identity                              | Approved changes to generated files, manifests and dependencies |
| dev                                  | Manifest, local services and Docker/Postgres configuration | Coordinated development services and readiness                  |
| client / generate                    | Resource schema or supported OpenAPI inputs                | Generated TypeScript clients or module source                   |
| env / provider / secrets             | Local configuration and secret inputs                      | Scoped configuration and redacted diagnostics                   |
| deploy / status / history / rollback | Target stage and supported provider                        | Stage operations or explicit unsupported-operation results      |

Commands implementing --json provide machine-readable responses. LaunchStack must not silently overwrite user-owned domain logic. Security checks and environment errors may return nonzero exit codes.

The project's generated Fastify API includes its own package, dependency lockfile, OpenAPI contracts, Prisma schema and runtime health checks. These distributed template dependencies are part of its security and license-assurance scope.

See [README](../README.md), [release history](RELEASE_HISTORY.md), [security policy](../SECURITY.md) and the generated API documentation. The complete OpenSSF documentation_interface criterion requires validation that the external API reference actually covers the supported interface, not just the existence of this file.
