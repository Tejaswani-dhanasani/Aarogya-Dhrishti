# Sehat — Health for Every Village

A React/Vite frontend and Express/PostgreSQL backend for a village-focused health screening and referral workflow.

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

At startup the backend connects to PostgreSQL and creates or updates the application tables required by its API, including users, patients, consultations, clinical reports, prescriptions, and follow-ups. The database itself must already exist. Check the API at <http://localhost:5000/healthz>.

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
- Medical Officers, Specialists, Navigators, and District Admins can register through `/register/:role`. Clinical staff accounts stay pending until a District Admin approves them; District Admin accounts are active immediately after registration.
- Registration locations use the active district, mandal, and village lists: Health Workers select all three, Medical Officers select district and mandal, District Admins select only district, and Specialists/Navigators do not enter a location.
- Specialist and Navigator requests are visible to all District Admins for approval because those registration forms do not collect district information. Medical Officer requests remain scoped to the selected district.
- `/staff-management` lets Super Admins view District Admin accounts and lets District Admins review Medical Officer, Specialist, and Navigator approvals in their district. District Admins also see those approval statuses and actions on their dashboard.
- Medical Officers and Specialists can opt in or withdraw from public contact listing in their dashboard profile. The public Contact Us page shows only officials who opted in; their name, role, district, specialization, phone, and email are returned by `GET /api/contact/officials`. Contact details remain private by default.
- Each authenticated role gets its own dashboard workspace and role-specific navigation. Health Workers see only their own patients; Medical Officers can access patient records and the clinical-review screen; Specialists can access consultation; Navigators can access follow-up; District Administrators can access reports. Direct navigation to another role's screens returns the user to their own dashboard.
- **Automatic account IDs:** Every new account inserted without a supplied login code receives a globally generated `USR-000001`-style ID from PostgreSQL. Health Worker registration no longer asks the person to choose an ID. The success message displays the generated login ID and pre-fills it on the login page; the person should save it for future sign-in. Existing accounts keep their existing IDs. The sequence is initialized at backend startup above existing IDs and `USR-` codes.
- **Patient and clinical record IDs:** Patient records display an `AD-000001`-style ID based on the patient database ID. Clinical reports display `RPT-000001`; reports with medicine entries also display `RX-000001`. These display codes are generated from database IDs and do not replace the database keys.
- **Clinical reports and prescriptions:** Medical Officers and Specialists can create reports from the dashboard for patients in their district. Severity is explicitly selected by the clinician; the app does not diagnose, assess severity, or suggest medicines. For a report marked non-serious, the clinician may enter medicine name, dosage, frequency, duration, quantity, unit, and instructions. The API rejects medicine entries on a report marked serious. Reports and medicines are displayed in the patient's record for the owning Health Worker; clinician access is limited to the patient's district.
- Specialists can schedule consultations for patients in their district, save notes and outcomes, and join the unique, hard-to-guess video room. Navigators can record follow-up visits, set the next visit date, and review each patient's history in their district.
- `GET /api/patients` is restricted to Health Workers and Medical Officers. Health workers see only their own records; medical officers can access all records for clinical review. Other roles cannot retrieve patient records through this endpoint.
- Health workers add patients with consent and an optional photo using `POST /api/patients`. They can capture a live image using the browser camera or choose an existing image. OpenCV.js runs on-demand in the browser to check blur, image dimensions, and overall lighting; the image stays on the device for this check. It does not interpret images or detect disease, and no clinical AI provider is connected. Blurry images must be retaken; low resolution or lighting issues are warnings. These checks cannot verify oral-area framing or replace clinician review. Live capture requires camera permission and a secure context (localhost or HTTPS). Photos are limited to 5 MB and served from `/uploads`.
- Health workers can review possible duplicates before saving, edit their own patient records, and archive them without permanently deleting clinical history. If a create request fails because the network is unavailable, the form can queue the patient and photo in browser IndexedDB and sync them when a connection returns. Offline data is unencrypted on the device; use only on a protected, non-shared device and clear it after sync. Safe GET requests and idempotent patient-create requests retry transient network/server failures.
- Login and registration forms load their role/field definitions from `GET /api/auth/role-fields`. The backend enforces which roles can use the main and staff login/register endpoints.
- The main `/dashboard` shows live patient counts, records, and patient details. `/patients` in the Staff Portal also reads patient records from the API and is read-only.

## API endpoints

All API routes use the `/api` prefix. For protected endpoints, send the JWT returned by login in the `Authorization` header.

