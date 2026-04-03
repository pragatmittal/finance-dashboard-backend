# Low-Level Design

## Purpose

This document describes how the backend is implemented internally: modules, middleware order, schemas, route rules, validation, and response behavior.

## Module Breakdown

| File / Folder | Responsibility |
| --- | --- |
| `src/server.js` | Process bootstrap, database connection, graceful shutdown |
| `src/app.js` | Express app construction and route mounting |
| `src/middleware/requestId.middleware.js` | Request correlation IDs |
| `src/middleware/auth.middleware.js` | JWT verification and role checks |
| `src/middleware/validate.middleware.js` | Express-validator result formatting |
| `src/middleware/dateRange.middleware.js` | Date range consistency checks |
| `src/middleware/errorHandler.middleware.js` | Central error translation and formatting |
| `src/models/user.model.js` | User schema, password hashing, JSON redaction |
| `src/models/record.model.js` | Record schema, soft delete behavior, indexes |
| `src/controllers/*.js` | Endpoint-specific business logic |
| `src/routes/*.js` | HTTP method wiring and validation chains |
| `src/utils/db.js` | MongoDB connection helper |
| `src/utils/env.js` | Required environment validation |
| `src/utils/seed.js` | Canonical development seed script |

## Middleware Order

The Express pipeline is important because each layer depends on the previous one:

1. `requestId` runs first so every later error can include a correlation ID.
2. Body parsers populate `req.body`.
3. `morgan` logs the request.
4. Rate limiting is applied to `/api`.
5. Route-specific middleware performs authentication and authorization.
6. Validators produce a standardized 400 response when inputs are invalid.
7. Controllers execute business logic.
8. The 404 handler catches unmatched routes.
9. The global error handler runs last.

## Authentication Flow

### Register

1. Client sends `name`, `email`, and `password`.
2. Validation checks field shape.
3. The user is created with a default `viewer` role unless the caller is an authenticated admin.
4. `bcryptjs` hashes the password before save.
5. A JWT is returned with the new user payload.

### Login

1. Client sends email and password.
2. The system looks up the user by email and explicitly selects the password hash.
3. The candidate password is compared with the stored hash.
4. Inactive users are rejected.
5. A signed JWT is returned.

### Authenticate Requests

1. `authenticate` reads the bearer token from `Authorization`.
2. The JWT is verified using `JWT_SECRET`.
3. The linked user is loaded from MongoDB.
4. Deactivated users are blocked.
5. `req.user` is attached for downstream controllers.

## Authorization Rules

| Role | Allowed Paths |
| --- | --- |
| `viewer` | `/api/auth/me`, read-only records, summary and trend endpoints |
| `analyst` | Viewer access plus `POST /api/records` and `GET /api/dashboard/weekly-trend` |
| `admin` | Full user management plus record update/delete operations |

Self-protection rules are enforced in controllers:

- An admin cannot change their own role.
- An admin cannot change their own active status.
- An admin cannot delete their own account.

## Schema-Level Design

### User Schema

Required fields and rules:

- `name`: 2 to 60 characters, trimmed.
- `email`: unique, lowercased, trimmed, valid email format.
- `password`: minimum 6 characters, excluded from normal query results.
- `role`: `viewer`, `analyst`, or `admin`.
- `isActive`: boolean flag for disabling accounts.

Behavior:

- Passwords are hashed with a cost factor of 12.
- `toJSON()` removes `password` and `__v`.
- `comparePassword()` wraps `bcrypt.compare()`.

### Record Schema

Required fields and rules:

- `amount`: positive number.
- `type`: `income` or `expense`.
- `category`: restricted vocabulary.
- `date`: required, defaults to the current time.
- `description`: optional, max 300 characters.
- `createdBy`: reference to `User`.
- `isDeleted`: soft-delete flag.
- `deletedAt`: timestamp for soft delete.

Behavior:

