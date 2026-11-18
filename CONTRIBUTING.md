# Contributing to LaunchStack CLI

LaunchStack welcomes bug reports, feature suggestions, code, tests and documentation contributions in English. For confidential vulnerabilities use [SECURITY.md](SECURITY.md), not public issues.

## Issue and pull-request process

1. Search the [issue tracker](https://github.com/wbizmo/launchstack-cli/issues) and discuss substantial work before implementing it.
2. Fork the repository, create a focused topic branch from main and identify the issue being addressed.
3. Use Node.js 24 or 26 as supported by package.json, and install dependencies with npm ci.
4. Follow the TypeScript, ESLint, Prettier, naming and test conventions already established in the repository.
5. Add a regression test for every behavior fix and update the CLI reference and release notes for interface or compatibility changes.
6. Run npm run format:check, npm run lint, npm run typecheck and npm run test:run. Where the necessary PostgreSQL setup is available, run npm run release:check.
7. Submit a pull request explaining the problem, the change, testing, performance, backward compatibility, security effects, and any new dependency or third-party source.

## Review and acceptance

The [active default-branch ruleset](https://github.com/wbizmo/launchstack-cli/rules/21824160) specifies two approving reviews, code-owner review, a review of the last push and resolved threads. Squash or rebase merges are supported. A repository-role bypass is possible; a bypass is not itself proof of an independently reviewed change. OpenSSF Gold requires evidence of actual reviews across at least 50% of proposed modifications, regardless of the policy setting.

Maintainers review correctness, untrusted inputs, test coverage, supply-chain provenance, changes to user files, licensing/attribution and release risks. No release is authorized by a passing PR check alone.

Contributors must have the right to submit their material under the project's MIT license. Never paste proprietary code, another project’s code without its license terms or customer data into a pull request. Consult the [OpenChain contribution policy](docs/openchain/CONTRIBUTIONS.md).
