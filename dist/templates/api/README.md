# {{PROJECT_DISPLAY_NAME}}

Production-oriented Fastify, TypeScript, Prisma/PostgreSQL and JWT API generated with LaunchStack CLI v3.

## Start

```bash
npm install
npm run db:up
npm run prisma:migrate -- --name init
launchstack dev
```

Swagger UI: `http://localhost:3000/docs`  
Health: `/health`  
Readiness: `/ready`

## Security baseline

The template includes bounded Zod validation, auth rate limiting, explicit production CORS, bcrypt password hashing, JWT access/refresh tokens, database-enforced single-use refresh rotation, duplicate-registration race handling, authenticated profile access, non-root Docker output and PostgreSQL-backed concurrency tests.

The default rate-limit store is in memory and applies per API process. When running multiple replicas, configure a shared Fastify rate-limit store so login and registration limits apply across the deployment.

## LaunchStack v3 project state

`launchstack.json` declares desired LaunchStack capabilities/stages. `.launchstack/state.json` records LaunchStack-owned file hashes, extension versions and stage identities. Application business logic is not treated as LaunchStack-managed state.

Useful lifecycle commands:

```bash
launchstack add redis
launchstack add queue
launchstack plan
launchstack diff
launchstack audit --production
launchstack generate resource invoice --field total:number
launchstack client generate --schema ./openapi.json
launchstack preview preview-demo
```

Generated CRUD resources are authenticated and owner-scoped at persistence boundaries by default. Add domain-specific RBAC/invariants in services before privileged workflows.

## Quality

```bash
npm run typecheck
npm test
npm run build
npm run check
```

`launchstack dev` runs local migrations only against loopback databases. `npm run db:reset` is destructive and requires `LAUNCHSTACK_CONFIRM_DB_RESET=1`; it refuses production environments, remote database hosts and production-looking database names. `npm run db:seed` seeds one local development user only when `LAUNCHSTACK_SEED_EMAIL` and a `LAUNCHSTACK_SEED_PASSWORD` (at least 12 characters) are set. Seed and reset commands refuse production and remote databases.

`npm run dev:mock` starts an optional deterministic local HTTP stub on `127.0.0.1:4010` (`LAUNCHSTACK_MOCK_HOST` and `LAUNCHSTACK_MOCK_PORT` can change the bind). Point an application adapter at `/mock/<service>` when a local response is useful. The stub does not reproduce any external provider's authentication, validation, state or failure behavior.

## Production

```bash
npm run prisma:deploy
npm run docker:build
npm run docker:prod
```

Each generated project receives unique development JWT secrets in its ignored `.env`. The `.env.example` file contains placeholders only. Local PostgreSQL and API ports bind to loopback by default. Before deployment, set explicit CORS and JWT settings, review the production port binding for your reverse proxy, and run `launchstack audit --production`.