- Standard find queries automatically exclude deleted documents.
- Aggregations explicitly match `isDeleted: false`.
- `createdBy` is populated in list and detail responses for display purposes.

## Route-Level Design

### Auth Routes

| Route | Behavior |
| --- | --- |
| `POST /api/auth/register` | Creates a new account and returns JWT + user |
| `POST /api/auth/login` | Validates credentials and returns JWT + user |
| `GET /api/auth/me` | Returns the authenticated user profile |

### User Routes

| Route | Behavior |
| --- | --- |
| `GET /api/users` | Lists users with pagination and optional role/status filters |
| `GET /api/users/:id` | Returns a single user |
| `PATCH /api/users/:id/role` | Updates role |
| `PATCH /api/users/:id/status` | Activates or deactivates a user |
| `DELETE /api/users/:id` | Permanently deletes a user |

### Record Routes

| Route | Behavior |
| --- | --- |
| `GET /api/records` | Lists records with filters, pagination, search, and sorting |
| `GET /api/records/:id` | Returns a single record |
| `POST /api/records` | Creates a record |
| `PATCH /api/records/:id` | Updates a record partially |
| `DELETE /api/records/:id` | Soft-deletes a record |

### Dashboard Routes

| Route | Behavior |
| --- | --- |
| `GET /api/dashboard/summary` | Totals income, expense, and net balance |
| `GET /api/dashboard/category-breakdown` | Groups totals by category and type |
| `GET /api/dashboard/monthly-trend` | Returns month-by-month totals |
| `GET /api/dashboard/recent` | Returns recent activity |
| `GET /api/dashboard/weekly-trend` | Returns day-by-day totals for the last 7 days |

## Validation Design

Validation is split between request-level chains and model-level rules.

- `express-validator` checks request shape before controllers run.
- `validate.middleware.js` converts validation failures into a consistent 400 response.
- Mongoose schema validation catches invalid writes that reach the model layer.
- `dateRange.middleware.js` ensures `dateFrom <= dateTo` when both are present.

## Error Handling Design

The API normalizes errors in one place:

- Duplicate keys become `409`.
- Mongoose validation errors become `400`.
- Invalid ObjectIds become `400`.
- JWT verification issues become `401`.
- All errors include `requestId`.

In development, the response also includes the stack trace.

## Sequence Examples

### Create Record

```text
Client -> auth middleware -> role check -> request validation -> controller
     -> Record.create()
     -> populate(createdBy)
     -> JSON response
```

### Fetch Dashboard Summary

```text
Client -> auth middleware -> query validation -> date range validation
     -> aggregation pipeline
     -> summary response
```

### Soft Delete Record

```text
Client -> auth middleware -> admin role check -> controller
     -> findByIdAndUpdate(isDeleted=true, deletedAt=now)
     -> response
```

## Environment and Runtime Inputs

| Variable | Used By | Purpose |
| --- | --- | --- |
| `MONGO_URI` | DB bootstrap and seed script | Primary MongoDB connection string |
| `JWT_SECRET` | auth middleware and token creation | Token signing/verifying secret |
| `JWT_EXPIRES_IN` | auth controller | JWT expiration |
| `PORT` | server bootstrap | HTTP listen port |
| `NODE_ENV` | app bootstrap and error handler | Logging and error verbosity |
| `MONGO_URI_TEST` | tests | Separate test database |

## Implementation Assumptions

- The test suite uses a real MongoDB test database rather than an in-memory emulator.
- The canonical seed command is `npm run seed`.
- The root-level `seed.js` file is legacy and should not be treated as the primary workflow.
- The API currently exposes shared records rather than per-user data isolation.

## Known Tradeoffs

- Request-time analytics are simpler than maintaining derived tables, but they cost more as data grows.
- Soft delete is safer for audit trails, but recovery and purge workflows are not implemented.
- The current rate limiter is easy to operate, but not distributed-aware.

