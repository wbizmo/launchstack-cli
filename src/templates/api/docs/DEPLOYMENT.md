# Deployment Guide

## Environment Variables

Configure these values before deployment:

    NODE_ENV=production
    HOST=0.0.0.0
    PORT=3000
    DATABASE_URL=postgresql://...
    JWT_ACCESS_SECRET=...
    JWT_REFRESH_SECRET=...
    JWT_ACCESS_EXPIRES_IN=15m
    JWT_REFRESH_EXPIRES_IN=7d
    CORS_ORIGIN=https://your-frontend.example

Use unique secrets containing at least 32 characters.

## Docker

Build:

    npm run docker:build

Run:

    npm run docker:up

Production Compose override:

    npm run docker:prod

## Database

Apply production migrations:

    npm run prisma:deploy

## Health Endpoints

    GET /health
    GET /health/database
    GET /ready

## Providers

Starter configuration is included for:

- Render
- Railway
- Fly.io
- Docker-compatible hosting
