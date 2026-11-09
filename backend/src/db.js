
import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function checkDatabase() {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        current_user AS username,
        inet_server_port() AS port
    `);

    console.log("Connected database details:");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Database check failed:", error.message);
  }
}

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


    ALTER TABLE public.app_patients
      ADD COLUMN IF NOT EXISTS abha_number TEXT,
      ADD COLUMN IF NOT EXISTS village TEXT;
  `);



  console.log("PostgreSQL connected and application tables are ready.");
}

export { pool };
export default pool;
