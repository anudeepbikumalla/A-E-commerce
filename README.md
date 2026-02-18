# A-E-commerce API

A role-based backend API for an e-commerce workflow built with Node.js, Express, MongoDB (Mongoose), and JWT authentication.

## Tech Stack
- Node.js (CommonJS)
- Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- Postman collection/environment for manual API testing

## Project Structure
- `server.js`: app bootstrap, middleware, route mounting, error handler, server start
- `config/dbConfig.js`: MongoDB connection
- `config/accessConfig.js`: alternative/central RBAC policy approach (kept intentionally for next phase)
- `routes/*.js`: endpoint declarations + middleware chaining
- `middleware/authMiddleware.js`: JWT verification and user hydration (`req.user`)
- `middleware/roleMiddleware.js`: role guard (`allowRoles(...)`)
- `controllers/*.js`: business logic and response shaping
- `models/*.js`: schema definitions and persistence contracts
- `A-E-commerce.postman_collection.json`: API test collection
- `A-E-commerce.postman_environment.json`: environment variables for Postman

## Architectural Approach
This project follows a layered and modular architecture:

1. Entry Layer: HTTP request enters Express app.
2. Routing Layer: route file maps URL + method to controller.
3. Security Layer: authentication middleware validates JWT, authorization middleware enforces role access.
4. Business Layer: controller handles use-case logic.
5. Data Layer: Mongoose model validates and persists data.
6. Response Layer: structured JSON response sent back to client.

This separation improves maintainability, testability, and security control.

## End-to-End Request Flow
Example for a protected route (`PUT /api/products/:id`):

1. Client sends request with `Authorization: Bearer <token>`.
2. `authMiddleware` verifies token and loads current user from DB.
3. `allowRoles('admin', 'manager')` checks whether role is permitted.
4. Controller (`updateProduct`) performs update and attaches metadata (`updatedBy`).
5. Mongoose enforces schema constraints and writes to MongoDB.
6. API returns a consistent success/failure JSON response.

## Development Strategy (How the code was built)
The codebase was developed in iterative layers:

1. Base setup:
- Initialized Express app and MongoDB connectivity.
- Added common middleware (`json`, `urlencoded`) and route aggregator.

2. Domain modeling:
- Created core entities: `User`, `Product`, `Order`.
- Added schema-level constraints (required fields, enums, min values).

3. Authentication and identity:
- Added user signup/login.
- Introduced password hashing via pre-save hook.
- Issued JWT on login.

4. Authorization (RBAC):
- Implemented `allowRoles(...)` middleware for route-level role guards.
- Applied role guards differently per resource operation.

5. Feature endpoints:
- Users: CRUD-like operations + password update flow.
- Products: public reads + restricted writes.
- Orders: create, retrieve, update, delete with owner/admin checks.

6. API testing workflow:
- Added Postman collection with role-specific login flows.
- Auto-captured tokens into environment variables (`token_user`, `token_admin`, `token_root`).
- Included positive and negative access test cases.

## RBAC Summary (Current Behavior)
Note: Current behavior is based on hardcoded `allowRoles(...)` usage in routes and controller-level ownership checks.

Users:
- `GET /api/users`: admin only
- `GET /api/users/:id`: authenticated user (current implementation)
- `PUT /api/users/:id`: owner or admin/root (controller check)
- `DELETE /api/users/:id`: admin or root

Products:
- Public read (`GET` list and by id)
- Create/Update: admin, manager
- Delete: admin

Orders:
- Route access: admin, manager, user
- Controller ownership constraints decide whether user can view/edit specific orders

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

## Postman Usage
1. Import `A-E-commerce.postman_collection.json`.
2. Import `A-E-commerce.postman_environment.json`.
3. Select environment.
4. Run login requests first to fill tokens.
5. Use protected endpoints with generated tokens.

## Design Decisions
- JWT chosen for stateless auth and simpler scaling.
- Route-level RBAC selected for explicit, readable access control near endpoints.
- Controllers keep business rules centralized and independent from routing concerns.
- Mongoose used for schema validation and query ergonomics.

## What Is Intentionally Kept for Next Iterations
- `config/accessConfig.js` is intentionally retained as a second RBAC approach (policy centralization).
- Development-only helper endpoint(s) can be gated/removed in production hardening phase.
- `models/tokens.js` is present for future token lifecycle features (revocation/blacklist/reset/invite workflows).

## Review Backlog (Your Next Pass: Items 2-7)
Planned follow-up review areas:

1. Access control refinement for profile-level data access.
2. RBAC consistency between routes/controllers/policy source.
3. Order schema timestamp strategy (`updatedAt` automation).
4. Dead code/utilities cleanup where truly unused.
5. Dependency hygiene (`devDependencies` vs `dependencies`).
6. Commented legacy block cleanup for maintainability.

## Suggested Next Improvements
1. Introduce request validation middleware (Joi/Zod/express-validator).
2. Add integration tests for auth + RBAC edge cases.
3. Add security middleware (`helmet`, rate-limiting, CORS policy tightening).
4. Standardize API error contract with central error utilities.
5. Add service layer if business logic grows beyond controller scope.

## Notes
This README documents both current implementation and the intended evolution path, so contributors understand what is production-ready today and what is staged for upcoming iterations.
