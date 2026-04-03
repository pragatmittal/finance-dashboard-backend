# API Documentation

## Base URL

```text
http://localhost:3000
```

## Conventions

- All request and response bodies are JSON unless stated otherwise.
- Protected routes require a bearer token.

```http
Authorization: Bearer <token>
```

- The API uses a consistent envelope for success and error responses.

### Success Envelope

Most endpoints return:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

The actual payload key varies by endpoint, for example `user`, `users`, `record`, `records`, `summary`, `breakdown`, or `trend`.

### Error Envelope

```json
{
  "success": false,
  "message": "Validation failed",
  "requestId": "c9f4c5f2-4eb7-4ca5-8e12-57e7ce4d1b7a",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

`requestId` is attached by middleware and is also sent back as an `X-Request-Id` response header.

## Common Status Codes

| Code | Meaning |
| --- | --- |
| `200` | Request succeeded |
| `201` | Resource created |
| `400` | Validation failure or bad input |
| `401` | Missing, invalid, or expired token |
| `403` | Authenticated but not allowed |
| `404` | Resource or route not found |
| `409` | Duplicate resource, such as an email conflict |
| `500` | Unexpected server error |

## Health Check

### `GET /`

Public health check for the service.

#### Response

```json
{
  "success": true,
  "message": "Finance Dashboard API is running",
  "version": "1.0.0",
  "docs": "See README.md, docs/api.md, and docs/architecture.md"
}
```

## Authentication

### `POST /api/auth/register`

Create a new user account.

Auth: none

#### Request Body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | 2 to 60 characters |
| `email` | string | Yes | Must be a valid email address |
| `password` | string | Yes | Minimum 6 characters |
| `role` | string | No | Accepted by validation, but anonymous registration always creates a `viewer` account |

#### Example Request

```json
{
  "name": "New User",
  "email": "new@example.com",
  "password": "newpass123"
}
```

#### Response

```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "66c7c1d2f8e7f8d3b9e12345",
    "name": "New User",
    "email": "new@example.com",
    "role": "viewer",
    "isActive": true,
    "createdAt": "2026-04-03T10:00:00.000Z",
    "updatedAt": "2026-04-03T10:00:00.000Z",
    "id": "66c7c1d2f8e7f8d3b9e12345"
  }
}
```

---

### `POST /api/auth/login`

Authenticate a user and return a JWT.

Auth: none

#### Request Body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | string | Yes | Must be a valid email address |
| `password` | string | Yes | Plain-text password |

#### Example Request

```json
{
  "email": "rahulmittal@finance.dev",
  "password": "admin123"
}
```

#### Response

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "66c7c1d2f8e7f8d3b9e12345",
    "name": "Rahul Mittal",
    "email": "rahulmittal@finance.dev",
    "role": "admin",
    "isActive": true,
    "createdAt": "2026-04-03T10:00:00.000Z",
    "updatedAt": "2026-04-03T10:00:00.000Z",
    "id": "66c7c1d2f8e7f8d3b9e12345"
  }
}
```

#### Errors

- `401` if the email or password is invalid.
- `403` if the account is deactivated.

---

### `GET /api/auth/me`

Return the currently authenticated user profile.

Auth: required

#### Response

```json
{
  "success": true,
  "user": {
    "_id": "66c7c1d2f8e7f8d3b9e12345",
    "name": "Rahul Mittal",
    "email": "rahulmittal@finance.dev",
    "role": "admin",
    "isActive": true,
    "createdAt": "2026-04-03T10:00:00.000Z",
    "updatedAt": "2026-04-03T10:00:00.000Z",
    "id": "66c7c1d2f8e7f8d3b9e12345"
  }
}
```

## Users

All user-management endpoints require authentication and the `admin` role.

### `GET /api/users`

List users with optional filters and pagination.

#### Query Parameters

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `role` | string | none | `viewer`, `analyst`, or `admin` |
| `isActive` | boolean string | none | Use `true` or `false` |
| `page` | integer | `1` | Must be positive |
| `limit` | integer | `20` | Min `1`, max `100` |

#### Response

```json
{
  "success": true,
  "total": 3,
  "page": 1,
  "pages": 1,
  "users": []
}
```

---

### `GET /api/users/:id`

Get a single user by MongoDB ObjectId.

#### Response

```json
{
  "success": true,
  "user": {}
}
```

#### Errors

- `400` if the `id` is not a valid MongoDB ObjectId.
- `404` if the user does not exist.

---

### `PATCH /api/users/:id/role`

Update another user's role.

#### Request Body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `role` | string | Yes | Must be `viewer`, `analyst`, or `admin` |

#### Notes

- Admins cannot change their own role.
- The updated user is returned in the response.

---

### `PATCH /api/users/:id/status`

Activate or deactivate a user.

#### Request Body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `isActive` | boolean | Yes | `true` activates, `false` deactivates |

#### Notes

- Admins cannot change their own active status.
- Deactivated users cannot authenticate.

---

### `DELETE /api/users/:id`

Delete a user permanently.

#### Notes

- Admins cannot delete their own account.
- This is a hard delete, unlike record deletion.

## Records

All record endpoints require authentication.

Supported record categories:

`salary`, `freelance`, `investment`, `rental`, `business`, `food`, `transport`, `utilities`, `healthcare`, `education`, `entertainment`, `shopping`, `travel`, `insurance`, `taxes`, `other`

### `GET /api/records`

List financial records with filters, search, pagination, and sorting.

