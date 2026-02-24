# Bikku's Store Backend API

A role-based e-commerce backend built with Node.js, Express, MongoDB (Mongoose), and JWT authentication.

## What This Project Solves
This API provides:
- user identity and role-based access control (RBAC)
- product catalog management with ownership controls
- order lifecycle management with stock-safe creation
- password management (self update + forgot/reset flow)

The design focuses on predictable authorization, secure credential handling, and clear request validation.

## Tech Stack
- Node.js (CommonJS)
- Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- Test runner (`node:test`)

## Project Structure
- `server.js`: app bootstrap and middleware wiring
- `config/dbConfig.js`: MongoDB connection
- `config/rolesConfig.js`: role rank + permissions
- `routes/*.js`: endpoint maps and middleware order
- `middleware/authMiddleware.js`: JWT verification and `req.user`
- `middleware/permissionMiddleware.js`: permission checks (`checkPermission`)
- `middleware/validateObjectId.js`: ObjectId route param validation
- `middleware/validateBody.js`: body validation by endpoint type
- `utils/rbac.js`: shared role/permission helper utilities
- `controllers/*.js`: business logic and policy enforcement
- `models/*.js`: persistence schemas
- `tests/rbac.integration.test.js`: integration smoke tests

## Architecture and Design Decisions

### 1. Layered Request Pipeline
Decision:
- enforce security and validation before controller logic.

Implementation:
1. Route match
2. Input validation middleware
3. Auth middleware
4. Permission middleware
5. Controller business logic
6. DB operations
7. JSON response

Why:
- keeps controller logic focused
- reduces duplicated validation checks
- fails fast on malformed/unauthorized requests

### 2. Dual Authorization Model (Route + Controller)
Decision:
- use route-level permission checks and controller-level ownership/rank checks.

Implementation:
- route: `checkPermission(...)`
- controller: ownership (`resource.createdBy`/`order.user`) + hierarchy checks using role rank

Why:
- route permissions guard broad access
- controller checks protect resource-level boundaries
- prevents accidental overexposure from route-only rules

### 3. Centralized RBAC Source
Decision:
- keep role definitions in one place.

Implementation:
- `config/rolesConfig.js` defines rank + permissions
- `utils/rbac.js` reads and evaluates role capabilities

Why:
- avoids role logic drift across files
- makes role updates easier and safer

### 4. Transactional Order Placement
Decision:
- place orders inside a DB transaction when stock is affected.

Implementation:
- start session
- atomically check/decrement stock
- create order with price snapshot
- commit/rollback transaction

Why:
- prevents overselling under concurrent requests
- keeps stock and order data consistent

### 5. Secure Password Handling
Decision:
- never store plain passwords, never expose passwords.

Implementation:
- `User` pre-save hook hashes password
- self password update requires `currentPassword`
- forgot/reset uses random token with hashed token storage + expiry

Why:
- protects credentials at rest
- lowers risk of account takeover
- supports one-time reset flow

## End-to-End Feature Flows

### Signup (`POST /api/users`)
1. Validate `name`, `email`, `password`
2. Check duplicate email
3. Create user with default role `user`
4. Password hash on save
5. Return user summary

### Login (`POST /api/users/login`)
1. Validate `email`, `password`
2. Find user by email
3. Compare password hash
4. Issue JWT (`id`, `role`)
5. Return token + user summary

### Protected Request Flow
1. `Authorization: Bearer <token>`
2. JWT verify + user load (`authMiddleware`)
3. Permission check (`checkPermission`)
4. Controller ownership/hierarchy checks
5. Business operation and response

### User Profile / Management
- `GET /api/users/:id`: owner or user-management/read role
- `PUT /api/users/:id`: hierarchy-aware update, controlled role assignment
- `DELETE /api/users/:id`: requester must outrank target (except root)

### Password Update (`POST /api/users/update-password/:id`)
- self: must provide correct `currentPassword`
- admin-level roles: can reset without current password
- new password is hashed via model hook

### Forgot Password (`POST /api/users/forgot-password`)
1. Validate email
2. Generate random reset token
3. Store only hashed token + expiry
4. Return success

### Reset Password (`POST /api/users/reset-password`)
1. Validate `token`, `newPassword`
2. Hash incoming token and verify non-expired token record
3. Update user password
4. Delete reset tokens for that user

Note:
- In this simple implementation, raw reset token is returned for testing. In production, deliver via email/SMS and do not return it in API response.

### Product Management
- Public read: `GET /products`, `GET /products/:id`
- Protected write: create/update/delete
- Controller enforces owner-or-elevated rule
- `createdBy` cannot be replaced by request payload

### Order Management
- `GET /orders`, `GET /orders/:id`: global roles see broader scope; others are owner-scoped
- `POST /orders`: transactional order placement and stock decrement
- `PUT /orders/:id`: `manage_orders` only
- `PUT /orders/:id/status`: validated status, delivery role limited to `delivered`
- `DELETE /orders/:id`: management roles or owner fallback policy

## RBAC Matrix (Core)

| Role | read_users | manage_users | assign_roles | manage_products | manage_orders | update_order_status |
|---|---:|---:|---:|---:|---:|---:|
| `user` | No | No | No | No | No | No |
| `support` | Yes | No | No | No | No | No |
| `delivery` | No | No | No | No | No | Yes |
| `vendor` | No | No | No | Own only via controller checks | No | No |
| `manager` | No | No | Yes | Yes | Yes | No |
| `admin` | Yes | Yes | Yes | Yes | Yes | No |
| `superuser` | Yes | Yes | Yes | Yes | Yes | No |
| `root` | Yes (all) | Yes (all) | Yes (all) | Yes (all) | Yes (all) | Yes (all) |

## Validation and Error Handling

### Input Validation
- `validateObjectId`: validates route IDs
- `validateBody`: validates payload shape and required fields

### Error Contract
Typical error response:
```json
{
  "success": false,
  "message": "Readable error message"
}
```

Common status codes:
- `400` invalid input
- `401` authentication failure
- `403` permission/ownership/hierarchy denied
- `404` resource not found
- `409` business conflict (for example insufficient stock)
- `500` unhandled server error

## Testing Strategy

### Commands
```bash
npm test
npm run test:rbac
```

### Current Coverage (Integration Smoke)
- owner vs non-owner user profile access
- role-based order list access
- delivery-specific status constraints
- product ownership mutation restrictions
- password update guardrails
- forgot/reset password flow

## API Base URL
- `http://localhost:3000/api`

## Environment Variables
Create `.env`:

```env
PORT=3000
MONGO_URI=<your_mongodb_connection_string>
JWT_SECRET=<strong_secret>
JWT_EXPIRES_IN=1d
```

## Run Locally
```bash
npm install
npm start
```

## Production Notes
- Do not return reset tokens in forgot-password responses.
- Integrate email/SMS provider for reset delivery.
- Add rate limiting on auth endpoints.
- Add audit logging for admin-level actions.

## Known Limitations
- No external notification integration yet for reset flow.
- No token/session revocation flow yet.
- Tests are smoke-level, not full endpoint matrix.

## Postman
- Collection: `Bikku-Store-Backend.postman_collection.json`
- Environment: `Bikku-Store-Backend.postman_environment.json`
