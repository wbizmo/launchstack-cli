# Docker builds

Generated projects use Docker Compose for local services and production builds. The generated Dockerfile supports an optional BuildKit secret named `npmca` for environments where npm requires a private or organization-trusted certificate authority.

## Build behind a custom CA

Keep the CA certificate outside the project and repository. Create a local Compose override named `docker-compose.ca.yml`:

```yaml
services:
  api:
    build:
      secrets:
        - npmca

secrets:
  npmca:
    file: ${NODE_EXTRA_CA_CERTS:?Set this to the CA certificate path}
```

Set `NODE_EXTRA_CA_CERTS` to the CA file and include the override when building:

```bash
export NODE_EXTRA_CA_CERTS=/absolute/path/to/company-ca.pem
docker compose \
  -f docker-compose.yml \
  -f docker-compose.production.yml \
  -f docker-compose.ca.yml \
  up --detach --build --wait
```

The certificate is mounted only while Dockerfile dependency-install steps run. It is not copied into the build context or final image. Keep the override and certificate out of version control; add `docker-compose.ca.yml` to `.gitignore` if it contains machine-specific paths. Remove the override when it is no longer needed.