#### Query Parameters

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `type` | string | none | `income` or `expense` |
| `category` | string | none | Must be one of the allowed record categories |
| `dateFrom` | ISO date | none | Lower bound for record date |
| `dateTo` | ISO date | none | Upper bound for record date |
| `search` | string | none | Case-insensitive regex match against `description` |
| `page` | integer | `1` | Must be positive |
| `limit` | integer | `20` | Min `1`, max `100` |
| `sortBy` | string | `date` | `date` or `amount` |
| `order` | string | `desc` | `asc` or `desc` |

#### Notes

- Default sorting is newest first by `date`.
- Soft-deleted records are excluded.
- `createdBy` is populated with `name`, `email`, and `role`.
- If both `dateFrom` and `dateTo` are provided, `dateFrom` must be less than or equal to `dateTo`.

#### Response

```json
{
  "success": true,
  "total": 60,
  "page": 1,
  "pages": 3,
  "records": []
}
```

---

### `GET /api/records/:id`

Get a single record by ObjectId.

#### Response

```json
{
  "success": true,
  "record": {}
}
```

---

### `POST /api/records`

Create a new financial record.

Auth: analyst or admin

#### Request Body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `amount` | number | Yes | Must be greater than 0 |
| `type` | string | Yes | `income` or `expense` |
| `category` | string | Yes | Must be one of the supported categories |
| `date` | ISO date | No | Defaults to now if omitted |
| `description` | string | No | Max 300 characters |

#### Example Request

```json
{
  "amount": 5000,
  "type": "income",
  "category": "salary",
  "date": "2026-04-01",
  "description": "April salary"
}
```

#### Response

```json
{
  "success": true,
  "message": "Record created successfully.",
  "record": {}
}
```

---

### `PATCH /api/records/:id`

Update an existing record.

Auth: admin only

#### Request Body

Any subset of the following fields may be provided:

| Field | Type | Notes |
| --- | --- | --- |
| `amount` | number | Must be greater than 0 |
| `type` | string | `income` or `expense` |
| `category` | string | Must be one of the supported categories |
| `date` | ISO date | Optional partial update |
| `description` | string | Max 300 characters |

#### Notes

- If the request body contains no valid fields, the API returns `400`.
- The updated record is populated with creator details.

---

### `DELETE /api/records/:id`

Soft-delete a record.

Auth: admin only

#### Notes

- The record is not removed from MongoDB.
- `isDeleted` is set to `true` and `deletedAt` is populated.
- Soft-deleted records are excluded from standard list and analytics queries.

## Dashboard

All dashboard endpoints require authentication.

### `GET /api/dashboard/summary`

Return top-level totals for income, expense, net balance, and record counts.

#### Query Parameters

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `dateFrom` | ISO date | none | Optional lower bound |
| `dateTo` | ISO date | none | Optional upper bound |

If both dates are provided, `dateFrom` must be less than or equal to `dateTo`.

#### Response

```json
{
  "success": true,
  "summary": {
    "totalIncome": 12000,
    "totalExpenses": 7500,
    "netBalance": 4500,
    "totalRecords": 24,
    "incomeCount": 12,
    "expenseCount": 12
  }
}
```

---

### `GET /api/dashboard/category-breakdown`

Return totals grouped by category.

#### Query Parameters

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `dateFrom` | ISO date | none | Optional lower bound |
| `dateTo` | ISO date | none | Optional upper bound |
| `type` | string | none | Optional `income` or `expense` filter |

If both dates are provided, `dateFrom` must be less than or equal to `dateTo`.

#### Response Shape

```json
{
  "success": true,
  "breakdown": [
    {
      "category": "salary",
      "entries": [
        {
          "type": "income",
          "total": 5000,
          "count": 1
        }
      ],
      "categoryTotal": 5000
    }
  ]
}
```

---

### `GET /api/dashboard/monthly-trend`

Return monthly income and expense totals for the last `N` months.

#### Query Parameters

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `months` | integer | `12` | Min `1`, max `24` |

#### Response Shape

```json
{
  "success": true,
  "months": 12,
  "trend": [
    {
      "year": 2026,
      "month": 4,
      "label": "2026-04",
      "data": [
        {
          "type": "income",
          "total": 5000,
          "count": 1
        }
      ]
    }
  ]
}
```

---

### `GET /api/dashboard/recent`

Return the most recent records.

#### Query Parameters

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `limit` | integer | `10` | Min `1`, max `50` |

#### Notes

- Returns records sorted by `date` descending.
- `createdBy` is populated with `name` and `email`.

---

### `GET /api/dashboard/weekly-trend`

Return daily totals for the last 7 days.

Auth: analyst or admin

#### Response Shape

```json
{
  "success": true,
  "trend": [
    {
      "date": "2026-04-03",
      "data": [
        {
          "type": "expense",
          "total": 1200,
          "count": 3
        }
      ]
    }
  ]
}
```

## Error Reference

| Scenario | Status | Example Message |
| --- | --- | --- |
| Validation failure | `400` | `Validation failed` |
| Invalid token | `401` | `Invalid token.` |
| Expired token | `401` | `Token expired. Please log in again.` |
| Missing token | `401` | `Access denied. No token provided.` |
| Permission denied | `403` | `Access denied. Required role(s): admin.` |
| Not found | `404` | `Record not found.` |
| Duplicate email | `409` | `Email already exists.` |

## Notes on Auth Semantics

- Anonymous registration always creates a `viewer` account.
- Admin-created users can be assigned any supported role through user-management routes.
- Records are shared across authenticated users; this API does not currently implement per-user record isolation.
