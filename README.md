# LaunchStack CLI

LaunchStack CLI is a TypeScript command-line tool for creating production-ready backend API starters and managing deployment workflows.

It generates a Fastify API with TypeScript, Prisma, PostgreSQL, JWT authentication, refresh tokens, Zod validation, Swagger/OpenAPI, Docker, GitHub Actions, and deployment presets.

## Installation

Install globally:

    npm install -g launchstack-cli

Verify:

    launchstack --help

## Create a Backend API

    launchstack create my-api

Then:

    cd my-api
    npm install
    npm run db:up
    npm run prisma:migrate -- --name init
    npm run dev

Swagger UI:

    http://localhost:3000/docs

Health:

    http://localhost:3000/health

Readiness:

    http://localhost:3000/ready

## Generated Stack

- Fastify
- TypeScript
- Prisma
- PostgreSQL
- JWT access and refresh tokens
- bcrypt password hashing
- Zod validation
- Swagger/OpenAPI
- Controllers, services, repositories, and DTOs
- Docker and Docker Compose
- GitHub Actions
- Render, Railway, and Fly.io presets
- Vitest

## Core Commands

Create a project:

    launchstack create my-api

Skip installation:

    launchstack create my-api --no-install

Inspect a generated project:

    launchstack doctor --directory my-api

JSON doctor report:

    launchstack doctor --directory my-api --json

Initialize LaunchStack configuration:

    launchstack init --name my-app

Validate configuration:

    launchstack validate

View status:

    launchstack status

Switch environment:

    launchstack env staging

Set provider:

    launchstack provider render

Run deployment workflow:

    launchstack deploy

View history:

    launchstack history

Find rollback target:

    launchstack rollback

Manage secrets:

    launchstack secrets add API_KEY value
    launchstack secrets list
    launchstack secrets remove API_KEY

Generate Docker assets:

    launchstack docker init

Generate GitHub Actions:

    launchstack github init

## Generated Project Quality Commands

    npm run typecheck
    npm test
    npm run build
    npm run check
    npm run validation:check

## Production Commands

    npm run docker:build
    npm run docker:up
    npm run docker:prod
    npm run docker:down
    npm run docker:logs
    npm run prisma:deploy

## Development

Install dependencies:

    npm install

Run tests:

    npm run test:run

Build:

    npm run build

Inspect package contents:

    npm pack --dry-run

Run the release quality gate:

    npm run release:check

## License

MIT

## Author

Williams Ashibuogwu

GitHub: https://github.com/wbizmo

npm: https://www.npmjs.com/package/launchstack-cli
