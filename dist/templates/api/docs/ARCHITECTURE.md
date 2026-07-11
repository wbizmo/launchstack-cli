# Application Architecture

This project uses a modular layered architecture.

## Layers

### Routes

Routes define HTTP endpoints, schemas, authentication, and middleware.

### Controllers

Controllers translate HTTP requests into service calls and return HTTP responses.

### Services

Services contain application logic and coordinate repositories.

### Repositories

Repositories isolate Prisma database operations.

### DTOs

DTOs control which fields are exposed to API consumers.

### Core

Core modules contain reusable errors, response helpers, pagination utilities, and shared types.

## Request Flow

    Request
      -> Route
      -> Controller
      -> Service
      -> Repository
      -> Prisma
      -> PostgreSQL

## Error Flow

Application services throw structured application errors.

The central Fastify error handler converts them into consistent HTTP responses.
