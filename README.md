# LaunchStack CLI

LaunchStack CLI is a TypeScript command-line tool for managing deployment workflows, project launch configuration, environment switching, provider selection, deployment history, rollback visibility, local secrets, Docker scaffolding, and GitHub Actions workflow generation.

It is built as a lean DevOps utility for developers who want a simple, local-first way to prepare and standardize deployment workflows across projects.

---

## Features

* Project initialization with `launchstack.config.json`
* Config validation
* Environment switching
* Deployment provider management
* Build and deployment workflow execution
* Deployment history tracking
* Rollback target lookup
* Local secrets management
* Git metadata tracking during deployments
* Docker file generation
* GitHub Actions workflow generation
* TypeScript-first architecture
* Lightweight CLI design

---

## Installation

Clone the repository:

```bash
git clone https://github.com/wbizmo/launchstack-cli.git
cd launchstack-cli
```

Install dependencies:

```bash
npm install
```

Build the CLI:

```bash
npm run build
```

Run locally:

```bash
node dist/cli.js --help
```

---

## Usage

```bash
launchstack <command>
```

When running locally before publishing to npm:

```bash
node dist/cli.js <command>
```

---

## Commands

### Initialize a project

Creates a `launchstack.config.json` file.

```bash
node dist/cli.js init --name my-app
```

Force overwrite an existing config:

```bash
node dist/cli.js init --name my-app --force
```

---

### View project status

```bash
node dist/cli.js status
```

Displays the current app name, environment, provider, build command, output directory, deploy target, and config status.

---

### Validate config

```bash
node dist/cli.js validate
```

Checks whether `launchstack.config.json` is valid.

---

### Switch environment

View current environment:

```bash
node dist/cli.js env
```

Update environment:

```bash
node dist/cli.js env staging
```

Supported environments:

```text
development
staging
production
```

---

### Manage deployment provider

View current provider:

```bash
node dist/cli.js provider
```

Update provider:

```bash
node dist/cli.js provider docker
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

### Run deployment workflow

```bash
node dist/cli.js deploy
```

Skip the build step:

```bash
node dist/cli.js deploy --skip-build
```

The deploy command reads the project config, runs the configured build command, verifies the output directory, captures Git metadata, and records deployment history.

---

### View deployment history

```bash
node dist/cli.js history
```

Limit the number of records:

```bash
node dist/cli.js history --limit 3
```

Deployment history is stored locally in:

```text
.launchstack/history.json
```

---

### Rollback lookup

```bash
node dist/cli.js rollback
```

Displays the latest successful deployment available as a rollback target.

---

### Manage local secrets

Add a secret:

```bash
node dist/cli.js secrets add API_KEY abc123
```

List secret keys:

```bash
node dist/cli.js secrets list
```

Remove a secret:

```bash
node dist/cli.js secrets remove API_KEY
```

Secrets are stored locally in:

```text
.launchstack/secrets.json
```

This file should not be committed.

---

### Generate Docker files

```bash
node dist/cli.js docker init
```

Force overwrite existing Docker files:

```bash
node dist/cli.js docker init --force
```

Generated files:

```text
Dockerfile
.dockerignore
docker-compose.yml
```

---

### Generate GitHub Actions workflow

```bash
node dist/cli.js github init
```

Force overwrite an existing workflow:

```bash
node dist/cli.js github init --force
```

Generated file:

```text
.github/workflows/deploy.yml
```

---

## Configuration

LaunchStack uses a local config file:

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
  commands/
    deploy.ts
    docker.ts
    env.ts
    github.ts
    history.ts
    init.ts
    provider.ts
    rollback.ts
    secrets.ts
    status.ts
    validate.ts
  cli.ts
  config.ts
  git.ts
  history.ts
  index.ts
  types.ts
  errors.ts
tests/
examples/
```

---

## Development

Run the development build watcher:

```bash
npm run dev
```

Build for production:

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

## Why LaunchStack CLI?

LaunchStack CLI demonstrates practical DevOps tooling concepts in a clean TypeScript project. It is intentionally lightweight, but covers core areas used in real deployment workflows:

* CLI architecture
* Config validation
* Environment management
* Build automation
* Git metadata collection
* Deployment history
* Secrets handling
* Docker scaffolding
* CI workflow generation

---

## Roadmap

Planned improvements:

* Interactive init prompts
* Encrypted secrets storage
* Provider-specific deployment adapters
* Deployment preview URLs
* Rollback execution hooks
* JSON output mode
* Plugin system for custom providers

---

## License

MIT

---

## Author

Williams

GitHub: [wbizmo](https://github.com/wbizmo)
