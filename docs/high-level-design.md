# High-Level Design

## Purpose

The Finance Dashboard Backend is a single Express API that provides authentication, role-based authorization, financial record management, and dashboard analytics on top of MongoDB.

The design goal is to keep the service stateless at the HTTP layer so it is easy to run locally, test, and deploy behind a standard load balancer.

## System Context

```text
Browser / Frontend / API client
  -> Express backend
  -> JWT auth + RBAC
  -> MongoDB via Mongoose
```

The backend does not include a separate queue, cache, or worker service. All reads and writes happen synchronously within the API process.

## Major Building Blocks

### 1. API Layer

- Express routes define the HTTP surface area.
- Request parsing is handled by `express.json()` and `express.urlencoded()`.
- `morgan` provides request logging.
- A request ID is attached to every request for debugging and support.

### 2. Security Layer

- JWTs authenticate users.
- Role checks enforce viewer, analyst, and admin permissions.
- Rate limiting protects the public API surface.
- Validation prevents malformed payloads and query params from reaching business logic.

### 3. Domain Layer

- Auth controllers handle sign-up, login, and current-user lookup.
- User controllers manage admin-only user lifecycle actions.
- Record controllers handle finance record CRUD.
- Dashboard controllers compute aggregate summaries and trends.

### 4. Data Layer

- MongoDB stores users and records.
- Mongoose schemas enforce structure and indexing.
- Aggregations are executed directly against MongoDB for analytics.

## High-Level Request Flow

```text
Client request
  -> request ID middleware
  -> body parsing
  -> request logging
  -> rate limit check
  -> route auth / role check
  -> validation
  -> controller
  -> model query or aggregation
  -> response
```

## Core Use Cases

### Authentication

1. A user registers or logs in.
2. The server validates input.
3. The user is looked up in MongoDB.
4. A JWT is issued on success.
5. Subsequent calls present the token in the `Authorization` header.

### Record Management

1. An analyst or admin creates a record.
2. The server validates amount, type, category, and optional fields.
3. The record is written with `createdBy` set to the authenticated user.
4. Admins can later update or soft-delete the record.

### Dashboard Analytics

1. An authenticated user requests summary or trend data.
2. Optional date filters are validated.
3. MongoDB aggregation computes totals by date, month, or category.
4. The server returns chart-ready JSON.

## Operational Characteristics

- The service is stateless from the API perspective because authentication uses signed tokens.
- MongoDB is the source of truth for all application data.
- Soft delete keeps historical records available for reporting and audit.
- The system currently assumes a single shared dataset rather than per-tenant isolation.

## Scaling Notes

- Stateless JWT auth makes horizontal scaling straightforward.
- MongoDB aggregation on read keeps writes simple, but reporting cost rises with data volume.
- The current rate limiter is process-local, so a distributed deployment would need a shared rate-limit store.

## Key Tradeoffs

- Simple deployment versus advanced infrastructure: the app stays small and easy to operate, but it does not include caching, queues, or async processing.
- Read-time aggregation versus precomputed metrics: the implementation is flexible and accurate, but larger datasets will cost more at query time.
- Soft delete versus hard delete: the app preserves audit history, but deleted records continue to occupy storage.

