# First-party capability coverage

`launchstack add --list` and `launchstack add <id>` show whether a capability is a complete local integration or a helper-only starting point.

| Capability | Coverage | Installed behavior |
|---|---|---|
| `redis` | Complete local integration | Adds an ioredis client, health-checked Redis Compose service, loopback port binding and `REDIS_URL`. |
| `queue` | Complete local integration | Adds BullMQ, `npm run worker`, a default worker entrypoint, retry/backoff defaults and graceful shutdown. Depends on Redis. Applications add their own producers and job processors. |
| `cron` | Complete local integration | Adds `npm run scheduler`, an interval scheduler entrypoint, overlap suppression, error reporting and SIGINT/SIGTERM shutdown. Replace the example scheduled task with application work. |
| `oauth` | Helper-only | Builds an authorization URL. Callback routes, state persistence, token exchange and identity mapping are application work. |
| `storage` | Helper-only | Reads and validates S3-compatible storage configuration. Upload/download client wiring and bucket policy are application work. |
| `observability` | Helper-only | Exposes an OpenTelemetry API tracer. SDK/exporter configuration and instrumentation are application work. |
| `websocket` | Helper-only | Registers the Fastify WebSocket plugin. Application routes, authentication and message handling are application work. |
| `email` | Helper-only | Defines an adapter interface and sender configuration helper. A transport, delivery policy and retry handling remain application work. |
| `webhooks` | Helper-only | Verifies HMAC signatures. Request route wiring, replay protection and delivery handling remain application work. |

Capability package additions resolve `package.json` and `package-lock.json` together with npm using `--ignore-scripts`; install lifecycle scripts run later through the user's normal `npm ci`. Compose fragments are merged deterministically, checked for conflicting service/volume/network definitions and written as JSON-compatible YAML to `docker-compose.launchstack.yml`. Modified generated files and unowned paths stop the operation with a conflict.

The package lock may require registry access when its needed package metadata is not in npm's cache. A failed resolution leaves the project untouched. Capability removal preserves package dependencies and `.env.example` declarations because application code may still use them; generated files and scripts are removed only when their recorded content remains LaunchStack-owned.
