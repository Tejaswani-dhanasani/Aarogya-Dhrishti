import bcrypt from "bcrypt";
import pool from "./db.js";

async function createSuperAdmin() {
  try {
    const userCode = "SUPER001";
    const name = process.env.SUPER_ADMIN_NAME;
    const mobile = process.env.SUPER_ADMIN_MOBILE;
    const email = process.env.SUPER_ADMIN_EMAIL || null;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!name || !mobile || !password) {
      throw new Error("Super Admin details are missing.");
    }

    if (password.length < 12) {
      throw new Error("Password must contain at least 12 characters.");
    }

    const existing = await pool.query(
      `SELECT id FROM public.app_users
       WHERE role = 'SUPER_ADMIN' AND user_code = $1`,
      [userCode]
    );

    if (existing.rowCount > 0) {
      console.log("SUPER_ADMIN account already exists. No changes made.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO public.app_users
       (role, user_code, name, mobile, email, password_hash,
        approval_status, approved_by, approved_at, account_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED', NULL, NOW(), 'ACTIVE')`,
      [
        "SUPER_ADMIN",
        userCode,
        name,
        mobile,
        email,
        passwordHash
      ]
    );

    console.log("Super Admin account created successfully.");
    console.log("User ID:", userCode);
    console.log("Role: SUPER_ADMIN");
    console.log("Approval: APPROVED");
    console.log("Account: ACTIVE");

  } catch (error) {
    console.error("Super Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createSuperAdmin();