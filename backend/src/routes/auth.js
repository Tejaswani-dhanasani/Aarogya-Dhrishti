
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { ROLES, profileKeys, validateRegistration } from '../roleFields.js';
import { SECRET, authRequired } from '../middleware/auth.js';

const router = express.Router();

const publicUser = (u) => ({
  id: u.id,
  role: u.role,
  user_code: u.user_code,
  name: u.name,
  mobile: u.mobile,
  email: u.email,
  profile: u.profile
});

const HW_ONLY = ['HEALTH_WORKER'];

const STAFF_LOGIN_ROLES = [
  'MEDICAL_OFFICER',
  'SPECIALIST',
  'NAVIGATOR',
  'DISTRICT_ADMIN',
  'SUPER_ADMIN'
];

const STAFF_SELF_REGISTER_ROLES = [
  'DISTRICT_ADMIN',
  'MEDICAL_OFFICER',
  'SPECIALIST',
  'NAVIGATOR'
];

const STAFF_DOOR = 'This role must use the Staff Portal';
const HW_DOOR = 'Health workers cannot use the Staff Portal. Use the main page.';

// Role fields
router.get('/role-fields', (_req, res) => {
  res.json(ROLES);
});

// Registration handler
const registerHandler = (allowed, wrongDoor) => async (req, res) => {
  const { role } = req.body;

  if (ROLES[role] && !allowed.includes(role)) {
    return res.status(403).json({ error: wrongDoor });
  }

  const error = validateRegistration(role, req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const body = req.body;

  const profile = Object.fromEntries(
    profileKeys(role).map((key) => [
      key,
      String(body[key]).trim()
    ])
  );

  try {
    const passwordHash = await bcrypt.hash(body.password, 10);

    const { rows } = await pool.query(
      `INSERT INTO app_users
       (role, user_code, name, mobile, email, password_hash, profile)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        role,
        body.user_code.trim(),
        body.name.trim(),
        body.mobile.trim(),
        body.email?.trim() || null,
        passwordHash,
        profile
      ]
    );

    return res.status(201).json({
      message: 'Registered successfully',
      user: publicUser(rows[0])
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: `${ROLES[role].idLabel} already registered`
      });
    }

    console.error(error);

    return res.status(500).json({
      error: 'Server error'
    });
  }
};

// Common account verification
const completeLogin = async (user, password, res) => {
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({
      error: 'Invalid ID or password'
    });
  }

  if (
  user.role !== 'SUPER_ADMIN' &&
  user.approval_status === 'PENDING'
)

  if (user.approval_status === 'REJECTED') {
    return res.status(403).json({
      error: user.rejection_reason
        ? `Your registration was rejected: ${user.rejection_reason}`
        : 'Your registration has been rejected.'
    });
  }

  if (user.account_status !== 'ACTIVE') {
    return res.status(403).json({
      error: 'Your account is suspended. Contact your administrator.'
    });
  }

  if (user.approval_status !== 'APPROVED') {
    return res.status(403).json({
      error: 'Your account is not approved.'
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name
    },
    SECRET,
    { expiresIn: '8h' }
  );

  return res.json({
    token,
    user: publicUser(user)
  });
};

// Existing role-specific login handler
const loginHandler = (allowed, wrongDoor) => async (req, res) => {
  try {
    const { role, user_code, password } = req.body || {};

    if (!ROLES[role] || !user_code || !password) {
      return res.status(400).json({
        error: 'Role, ID and password are required'
      });
    }

    if (!allowed.includes(role)) {
      return res.status(403).json({
        error: wrongDoor
      });
    }

    const { rows } = await pool.query(
      `SELECT * FROM public.app_users
       WHERE role = $1 AND user_code = $2`,
      [role, user_code.trim()]
    );

    return await completeLogin(rows[0], password, res);

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      error: 'Login failed due to server error'
    });
  }
};

// NEW: Common login for all roles
// SUPER_ADMIN does not need to appear in the frontend dropdown.
const unifiedLoginHandler = async (req, res) => {
  try {
    const { role, user_code, password } = req.body || {};

    if (
      !role ||
      !ROLES[role] ||
      role === 'SUPER_ADMIN' ||
      !user_code ||
      !password
    ) {
      return res.status(400).json({
        error: 'Valid role, ID and password are required'
      });
    }

    const { rows } = await pool.query(
      `SELECT * FROM public.app_users
       WHERE user_code = $1
       AND role IN ($2, 'SUPER_ADMIN')
       ORDER BY CASE WHEN role = $2 THEN 0 ELSE 1 END`,
      [user_code.trim(), role]
    );

    // Check the selected role first, then SUPER_ADMIN.
    let authenticatedUser = null;

    for (const user of rows) {
      if (await bcrypt.compare(password, user.password_hash)) {
        authenticatedUser = user;
        break;
      }
    }

    if (!authenticatedUser) {
      return res.status(401).json({
        error: 'Invalid ID or password'
      });
    }

    // The actual role always comes from the database.
    return await completeLogin(authenticatedUser, password, res);

  } catch (error) {
    console.error('Unified login error:', error);

    return res.status(500).json({
      error: 'Login failed due to server error'
    });
  }
};

// Main site: Health Workers
router.post('/register', registerHandler(HW_ONLY, STAFF_DOOR));
router.post('/login', loginHandler(HW_ONLY, STAFF_DOOR));

// Common login endpoint
router.post('/unified-login', unifiedLoginHandler);

// Staff registration
router.post('/staff/register', async (req, res) => {
  const body = req.body || {};
  const { role } = body;

  if (!STAFF_SELF_REGISTER_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'This role is not allowed to self-register'
    });
  }

  const validationError = validateRegistration(role, body);

  if (validationError) {
    return res.status(400).json({
      error: validationError
    });
  }

  try {
    const profile = Object.fromEntries(
      profileKeys(role).map((key) => [
        key,
        String(body[key]).trim()
      ])
    );

    const passwordHash = await bcrypt.hash(body.password, 10);

    const { rows } = await pool.query(
      `INSERT INTO app_users (
        role,
        user_code,
        name,
        mobile,
        email,
        password_hash,
        profile,
        approval_status,
        account_status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING','ACTIVE')
      RETURNING *`,
      [
        role,
        body.user_code.trim(),
        body.name.trim(),
        body.mobile.trim(),
        body.email?.trim() || null,
        passwordHash,
        profile
      ]
    );

     return res.status(403).json({
    error: 'Your account is waiting for administrator approval.'
  });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: `${ROLES[role].idLabel} already registered`
      });
    }

    console.error(error);

    return res.status(500).json({
      error: 'Unable to complete registration'
    });
  }
});

// Existing staff login endpoint
router.post('/staff/login', loginHandler(STAFF_LOGIN_ROLES, HW_DOOR));

// Current logged-in user
router.get('/me', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM app_users WHERE id = $1',
      [req.user.id]
    );

    return rows[0]
      ? res.json(publicUser(rows[0]))
      : res.status(404).json({ error: 'User not found' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Unable to fetch user'
    });
  }
});

// Contact visibility
router.patch('/contact-visibility', authRequired, async (req, res) => {
  if (!['MEDICAL_OFFICER', 'SPECIALIST'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Public contact preferences are only available to Medical Officers and Specialists'
    });
  }

  if (typeof req.body?.public_contact !== 'boolean') {
    return res.status(400).json({
      error: 'public_contact must be true or false'
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE app_users
       SET profile = COALESCE(profile, '{}'::jsonb)
         || jsonb_build_object('public_contact', $2::boolean)
       WHERE id = $1 AND role = $3
       RETURNING *`,
      [req.user.id, req.body.public_contact, req.user.role]
    );

    if (!rows[0]) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    return res.json(publicUser(rows[0]));

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Unable to update public contact preference'
    });
  }
});

export default router;
