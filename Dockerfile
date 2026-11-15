# syntax=docker/dockerfile:1.7
FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npmca,required=false \
    if [ -f /run/secrets/npmca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npmca; fi; \
    npm ci

COPY . .
RUN npm run build

FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=secret,id=npmca,required=false \
    if [ -f /run/secrets/npmca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npmca; fi; \
    npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/bin ./bin

USER node

ENTRYPOINT ["node", "bin/launchstack.cjs"]
CMD ["--help"]
