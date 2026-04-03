# Architecture and Database Design

This page is the combined overview. For a concise system-level view, see [High-Level Design](./high-level-design.md). For implementation-level detail, see [Low-Level Design](./low-level-design.md).

## System Overview

The API is a single-process Express application backed by MongoDB through Mongoose.

```text
Client
  -> Express app
  -> requestId middleware
  -> JSON/body parsing
  -> morgan logging
  -> rate limiting on /api
  -> route-specific auth and validation
  -> controller
  -> Mongoose model / aggregation
  -> MongoDB
  -> error handler
```

## Runtime Lifecycle

1. `src/server.js` loads environment variables.
2. Runtime environment validation checks `MONGO_URI` and `JWT_SECRET`.
3. `connectDB()` connects to MongoDB with a short server selection timeout.
4. The Express app starts listening on `PORT` or `3000`.
5. `SIGINT` and `SIGTERM` trigger graceful shutdown.
6. Unhandled promise rejections and uncaught exceptions terminate the process.

This design keeps startup failures explicit and avoids serving traffic without a database connection.

## Request Pipeline

- `requestId` middleware attaches `X-Request-Id` to every request.
- `express.json()` and `express.urlencoded()` parse request bodies.
- `morgan` logs requests with a development/production format split.
- A global rate limit of 100 requests per 15 minutes per IP applies to `/api`.
- Route middleware handles authentication, authorization, and schema validation.
- A centralized error handler normalizes error output.

## Security Model

### Authentication

- JWTs are signed with `JWT_SECRET`.
- Token expiry defaults to `7d` unless `JWT_EXPIRES_IN` is set.
- The `Authorization` header uses `Bearer <token>`.

### Authorization

Role checks are coarse-grained:

- `viewer`: read-only access to records and dashboard data.
- `analyst`: viewer access plus record creation and weekly trend access.
- `admin`: user management plus record update and delete operations.

### Password Handling

- Passwords are hashed with `bcryptjs` using cost factor `12`.
- `password` is excluded from normal Mongoose queries with `select: false`.
- `toJSON()` removes the hashed password and `__v` before responses are serialized.

### Observability

- `requestId` is returned in error responses and the `X-Request-Id` response header.
- `morgan` provides request logging.
- Error logs include stack traces in development and concise messages elsewhere.

## Database Design

### `users` Collection

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required, trimmed, 2-60 characters |
| `email` | string | Required, unique, lowercase, trimmed |
| `password` | string | Required, hashed before save |
| `role` | string | `viewer`, `analyst`, or `admin`; defaults to `viewer` |
| `isActive` | boolean | Defaults to `true` |
| `createdAt` / `updatedAt` | date | Added by timestamps |

Important implementation details:

- `email` is the primary unique identifier used during login.
- Inactive users are blocked at authentication time.

### `records` Collection

| Field | Type | Notes |
| --- | --- | --- |
| `amount` | number | Required, must be greater than 0 |
| `type` | string | `income` or `expense` |
| `category` | string | Controlled vocabulary for grouping/filtering |
| `date` | date | Required, defaults to now |
| `description` | string | Optional, max 300 characters |
| `createdBy` | ObjectId ref `User` | Required creator reference |
| `isDeleted` | boolean | Soft delete flag |
| `deletedAt` | date | Timestamp for soft deletion |
| `createdAt` / `updatedAt` | date | Added by timestamps |

### Relationships

- One `User` can create many `Record` documents.
- `Record.createdBy` is populated in read operations for client-friendly display.

### Indexes

| Index | Purpose |
| --- | --- |
| `{ email: 1 }` on users | Fast login lookup and uniqueness enforcement |
| `{ type: 1, category: 1, date: -1 }` on records | Common filter and analytics pattern |
| `{ createdBy: 1, date: -1 }` on records | Creator-centric lookups |
| `{ isDeleted: 1 }` on records | Soft-delete filtering |

## Soft Delete Strategy

Records are never hard-removed from the database.

- `DELETE /api/records/:id` sets `isDeleted=true` and stores `deletedAt`.
- Standard find queries automatically exclude deleted documents.
- Summary and trend aggregations also filter out deleted records.

Tradeoff:

- Preserves auditability and historical integrity.
- Leaves deleted documents in storage, so collection size grows over time.

## Analytics Design

Dashboard endpoints are computed with MongoDB aggregation pipelines at request time:

- `summary` computes totals and counts.
- `category-breakdown` groups by category and type.
- `monthly-trend` groups by calendar month.
- `weekly-trend` groups by day for the last seven days.
- `recent` uses a sorted query rather than aggregation.

Tradeoff:

- Simpler consistency model and no cache invalidation.
- Higher read cost as data volume increases.

## Data Flow Examples

### Record Creation

```text
Authenticated analyst/admin
  -> validation
  -> Record.create()
  -> populate(createdBy)
  -> JSON response
```

### Dashboard Summary

```text
Authenticated user
  -> optional date range validation
  -> aggregation pipeline
  -> response payload with totals
```

### User Management

```text
Admin request
  -> authenticate
  -> admin authorization
  -> Mongoose update/delete
  -> response
```

## Assumptions

- The API operates on a shared finance dataset rather than tenant-separated workspaces.
- Record access is role-based, not per-user row-level isolated.
- The supported seeding entry point is `src/utils/seed.js` via `npm run seed`.
- The top-level `seed.js` file is legacy and is not part of the supported workflow.

## Tradeoffs

- Static Markdown documentation is easier to version and review than a generated docs server.
- Aggregating on read keeps writes simple, but analytics become more expensive as record volume grows.
- Soft delete preserves history, but restoration requires future work because there is no restore endpoint yet.
