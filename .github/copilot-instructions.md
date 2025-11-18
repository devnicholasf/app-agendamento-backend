# Copilot instructions for contributors and AI agents

Purpose: quickly orient AI coding agents to the backend's architecture, common workflows, integration points, and concrete examples so they can be productive immediately.

**Big Picture**:
- **Stack**: Node.js + Express backend using Firebase Admin SDK and Firestore as primary datastore (`firebase-admin`, `firestore`).
- **Responsibility**: This repo implements a REST API that serves the frontend (React app) and manages core domain data: companies, professionals, services, appointments, users and notifications.
- **Routing pattern**: All API routes live under `routes/` and are mounted in `server.js` at `/api/<resource>` (e.g. `/api/appointments`, `/api/users`).

**Key files & directories**:
- `server.js`: app entrypoint, Firebase admin initialization, route mounting, CORS handling and `PORT` selection.
- `firebase.js` and `setupFirestore.js`: Firebase Admin initialization and seed script used to create sample data for local testing.
- `serviceAccountKey.template.json` and `serviceAccountKey.json` (not committed): service account credential template and local secret. Prefer `SERVICE_ACCOUNT_JSON` env var in CI/production.
- `routes/*.js`: route handlers. Example: `routes/appointments.js` contains availability calculation and booking logic.
- `routes/verifyToken.js`: verifies Firebase ID tokens via `admin.auth().verifyIdToken(idToken)` — used as middleware on protected endpoints.

**Auth & Secrets (important)**:
- The backend expects Firebase Admin credentials in one of three ways (in order):
  - `SERVICE_ACCOUNT_JSON` env var (a JSON string) — preferred for CI.
  - `serviceAccountKey.json` file present at repo root (local dev only).
  - Default application credentials (e.g. `GOOGLE_APPLICATION_CREDENTIALS`) if neither above exists.
- Protected endpoints require an Authorization header: `Authorization: Bearer <idToken>`; `verifyToken.js` decodes the token and attaches `req.user`.

**Firestore & Data flow specifics**:
- Collections used (search in `routes/`): `appointments`, `users`, `companies`, `notifications`, and per-company `services` (subcollections in `companies/<companyId>/services`).
- Appointment creation does server-side conflict checks: it queries `appointments` for same `professionalId`, `date`, `time` to avoid double-booking (see `routes/appointments.js`).
- Notifications are simple Firestore documents added to `notifications` collection when important events occur (create appointment, status changes).

**Developer workflows / commands**:
- Install dependencies (backend folder):
  - `npm install`
- Start development server with automatic restart:
  - `npm run dev` (uses `nodemon server.js`)
- Start production-style server:
  - `npm start` (runs `node server.js`)
- Seed local Firestore with example data:
  - `node setupFirestore.js` (reads `serviceAccountKey.json`; ensure credentials available)

**Environment variables commonly used**:
- `PORT` — server port (default `5000`).
- `SERVICE_ACCOUNT_JSON` — service account as JSON string (preferred for CI).
- `GOOGLE_APPLICATION_CREDENTIALS` — path to service account JSON (alternative).
- `CORS_ORIGIN` — comma-separated origins for `cors()` middleware.

**Examples (concrete)**:
- Start dev server and load seed data (PowerShell):
  - `npm run dev`
  - In another shell: `node setupFirestore.js` (requires `serviceAccountKey.json` or valid env var)
- Example booking request (client must send Firebase ID token):
  - Header: `Authorization: Bearer <idToken>`
  - POST `/api/appointments` body: `{ "companyId": "<id>", "serviceId": "<id>", "professionalId": "<uid>", "date": "2025-11-20", "time": "15:00" }`
- Availability lookup example (no auth required):
  - GET `/api/appointments/available?companyId=<id>&professionalId=<uid>&date=YYYY-MM-DD`

**Frontend integration notes**:
- The frontend lives in a sibling workspace `app-agendamento-frontend`. It uses Firebase Web SDK (`src/firebaseConfig.js`) for auth and Firestore client SDK. Typical flow: frontend obtains ID token from `auth.currentUser.getIdToken()` and forwards it in `Authorization` header to the endpoints above.

**Common patterns and pitfalls**:
- Do not rely on client-provided `userId` when creating appointments; backend uses `req.user.uid` from the verified token.
- When adding or changing fields in Firestore documents, prefer server timestamps: `admin.firestore.FieldValue.serverTimestamp()` (used in `routes/appointments.js`).
- Tests and lint are not present in this repo — changes should be verified manually against the running dev server and with `setupFirestore.js` for seed data.

If any of the above is unclear or you want additional examples (e.g., a sample curl script for auth + booking, or a CONTRIBUTING.md with commit/test hooks), tell me which area to expand and I will iterate.