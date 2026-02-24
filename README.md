# A-E-commerce API

A backend API for e-commerce workflows built with Node.js, Express, MongoDB, and JWT auth.

## Tech Stack
- Node.js (CommonJS)
- Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- Node test runner (`node:test`)

## Project Structure
- `server.js`: app bootstrap, middleware, route mounting, error handler, server start
- `config/dbConfig.js`: MongoDB connection
- `config/rolesConfig.js`: role hierarchy with rank + permissions
- `routes/*.js`: endpoint declarations and middleware chaining
- `middleware/authMiddleware.js`: JWT verification and user hydration (`req.user`)
- `middleware/permissionMiddleware.js`: permission guard (`checkPermission(...)`)
- `middleware/validateObjectId.js`: ObjectId validation for route params
- `middleware/validateBody.js`: request body validation for auth/user/product/order endpoints
- `utils/rbac.js`: shared role rank + permission helpers
- `controllers/*.js`: business logic
- `models/*.js`: schema definitions
- `tests/rbac.integration.test.js`: integration smoke test for RBAC/auth/order flows

## Architecture (High Level)
The API uses a layered flow:

1. Request enters Express app.
2. Route matches endpoint.
3. Middleware stack runs:
   - input validation
   - authentication
   - authorization
4. Controller executes business logic.
5. Model layer validates/persists data.
6. API returns JSON response.

## End-to-End Feature Flows

### 1. Signup and Login

Signup (`POST /api/users`):
1. Request body is validated (`name`, `email`, `password`).
2. Controller checks if user already exists.
3. User is created with default role `user`.
4. Password is hashed by `User` model pre-save hook.
5. API returns created user (without password).

Login (`POST /api/users/login`):
1. Request body is validated (`email`, `password`).
2. Controller finds user by email.
3. Password is compared with hashed password.
4. JWT is generated with `{ id, role }`.
5. API returns token + basic user info.

### 2. Authentication (Protected Routes)

For protected routes:
1. `authMiddleware` checks `Authorization: Bearer <token>`.
2. JWT is verified with `JWT_SECRET`.
3. User is loaded from DB and attached to `req.user`.
4. If token/user invalid, request is rejected with `401`.

### 3. Authorization (RBAC)

Authorization uses permissions from `rolesConfig`:
1. Route applies `checkPermission('permA', 'permB', ...)`.
2. Middleware loads role config from `utils/rbac`.
3. Access is granted if role has any required permission.
4. `root` has `all` permission and bypasses checks.
5. Controllers also enforce resource-level rules (ownership/hierarchy).

### 4. User Profile and User Management

Get profile (`GET /api/users/:id`):
1. Auth + permission middleware runs.
2. Controller allows:
   - owner access, or
   - roles with `read_users/manage_users`.
3. Password is excluded from response.

Update user (`PUT /api/users/:id`):
1. Body and ObjectId are validated.
2. Controller applies hierarchy checks by role rank.
3. Role assignment allowed only for roles with `assign_roles`.
4. Self role-change is blocked.
5. Password updates are blocked in this endpoint.

Delete user (`DELETE /api/users/:id`):
1. Auth + permission + ObjectId validation.
2. Controller checks requester rank > target rank (except root).
3. Target user is deleted if authorized.

### 5. Password Update (Authenticated User/Admin)

Endpoint: `POST /api/users/update-password/:id`

1. Body is validated (`newPassword`; `currentPassword` required for self-change).
2. Controller allows:
   - self update, or
   - admin/superuser/root reset.
3. For self update, current password must match.
4. New password is saved and hashed by model hook.

### 6. Forgot/Reset Password (Public Flow)

Forgot password (`POST /api/users/forgot-password`):
1. Body is validated (`email`).
2. If account exists, system generates random reset token.
3. Only hashed token is stored in `tokens` collection with expiry.
4. Existing reset tokens for that user are cleared.
5. API returns success.

Reset password (`POST /api/users/reset-password`):
1. Body is validated (`token`, `newPassword`).
2. Incoming token is hashed and matched against non-expired stored token.
3. Matching user password is updated (hashed on save).
4. User reset tokens are deleted (one-time use).
5. User can now login with new password.

Note: In this simple setup, reset token is returned in API response for testing. In production, send token via email/SMS and do not return it in API response.

### 7. Product Management

Public reads:
- `GET /api/products`
- `GET /api/products/:id`

Protected writes:
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

Write flow:
1. Body/ObjectId validation.
2. Auth + permission check.
3. Controller enforces ownership or elevated permission.
4. `createdBy` cannot be overwritten in update.
5. `updatedBy` is set from logged-in user.

### 8. Order Management

List/get orders:
- `GET /api/orders`
- `GET /api/orders/:id`

Behavior:
1. Auth + permission check.
2. Controller returns all orders for roles with global read/manage permissions.
3. Other users can access only their own orders.

Create order (`POST /api/orders`):
1. Body validation (`products`, `shippingAddress`).
2. Transaction starts.
3. Product stock is checked and decremented atomically.
4. Order total is calculated from DB prices.
5. Order is created and transaction commits.
6. If stock is insufficient, request fails with conflict.

Update order (`PUT /api/orders/:id`):
- Allowed only for roles with `manage_orders`.

Update order status (`PUT /api/orders/:id/status`):
1. Status value is validated.
2. Delivery role can set only `delivered`.
3. Status field is updated.

Delete order (`DELETE /api/orders/:id`):
- Allowed for `manage_orders` roles, or owner fallback where applicable.

### 9. Validation Layer

Validation middleware protects routes before business logic:
- `validateObjectId`: checks route params like `:id`.
- `validateBody`: checks required fields/types for auth/user/product/order requests.

This reduces controller complexity and returns early `400` on invalid input.

## API Base URL
- `http://localhost:3000/api`

## Environment Variables
Create a `.env` file:

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

## Testing
Run all tests:
```bash
npm test
```

Run RBAC integration smoke test only:
```bash
npm run test:rbac
```

Current integration test covers:
- owner vs non-owner profile access
- role-based order access
- delivery status restrictions
- product ownership restrictions
- password change guardrails
- forgot/reset password flow

## Security Notes
- Passwords are always stored as hashes.
- API never has a "find password" endpoint.
- Reset tokens are stored as hashes with expiry.
- RBAC is permission-based and centralized.

## Production Notes
- Do not return `resetToken` in `forgot-password` response in production.
- Deliver reset links/tokens through email or SMS provider.
- Add rate limiting for login, forgot-password, and reset-password endpoints.
- Add audit logging for role changes, password resets, and user deletion actions.

## Known Limitations
- External email/SMS delivery is not integrated yet for password reset.
- Token/session revocation flow is not implemented yet (future enhancement).
- Current integration tests are smoke-level, not a full endpoint matrix.

## Postman
- Collection: `A-E-commerce.postman_collection.json`
- Environment: `A-E-commerce.postman_environment.json`
