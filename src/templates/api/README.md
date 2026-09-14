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
launchstack preview pr-142
```

Generated CRUD resources are authenticated and owner-scoped at persistence boundaries by default. Add domain-specific RBAC/invariants in services before privileged workflows.

## Quality

```bash
npm run typecheck
npm test
npm run build
npm run check
```

## Production

```bash
npm run prisma:deploy
npm run docker:build
npm run docker:prod
```

Replace all placeholder secrets, configure explicit production CORS/database settings and review `launchstack audit --production` before deployment.
