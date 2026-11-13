# syntax=docker/dockerfile:1.7
FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN --mount=type=secret,id=npmca,required=false \
    if [ -f /run/secrets/npmca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npmca; fi; \
    npm ci

FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
COPY prisma ./prisma

RUN --mount=type=secret,id=npmca,required=false \
    if [ -f /run/secrets/npmca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npmca; fi; \
    npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=node:node --from=build /app/scripts/healthcheck.cjs ./scripts/healthcheck.cjs

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=10 CMD ["node","scripts/healthcheck.cjs"]

CMD ["node","dist/server.js"]
