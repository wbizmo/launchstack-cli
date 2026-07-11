# LaunchStack CLI

Production-ready backend scaffolding and deployment toolkit for TypeScript developers.

LaunchStack CLI generates enterprise-grade Fastify APIs with authentication, Prisma, PostgreSQL, Swagger/OpenAPI, Docker, CI/CD, deployment presets, and opinionated project architecture in a single command.

```bash
npm install -g launchstack-cli
```

---

## Features

- Fastify + TypeScript API starter
- Prisma ORM with PostgreSQL
- JWT Access & Refresh Token authentication
- Secure Refresh Token rotation and revocation
- bcrypt password hashing
- Zod request and response validation
- Swagger / OpenAPI documentation
- Layered architecture (Controllers, Services, Repositories & DTOs)
- Health and Readiness endpoints
- Docker and Docker Compose support
- GitHub Actions CI workflow
- Render, Railway and Fly.io deployment presets
- Vitest testing setup
- Environment configuration
- Production-ready project structure

---

## Requirements

- Node.js 20 or newer
- PostgreSQL (or Docker Desktop)

---

## Installation

Install LaunchStack globally:

```bash
npm install -g launchstack-cli
```

Verify the installation:

```bash
launchstack --help
```

---

## Quick Start

Create a new backend API:

```bash
launchstack create my-api
```

Move into the project and install dependencies:

```bash
cd my-api
npm install
```

Start the local database:

```bash
npm run db:up
```

Create the initial database schema:

```bash
npm run prisma:migrate -- --name init
```

Start the development server:

```bash
npm run dev
```

Open the generated API:

| Endpoint | URL |
|----------|-----|
| Swagger UI | http://localhost:3000/docs |
| Health | http://localhost:3000/health |
| Readiness | http://localhost:3000/ready |

---

## Generated Project Structure

```text
my-api/
├── prisma/
├── src/
│   ├── config/
│   ├── core/
│   ├── lib/
│   ├── middleware/
│   ├── modules/
│   │   ├── auth/
│   │   └── users/
│   ├── plugins/
│   ├── routes/
│   ├── schemas/
│   └── types/
├── tests/
├── Dockerfile
├── docker-compose.yml
├── README.md
└── package.json
```

---

## Generated Technology Stack

- Fastify
- TypeScript
- Prisma
- PostgreSQL
- JWT Authentication
- bcrypt
- Zod
- Swagger / OpenAPI
- Docker
- Docker Compose
- GitHub Actions
- Render
- Railway
- Fly.io
- Vitest

---

## Core Commands

### Create a new API

```bash
launchstack create my-api
```

Skip dependency installation:

```bash
launchstack create my-api --no-install
```

Inspect a generated project:

```bash
launchstack doctor --directory my-api
```

Generate a JSON health report:

```bash
launchstack doctor --directory my-api --json
```

Initialize LaunchStack configuration:

```bash
launchstack init --name my-app
```

Validate configuration:

```bash
launchstack validate
```

View project status:

```bash
launchstack status
```

Switch deployment environment:

```bash
launchstack env staging
```

Select a deployment provider:

```bash
launchstack provider render
```

Deploy:

```bash
launchstack deploy
```

View deployment history:

```bash
launchstack history
```

Find the latest rollback target:

```bash
launchstack rollback
```

Manage secrets:

```bash
launchstack secrets add API_KEY value
launchstack secrets list
launchstack secrets remove API_KEY
```

Generate Docker assets:

```bash
launchstack docker init
```

Generate GitHub Actions workflows:

```bash
launchstack github init
```

---

## Generated Project Commands

### Quality

```bash
npm run typecheck
npm test
npm run build
npm run check
npm run validation:check
```

### Production

```bash
npm run docker:build
npm run docker:up
npm run docker:prod
npm run docker:down
npm run docker:logs
npm run prisma:deploy
```

---

## Development

Install project dependencies:

```bash
npm install
```

Run the LaunchStack test suite:

```bash
npm run test:run
```

Build LaunchStack:

```bash
npm run build
```

Inspect the npm package:

```bash
npm pack --dry-run
```

Run the release quality gate:

```bash
npm run release:check
```

---

## Roadmap

Upcoming improvements planned for future releases include:

- Additional backend templates
- Background job scaffolding
- Redis integration
- Queue workers
- WebSocket support
- Microservice templates
- OAuth providers
- Kubernetes deployment presets
- Additional cloud providers

---

## Contributing

Issues, feature requests and pull requests are welcome.

If you'd like to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Submit a pull request.

---

## Author

**Williams Ashibuogwu**

- GitHub: https://github.com/wbizmo
- LinkedIn: https://linkedin.com/in/wbizmo
- npm: https://www.npmjs.com/package/launchstack-cli