| Method | Endpoint | Access |
|---|---|---|
| `GET` | `/api/auth/role-fields` | Public |
| `POST` | `/api/auth/register`, `/api/auth/login` | Health workers |
| `POST` | `/api/auth/staff/register` | District Admin (immediately active), Medical Officer, Specialist, and Navigator (pending District Admin approval) |
| `POST` | `/api/auth/staff/login` | District Admin, Medical Officer, Specialist, or Navigator |
| `GET` | `/api/auth/me` | Authenticated users |
| `PATCH` | `/api/auth/contact-visibility` | Authenticated Medical Officers and Specialists; JSON `{ "public_contact": true }` or `false` |
| `GET` | `/api/patients` | Health Workers and Medical Officers |
| `GET` | `/api/patients/duplicates` | Health workers; check exact mobile/ABHA matches in their own active records |
| `POST` | `/api/patients` | Health workers; multipart form with patient details, optional `picture`, and idempotent `client_id` |
| `PUT` | `/api/patients/:id` | The owning Health Worker; update their patient details |
| `DELETE` | `/api/patients/:id` | The owning Health Worker; archive the patient record (soft delete) |
| `GET` | `/api/prescriptions/patients` | Medical Officers and Specialists; active patients in their district |
| `GET` | `/api/prescriptions/patients/:patientId` | The owning Health Worker or a Medical Officer/Specialist in the patient's district |
| `POST` | `/api/prescriptions/patients/:patientId` | Medical Officers and Specialists in the patient's district; save a clinician-authored report with medicine list and quantities |
| `GET` | `/api/consultations/join/:roomName` | Public; validates an active consultation link (the unguessable room name acts as the invitation) |
| `GET` | `/api/consultations/patients`, `/api/consultations` | Specialists; district patients and their consultations |
| `POST` | `/api/consultations` | Specialists; schedule a future consultation |
| `PATCH` | `/api/consultations/:id` | The assigned Specialist; update status and notes |
| `GET` | `/api/followups/patients` | Navigators; district patients and follow-up summary |
| `GET` | `/api/followups/patients/:patientId/history` | Navigators; follow-up history for a patient in their district |
| `POST` | `/api/followups/patients/:patientId` | Navigators; record a follow-up for a patient in their district |
| `GET` | `/api/admin/officials` | Super Admin (all officials) or District Admin (officials in their district) |
| `PATCH` | `/api/admin/officials/:id/approval` | Super Admin for District Admins; District Admin for Medical Officers, Specialists, and Navigators in their district |
| `GET` | `/api/contact/officials` | Public; opted-in Medical Officer and Specialist contact fields only |

### Clinical report request

`POST /api/prescriptions/patients/:patientId` accepts JSON like:

```json
{
  "severity": "NON_SERIOUS",
  "notes": "Clinician's assessment",
  "medicines": [
    {
      "name": "Medicine name",
      "dosage": "Clinician-entered dosage",
      "frequency": "Clinician-entered frequency",
      "duration": "Clinician-entered duration",
      "quantity": 10,
      "unit": "tablets",
      "instructions": "Optional instructions"
    }
  ]
}
```

`severity` must be `NON_SERIOUS` or `SERIOUS`. `medicines` is required and may contain up to 20 items; each item requires a name, dosage, frequency, duration, positive quantity, and quantity unit. A `SERIOUS` report must have an empty medicines list. The generated report and prescription codes are returned with the saved report. `GET /api/prescriptions/patients/:patientId` returns the report history, including medicine quantity and instructions, to the owning Health Worker or an in-district Medical Officer/Specialist.

## Routes and demo status

| Route | Purpose | Data |
|---|---|---|
| `/` | Landing page | Static content |
| `/login`, `/register` | Role-based login and Health Worker registration | Backend |
| `/dashboard` | Main health-worker/staff dashboard | Backend |
| `/portal` | Staff Portal landing page | Static content |
| `/register/:role` | Staff registration | Medical Officer, Specialist, Navigator, and District Admin self-registration |
| `/staff-management` | Admin account creation and approval management | District Admin; Super Admin for existing authenticated sessions |
| `/patients` | Staff patient records | Backend, read-only |
| `/medical-officer/review` | Medical Officer review | Role-restricted; demo records, not backed by API workflows |
| `/clinical-reports` | Clinician-authored reports and prescriptions | Medical Officer or Specialist; backend |
| `/specialist/consultation` | Specialist consultation scheduling, notes, and video calls | Backend |
| `/patient-consultation/:roomName` | Join a scheduled video consultation | Unguessable invitation link; anyone with the link can join |
| `/follow-up` | Navigator follow-up records and history | Backend |
| `/reports` | District Administrator reports | Role-restricted; coming soon |

Video calls currently use the public `meet.jit.si` service. Anyone with a consultation invitation link can join; do not include patient identifiers in links or display names, and do not use real patient information until the organization has approved the video provider and its privacy requirements.

The additional SQL files in `database/` describe a broader relational schema. They are not currently used by the Express API, which reads and writes the `app_users`, `app_patients`, `app_patient_followups`, and `app_consultations` tables; do not run those scripts expecting them to initialize the current API tables.

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
