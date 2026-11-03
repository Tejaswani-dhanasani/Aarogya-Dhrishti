<<<<<<< HEAD
# Aarogya Drishti

A React/Vite frontend and Express/PostgreSQL backend for an oral-health screening workflow.

## Requirements

- Node.js 18 or newer and npm
- PostgreSQL

## Run locally (Windows)

### 1. Create the PostgreSQL database

Create the database named in `backend/.env` (the example uses `aarogya_drishti`):

```powershell
createdb aarogya_drishti
```

Alternatively, create a database with that name using pgAdmin or another PostgreSQL client.

### 2. Configure and start the backend

```powershell
cd backend
copy .env.example .env
```

Edit `backend/.env` and set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` for your PostgreSQL instance. Replace `JWT_SECRET` with a long, unique random value. `CORS_ORIGIN` should match the frontend's origin; the default Vite URL is `http://localhost:5173`.

Then run:

```powershell
npm install
npm start
```

At startup the backend connects to PostgreSQL and creates or updates the `app_users` and `app_patients` tables required by its API. The database itself must already exist. Check the API at <http://localhost:5000/healthz>.

### 3. Configure and start the frontend

In a second terminal:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open <http://localhost:5173>. `VITE_API_URL` in `frontend/.env` should be the backend origin, without `/api` (default: `http://localhost:5000`). If Vite selects another port, update `CORS_ORIGIN` in `backend/.env` to that exact origin and restart the backend.

## Connected workflows

- Health workers register/login from `/register` and `/login`.
- Officials do not self-register. They select their role from the login page and sign in using the account created for them. `/login/:role` links preselect a role in the same login form.
- District Admins create Medical Officer, Specialist, and Navigator accounts from `/staff-management`; a District Admin can only create officials assigned to their own district.
- Medical Officers and Specialists can opt in or withdraw from public contact listing in their dashboard profile. The public Contact Us page shows only officials who opted in; their name, role, district, specialization, phone, and email are returned by `GET /api/contact/officials`. Contact details remain private by default.
- Each authenticated role gets its own dashboard workspace and role-specific navigation. Health Workers see only their own patients; Medical Officers can access patient records and the clinical-review screen; Specialists can access consultation; Navigators can access follow-up; District Administrators can access reports. Direct navigation to another role's screens returns the user to their own dashboard.
- `GET /api/patients` is restricted to Health Workers and Medical Officers. Health workers see only their own records; medical officers can access all records for clinical review. Other roles cannot retrieve patient records through this endpoint.
- Health workers add patients with consent and an optional photo using `POST /api/patients`. They can capture a live image using the browser camera or choose an existing image. The browser checks focus, lighting, contrast, and resolution locally and asks the user to retake or replace images that fail; the image is not sent to an AI service for this check. This heuristic cannot verify oral-area framing or detect disease. Live capture requires camera permission and a secure context (localhost or HTTPS). Photos are limited to 5 MB and served from `/uploads`.
- Login and registration forms load their role/field definitions from `GET /api/auth/role-fields`. The backend enforces which roles can use the main and staff login/register endpoints.
- The main `/dashboard` shows live patient counts, records, and patient details. `/patients` in the Staff Portal also reads patient records from the API and is read-only.

## API endpoints

All API routes use the `/api` prefix. For protected endpoints, send the JWT returned by login in the `Authorization` header.

| Method | Endpoint | Access |
|---|---|---|
| `GET` | `/api/auth/role-fields` | Public |
| `POST` | `/api/auth/register`, `/api/auth/login` | Health workers |
| `POST` | `/api/auth/staff/register` | Disabled; returns `403` because officials are provisioned by administrators |
| `POST` | `/api/auth/staff/login` | District Admin, Medical Officer, Specialist, or Navigator |
| `GET` | `/api/auth/me` | Authenticated users |
| `PATCH` | `/api/auth/contact-visibility` | Authenticated Medical Officers and Specialists; JSON `{ "public_contact": true }` or `false` |
| `GET` | `/api/patients` | Health Workers and Medical Officers |
| `POST` | `/api/patients` | Health workers; multipart form with patient details and optional `picture` |
| `GET` | `/api/admin/officials` | Super Admin (all officials) or District Admin (officials in their district) |
| `POST` | `/api/admin/officials` | Super Admin creates District Admins; District Admin creates Medical Officers, Specialists, and Navigators in their district |
| `GET` | `/api/contact/officials` | Public; opted-in Medical Officer and Specialist contact fields only |

## Routes and demo status

| Route | Purpose | Data |
|---|---|---|
| `/` | Landing page | Static content |
| `/login`, `/register` | Role-based login and Health Worker registration | Backend |
| `/dashboard` | Main health-worker/staff dashboard | Backend |
| `/portal` | Staff Portal landing page | Static content |
| `/register/:role` | Explains that officials must be provisioned by an administrator | No self-registration |
| `/staff-management` | Admin account provisioning | District Admin; Super Admin for existing authenticated sessions |
| `/patients` | Staff patient records | Backend, read-only |
| `/medical-officer/review` | Medical Officer review | Role-restricted; demo records, not backed by API workflows |
| `/specialist/consultation` | Specialist consultation | Role-restricted; demo referrals, not backed by API workflows |
| `/follow-up` | Navigator follow-up | Role-restricted; coming soon |
| `/reports` | District Administrator reports | Role-restricted; coming soon |

The additional SQL files in `database/` describe a broader relational schema. They are not currently used by the Express API, which reads and writes `app_users` and `app_patients`; do not run those scripts expecting them to initialize the current API tables.

## Project reference

- `backend/src/roleFields.js`: registration fields and role definitions
- `backend/src/routes/`: API routes
- `frontend/src/api.js`: frontend API client and bearer-token handling
- `frontend/src/utils.js`: indicative screening-priority rules (not a diagnosis)
- `frontend/src/lang.jsx`: English/Telugu language strings
- `frontend/src/siteConfig.js`: contact information
- `frontend/src/portal/`: Staff Portal screens and styles

## Data and deployment warning

This application is a prototype. Use synthetic data for local development. Do not store real patient information until authentication, authorization, privacy, consent, retention, and deployment security have been reviewed for the intended environment.
=======
# Aarogya-Dhrishti
AAROGYA DRISHTI is a Progressive Web App designed to improve access to oral cancer screening and healthcare in tribal communities. It supports patient registration, AI-assisted screening, doctor review, teleconsultation, referrals, and follow-up tracking, connecting patients with healthcare services while supporting timely clinical assessment.
>>>>>>> c961c3796d37020a431c49a1cec56280f8086c2a
