# Cosmopolitan Funeral Homes-Inc.
Monorepo: `apps/api` (Express + Mongoose + TS), `apps/web` (React + Vite + Tailwind).

## Run locally
1. `cp .env.example .env` and fill in `MONGODB_URI`, two 32+ char JWT secrets, seed admin credentials.
2. `npm install`
3. `export $(grep -v '^#' .env | xargs) && npm run seed`
4. `npm run dev:api` and `npm run dev:web`
Build: `npm run build`.

## Status (Phase 1 + slice of 2/3/4)
Done: env validation, Argon2id auth with refresh cookie + session revocation, central RBAC, branch-scoped queries,
audit log, branches CRUD, inquiry intake with reference numbers + rate limit + honeypot, inquiry status workflow,
dashboard (real aggregates), public branch search, contact form, Vercel SPA config.
Not yet built: services/products/packages, bookings, personnel, inventory/assets, reports, FAQ/CMS, uploads, email,
MapLibre map, admin UI, password reset, policy pages, tests, OpenAPI docs.
Tests have not been written or run.
