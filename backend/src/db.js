
import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(currentDirectory, "../.env"),
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.app_users (
      id BIGSERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      user_code TEXT NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      profile JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      approval_status TEXT NOT NULL DEFAULT 'APPROVED',
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      rejection_reason TEXT,
      account_status TEXT NOT NULL DEFAULT 'ACTIVE',

      UNIQUE (role, user_code)
    );

    -- Approval columns for existing installations
    ALTER TABLE public.app_users
      ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED',
      ADD COLUMN IF NOT EXISTS approved_by TEXT,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
      ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'ACTIVE';

    -- Keep approver ID compatible with the Super Admin ID
    ALTER TABLE public.app_users
      ALTER COLUMN approved_by TYPE TEXT
      USING approved_by::TEXT;

    CREATE SEQUENCE IF NOT EXISTS public.app_user_code_seq;
    SELECT setval(
      'public.app_user_code_seq',
      GREATEST(
        1,
        (SELECT COALESCE(MAX(id), 0) FROM public.app_users),
        (SELECT COALESCE(MAX(substring(user_code FROM 5)::BIGINT), 0)
         FROM public.app_users WHERE user_code ~ '^USR-[0-9]{1,18}$'),
        (SELECT last_value - CASE WHEN is_called THEN 0 ELSE 1 END
         FROM public.app_user_code_seq)
      ),
      GREATEST(
        (SELECT COALESCE(MAX(id), 0) FROM public.app_users),
        (SELECT COALESCE(MAX(substring(user_code FROM 5)::BIGINT), 0)
         FROM public.app_users WHERE user_code ~ '^USR-[0-9]{1,18}$'),
        (SELECT last_value - CASE WHEN is_called THEN 0 ELSE 1 END
         FROM public.app_user_code_seq)
      ) > 0
    );
    CREATE OR REPLACE FUNCTION public.generate_app_user_code()
    RETURNS TEXT
    LANGUAGE plpgsql
    AS $user_code$
    DECLARE
      generated_id BIGINT;
    BEGIN
      generated_id := nextval('public.app_user_code_seq');
      RETURN 'USR-' || LPAD(
        generated_id::TEXT,
        GREATEST(6, LENGTH(generated_id::TEXT)),
        '0'
      );
    END;
    $user_code$;
    ALTER TABLE public.app_users
      ALTER COLUMN user_code SET DEFAULT
        public.generate_app_user_code();

    CREATE TABLE IF NOT EXISTS public.app_patients (
      id BIGSERIAL PRIMARY KEY,
      health_worker_id BIGINT NOT NULL REFERENCES public.app_users(id),
      name TEXT NOT NULL,
      age SMALLINT NOT NULL CHECK (age BETWEEN 1 AND 120),
      gender TEXT NOT NULL,
      mobile TEXT NOT NULL,
      blood_group TEXT,
      symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
      previous_health TEXT,
      medications TEXT,
      tobacco TEXT NOT NULL DEFAULT 'None',
      habits JSONB NOT NULL DEFAULT '[]'::jsonb,
      picture_path TEXT,
      consent BOOLEAN NOT NULL DEFAULT FALSE,
      abha_number TEXT,
      village TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.app_patient_followups (
    id BIGSERIAL PRIMARY KEY,

    patient_id BIGINT NOT NULL
        REFERENCES public.app_patients(id)
        ON DELETE CASCADE,

    navigator_id BIGINT NOT NULL
        REFERENCES public.app_users(id),

    followup_date DATE NOT NULL DEFAULT CURRENT_DATE,

    health_status TEXT NOT NULL,

    remarks TEXT,

    next_followup_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_patient_followups_patient
  ON public.app_patient_followups(patient_id);

  CREATE INDEX IF NOT EXISTS idx_patient_followups_navigator
  ON public.app_patient_followups(navigator_id);

  CREATE TABLE IF NOT EXISTS public.app_consultations (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL
      REFERENCES public.app_patients(id) ON DELETE CASCADE,
    specialist_id BIGINT NOT NULL
      REFERENCES public.app_users(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    room_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'SCHEDULED'
      CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
    specialist_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_app_consultations_specialist
    ON public.app_consultations(specialist_id, scheduled_at);

  CREATE TABLE IF NOT EXISTS public.app_clinical_reports (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL
      REFERENCES public.app_patients(id) ON DELETE CASCADE,
    clinician_id BIGINT NOT NULL
      REFERENCES public.app_users(id),
    severity TEXT NOT NULL CHECK (severity IN ('NON_SERIOUS', 'SERIOUS')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_app_clinical_reports_patient
    ON public.app_clinical_reports(patient_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS public.app_clinical_report_medicines (
    id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL
      REFERENCES public.app_clinical_reports(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    quantity_unit TEXT NOT NULL,
    instructions TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_app_clinical_report_medicines_report
    ON public.app_clinical_report_medicines(report_id);

  ALTER TABLE public.app_patients
      ADD COLUMN IF NOT EXISTS abha_number TEXT,
    ADD COLUMN IF NOT EXISTS village TEXT,
    ADD COLUMN IF NOT EXISTS client_id UUID,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  CREATE UNIQUE INDEX IF NOT EXISTS idx_app_patients_client_id
    ON public.app_patients(client_id)
    WHERE client_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_app_patients_health_worker_active
    ON public.app_patients(health_worker_id, created_at DESC)
    WHERE deleted_at IS NULL;
  `);



  console.log("PostgreSQL connected and application tables are ready.");
}

export { pool };
export default pool;
