# LaunchStack CLI

A TypeScript CLI for deployment automation, configuration management, Docker scaffolding, GitHub Actions generation, deployment tracking, and developer workflow tooling.

LaunchStack CLI helps developers standardize deployment workflows across projects through a lightweight, local-first command-line experience. It provides project initialization, configuration validation, deployment history tracking, rollback visibility, secrets management, infrastructure scaffolding, and workflow generation.

## Features

* Project initialization with `launchstack.config.json`
* Configuration validation
* Environment management
* Deployment provider management
* Deployment workflow execution
* Deployment history tracking
* Rollback target lookup
* Local secrets management
* Git metadata tracking
* Docker scaffolding generation
* GitHub Actions workflow generation
* TypeScript-first architecture
* Lightweight and extensible CLI design

---

## Installation

### Install from npm

```bash
npm install -g launchstack-cli
```

Verify installation:

```bash
launchstack --help
```

### Build from Source

```bash
git clone https://github.com/wbizmo/launchstack-cli.git

cd launchstack-cli

npm install

npm run build
```

Run locally:

```bash
node dist/cli.js --help
```

---

## Quick Start

Create a new project configuration:

```bash
launchstack init --name my-app
```

Check project status:

```bash
launchstack status
```

Validate configuration:

```bash
launchstack validate
```

Generate deployment assets:

```bash
launchstack docker init

launchstack github init
```

Run a deployment workflow:

```bash
launchstack deploy
```

---

## Commands

### Initialize a Project

Create a new configuration file.

```bash
launchstack init --name my-app
```

Overwrite an existing configuration:

```bash
launchstack init --name my-app --force
```

---

### View Project Status

```bash
launchstack status
```

Displays:

* Application name
* Environment
* Provider
* Build command
* Output directory
* Deploy target
* Configuration status

---

### Validate Configuration

```bash
launchstack validate
```

Validates the current `launchstack.config.json`.

---

### Manage Environments

View current environment:

```bash
launchstack env
```

Update environment:

```bash
launchstack env staging
```

Supported environments:

```text
development
staging
production
```

---

### Manage Providers

View current provider:

```bash
launchstack provider
```

Update provider:

```bash
launchstack provider docker
```

Supported providers:

```text
vercel
netlify
render
railway
docker
custom
```

---

### Deploy

Run the configured deployment workflow:

```bash
launchstack deploy
```

Skip build execution:

```bash
launchstack deploy --skip-build
```

Deployment execution includes:

* Configuration loading
* Build execution
* Output validation
* Git metadata collection
* Deployment history recording

---

### Deployment History

View deployment history:

```bash
launchstack history
```

Limit results:

```bash
launchstack history --limit 3
```

History location:

```text
.launchstack/history.json
```

---

### Rollback Lookup

Display the most recent successful deployment:

```bash
launchstack rollback
```

---

### Secrets Management

Add a secret:

```bash
launchstack secrets add API_KEY abc123
```

List secrets:

```bash
launchstack secrets list
```

Remove a secret:

```bash
launchstack secrets remove API_KEY
```

Secrets location:

```text
.launchstack/secrets.json
```

This file should never be committed.

---

### Docker Scaffolding

Generate Docker assets:

```bash
launchstack docker init
```

Overwrite existing files:

```bash
launchstack docker init --force
```

Generated files:

```text
Dockerfile
.dockerignore
docker-compose.yml
```

---

### GitHub Actions Workflow Generation

Generate a deployment workflow:

```bash
launchstack github init
```

Overwrite existing workflows:

```bash
launchstack github init --force
```

Generated file:

```text
.github/workflows/deploy.yml
```

---

## Configuration

LaunchStack uses a project-level configuration file:

```text
launchstack.config.json
```

Example:

```json
{
  "appName": "my-app",
  "environment": "production",
  "provider": "custom",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "deployTarget": "https://example.com"
}
```

---

## Project Structure

```text
src/
├── commands/
│   ├── deploy.ts
│   ├── docker.ts
│   ├── env.ts
│   ├── github.ts
│   ├── history.ts
│   ├── init.ts
│   ├── provider.ts
│   ├── rollback.ts
│   ├── secrets.ts
│   ├── status.ts
│   └── validate.ts
├── cli.ts
├── config.ts
├── git.ts
├── history.ts
├── index.ts
├── types.ts
└── errors.ts

tests/
examples/
```

---

## Development

Install dependencies:

```bash
npm install
```

Start development build watcher:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Format files:

```bash
npm run format
```

---

## Tech Stack

* TypeScript
* Node.js
* Commander
* Zod
* tsup
* Vitest
* ESLint
* Prettier

---

## Use Cases

LaunchStack CLI is designed for:

* Deployment workflow standardization
* Local DevOps automation
* Infrastructure scaffolding
* Team onboarding
* Environment management
* Developer tooling experimentation
* CI/CD workflow generation

---

## Roadmap

Future improvements may include:

* Interactive project setup prompts
* Encrypted secrets storage
* Provider-specific deployment adapters
* Deployment preview URLs
* Rollback execution workflows
* JSON output support
* Plugin architecture
* Custom deployment providers

---

## License

MIT

---

## Author

Williams Ashibuogwu (wbizmo)

GitHub: https://github.com/wbizmo

npm: https://www.npmjs.com/package/launchstack-cli
