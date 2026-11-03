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
    CREATE TABLE IF NOT EXISTS app_users (
      id BIGSERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      user_code TEXT NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      profile JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (role, user_code)
    );

    CREATE TABLE IF NOT EXISTS app_patients (
      id BIGSERIAL PRIMARY KEY,
      health_worker_id BIGINT NOT NULL REFERENCES app_users(id),
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

    ALTER TABLE app_patients
      ADD COLUMN IF NOT EXISTS abha_number TEXT,
      ADD COLUMN IF NOT EXISTS village TEXT;
  `);

  console.log("PostgreSQL connected and application tables are ready.");
}

export { pool };
export default pool;