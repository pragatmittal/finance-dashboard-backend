# Finance Dashboard Backend

Finance Dashboard Backend is a Node.js, Express, and MongoDB API for finance record tracking, role-based access control, and dashboard analytics.

The repository is docs-first after this update:
- `README.md` is the entry point.
- `docs/api.md` contains the endpoint reference.
- `docs/architecture.md` is the combined design overview.
- `docs/high-level-design.md` covers the system-level design.
- `docs/low-level-design.md` covers implementation-level design.

## What It Provides

- JWT authentication and role-based authorization.
- User management for admins.
- Income and expense record CRUD with filters and soft delete.
- Aggregate dashboard endpoints for totals and trends.
- Standardized JSON error handling with request IDs.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `src/app.js` | Express app composition and route registration |
| `src/server.js` | Runtime bootstrap, DB connection, and graceful shutdown |
| `src/models/` | Mongoose schemas for users and records |
| `src/controllers/` | Route handlers and aggregation logic |
| `src/routes/` | Endpoint definitions and request validation |
| `src/middleware/` | Authentication, validation, request IDs, and error handling |
| `src/utils/seed.js` | Canonical seed script used by `npm run seed` |
| `docs/` | API, architecture, and design documentation |

## Quick Start

### 1. Prerequisites

- Node.js 20 or newer
- MongoDB instance or MongoDB Atlas connection string

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a local `.env` file from `.env.example` and fill in your values.

```bash
cp .env.example .env
```

### 4. Seed Demo Data

The canonical seed path is `src/utils/seed.js` through the npm script.

```bash
npm run seed
```

Warning: the seed script clears the existing `users` and `records` collections before inserting demo data.

### 5. Start the API

```bash
npm run dev
```

The server listens on `PORT` or defaults to `3000`.

### 6. Run Tests

```bash
npm test
```

The test suite uses `MONGO_URI_TEST`. If it is unset, it falls back to `mongodb://localhost:27017/finance_dashboard_test`.

## Environment Variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGO_URI` | Yes | None | MongoDB connection string used by the API and seed script |
| `JWT_SECRET` | Yes | None | Secret used to sign and verify JWTs |
| `JWT_EXPIRES_IN` | No | `7d` | JWT lifetime used when issuing access tokens |
| `PORT` | No | `3000` | HTTP port for the server |
| `NODE_ENV` | No | `development` | Controls logging and error detail behavior |
| `MONGO_URI_TEST` | No | `mongodb://localhost:27017/finance_dashboard_test` | MongoDB connection string used by `npm test` |

## Authentication and Roles

All protected routes expect a bearer token:

```http
Authorization: Bearer <token>
```

| Role | Capabilities |
| --- | --- |
| `viewer` | Read auth profile, list records, read dashboard summaries and trends |
| `analyst` | All viewer capabilities plus create records and access weekly trend data |
| `admin` | Full access, including user management and record update/delete operations |

Important: public registration always creates a `viewer` account. The `role` field is accepted by validation but is not applied to anonymous sign-ups.

## Sample Seed Accounts

These credentials come from `src/utils/seed.js`, which is what `npm run seed` executes.

| Name | Email | Password | Role |
| --- | --- | --- | --- |
| Rahul Mittal | `rahulmittal@finance.dev` | `admin123` | admin |
| Rajesh Verma | `rajeshverma@finance.dev` | `analyst123` | analyst |
| Rajesh Kumar | `rajeshkumar@finance.dev` | `analyst123` | viewer |
| Rajesh Sharma | `rajeshsharma@finance.dev` | `analyst123` | viewer |

## API at a Glance

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/` | Public health check |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/auth/me` | Authenticated |
| `GET` | `/api/users` | Admin only |
| `GET` | `/api/users/:id` | Admin only |
| `PATCH` | `/api/users/:id/role` | Admin only |
| `PATCH` | `/api/users/:id/status` | Admin only |
| `DELETE` | `/api/users/:id` | Admin only |
| `GET` | `/api/records` | Authenticated |
| `GET` | `/api/records/:id` | Authenticated |
| `POST` | `/api/records` | Analyst or admin |
| `PATCH` | `/api/records/:id` | Admin only |
| `DELETE` | `/api/records/:id` | Admin only |
| `GET` | `/api/dashboard/summary` | Authenticated |
| `GET` | `/api/dashboard/category-breakdown` | Authenticated |
| `GET` | `/api/dashboard/monthly-trend` | Authenticated |
| `GET` | `/api/dashboard/recent` | Authenticated |
| `GET` | `/api/dashboard/weekly-trend` | Analyst or admin |

## Response Conventions

- Successful responses use `success: true`.
- Error responses use `success: false` and include a `requestId`.
- Validation failures include an `errors` array with field-level messages.
- In development, unhandled errors can include a stack trace.

## Assumptions and Tradeoffs

- Documentation is static Markdown rather than a live Swagger/OpenAPI server.
- The API assumes a shared finance dataset rather than tenant-isolated data.
- Records are soft-deleted so audit history can be preserved.
- Dashboard metrics are computed at read time with MongoDB aggregation rather than materialized summaries.
- The top-level `seed.js` file is legacy; `npm run seed` is the supported path.

## Troubleshooting

- If the server fails to start, check that `MONGO_URI` and `JWT_SECRET` are set.
- If a port error appears, change `PORT` or stop the process using that port.
- If authentication fails, confirm the token is present and not expired.
- If tests fail to connect to MongoDB, set `MONGO_URI_TEST` to a reachable test database.

## Further Reading

- [API documentation](docs/api.md)
- [Architecture and database design](docs/architecture.md)
- [High-level design](docs/high-level-design.md)
- [Low-level design](docs/low-level-design.md)
