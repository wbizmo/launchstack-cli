# LaunchStack CLI v1.0.0

Release date: 2026-06-18

The initial production release of LaunchStack CLI introduced a TypeScript command-line toolkit for project configuration and deployment workflows.

## Features

- Initialize and validate project configuration, and switch environments.
- Manage deployment providers, run deployment workflows, review deployment history and find rollback targets.
- Store local secrets and track Git metadata.
- Generate Docker scaffolding and GitHub Actions workflows.
- Provide `init`, `status`, `validate`, `env`, `provider`, `deploy`, `history`, `rollback`, `secrets`, `docker init` and `github init` commands.

## Technology

The CLI is built with TypeScript, Node.js, Commander and Zod. It uses a local-first configuration model and integrates with Git, Docker and GitHub Actions.

## Install

```bash
npm install --global launchstack-cli@1.0.0
```

## Attribution

LaunchStack CLI was created by Williams Ashibuogwu (wbizmo) and is maintained by Zivora Labs. See the [MIT license](LICENSE).
