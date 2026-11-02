import { Router } from 'express';
import express from "express";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { ROLES, profileKeys, validateRegistration } from '../roleFields.js';
import { SECRET, authRequired } from '../middleware/auth.js';

const router = express.Router();
const STAFF_LOGIN_ROLES = ['MEDICAL_OFFICER', 'SPECIALIST', 'NAVIGATOR', 'DISTRICT_ADMIN', 'SUPER_ADMIN'];
const publicUser = (u) => ({ id: u.id, role: u.role, user_code: u.user_code, name: u.name, mobile: u.mobile, email: u.email, profile: u.profile });

// Form definition for every role (drives the dynamic registration pages)
router.get('/role-fields', (_req, res) => res.json(ROLES));

// Registration. `allowed` = roles that may use this entry point.
const registerHandler = (allowed, wrongDoor) => async (req, res) => {
  const { role } = req.body;
  if (ROLES[role] && !allowed.includes(role)) return res.status(403).json({ error: wrongDoor });
  const error = validateRegistration(role, req.body);
  if (error) return res.status(400).json({ error });
  const b = req.body;
  const profile = Object.fromEntries(profileKeys(role).map((k) => [k, String(b[k]).trim()]));
  try {
    const hash = await bcrypt.hash(b.password, 10);
    const { rows } = await pool.query(
      `INSERT INTO app_users (role, user_code, name, mobile, email, password_hash, profile)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [role, b.user_code.trim(), b.name.trim(), b.mobile.trim(), b.email?.trim() || null, hash, profile]
    );
    res.status(201).json({ message: 'Registered successfully', user: publicUser(rows[0]) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: `${ROLES[role].idLabel} already registered` });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
};

// Login. Same rule: each role signs in through its own entry point.
const loginHandler = (allowed, wrongDoor) => async (req, res) => {
  const { role, user_code, password } = req.body;
  if (!ROLES[role] || !user_code || !password) return res.status(400).json({ error: 'Role, ID and password are required' });
  if (!allowed.includes(role)) return res.status(403).json({ error: wrongDoor });
  const { rows } = await pool.query('SELECT * FROM app_users WHERE role=$1 AND user_code=$2', [role, user_code.trim()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ error: 'Invalid ID or password' });
  const token = jwt.sign({ id: u.id, role: u.role, name: u.name }, SECRET, { expiresIn: '8h' });
  res.json({ token, user: publicUser(u) });
};

const HW_ONLY = ['HEALTH_WORKER'];
const STAFF_DOOR = 'This role must use the Staff Portal';
const HW_DOOR = 'Health workers cannot use the Staff Portal. Use the main page.';

// Main site: Health Workers only
router.post('/register', registerHandler(HW_ONLY, STAFF_DOOR));
router.post('/login', loginHandler(HW_ONLY, STAFF_DOOR));

// Officials receive accounts from their administrator and use this route only to sign in.
router.post('/staff/register', (_req, res) =>
  res.status(403).json({ error: 'Official accounts can only be created by an authorized administrator' })
);
router.post('/staff/login', loginHandler(STAFF_LOGIN_ROLES, HW_DOOR));

router.get('/me', authRequired, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM app_users WHERE id=$1', [req.user.id]);
  rows[0] ? res.json(publicUser(rows[0])) : res.status(404).json({ error: 'User not found' });
});

router.patch('/contact-visibility', authRequired, async (req, res) => {
  if (!['MEDICAL_OFFICER', 'SPECIALIST'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Public contact preferences are only available to Medical Officers and Specialists' });
  }
  if (typeof req.body?.public_contact !== 'boolean') {
    return res.status(400).json({ error: 'public_contact must be true or false' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE app_users
       SET profile = COALESCE(profile, '{}'::jsonb) || jsonb_build_object('public_contact', $2::boolean)
       WHERE id=$1 AND role=$3
       RETURNING *`,
      [req.user.id, req.body.public_contact, req.user.role],
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(publicUser(rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update public contact preference' });
  }
});


router.post("/super-admin-login", async (req, res) => {
  try {
    const { adminId, password } = req.body;

    const storedAdminId = process.env.SUPER_ADMIN_ID;
    const storedPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!adminId || !password) {
      return res.status(400).json({
        error: "Admin ID and password are required",
      });
    }

    if (
      adminId.trim() !== storedAdminId?.trim() ||
      password !== storedPassword
    ) {
      return res.status(401).json({
        error: "Invalid ID or password",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    const token = jwt.sign(
      {
        id: "super-admin",
        role: "SUPER_ADMIN",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    return res.status(200).json({
      message: "Super Admin login successful",
      token,
      user: {
        id: "super-admin",
        name: process.env.SUPER_ADMIN_NAME || "Super Admin",
        role: "SUPER_ADMIN",
      },
    });
  } catch (error) {
    console.error("Super Admin login error:", error.message);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
