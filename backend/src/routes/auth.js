
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { ROLES, profileKeys, validateRegistration } from '../roleFields.js';
import { SECRET, authRequired, requireRole } from '../middleware/auth.js';

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
const STAFF_REGISTRATION_ROLES = [
  'MEDICAL_OFFICER',
  'SPECIALIST',
  'NAVIGATOR',
  'DISTRICT_ADMIN'
];

const STAFF_LOGIN_ROLES = [
  'MEDICAL_OFFICER',
  'SPECIALIST',
  'NAVIGATOR',
  'DISTRICT_ADMIN',
  'SUPER_ADMIN'
];

const STAFF_DOOR = 'This role must use the Staff Portal';
const HW_DOOR = 'Health workers cannot use the Staff Portal. Use the main page.';

// Role fields
router.get('/role-fields', (_req, res) => {
  res.json(ROLES);
});

// Registration handler
const registerHandler = (allowed, wrongDoor, approvalStatus = 'APPROVED') => async (req, res) => {
  const { role } = req.body;

  if (ROLES[role] && !allowed.includes(role)) {
    return res.status(403).json({ error: wrongDoor });
  }

  const error = validateRegistration(role, req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const body = req.body;
  const registrationApprovalStatus = typeof approvalStatus === 'function'
    ? approvalStatus(role)
    : approvalStatus;

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
       (role, name, mobile, email, password_hash, profile,
        approval_status, approved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,
         CASE WHEN $7 = 'APPROVED' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [
        role,
        body.name.trim(),
        body.mobile.trim(),
        body.email?.trim() || null,
        passwordHash,
        profile,
        registrationApprovalStatus
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

  if (user.role !== 'SUPER_ADMIN' && user.approval_status === 'PENDING') {
    return res.status(403).json({
      error: 'Your account is waiting for administrator approval.'
    });
  }

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

// District Admin accounts activate immediately; clinical staff require approval.
router.post(
  '/staff/register',
  registerHandler(
    STAFF_REGISTRATION_ROLES,
    'This role cannot register through the Staff Portal.',
    (role) => role === 'DISTRICT_ADMIN' ? 'APPROVED' : 'PENDING'
  )
);

// Existing staff login endpoint
router.post('/staff/login', loginHandler(STAFF_LOGIN_ROLES, HW_DOOR));

router.get('/me', authRequired, async (req, res) => {
  if (req.user.id === 'super-admin') {
    return res.json(req.user);
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, role, user_code, name, mobile, email, profile
       FROM public.app_users
       WHERE id = $1`,
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'User account not found' });
    }

    return res.json(publicUser(rows[0]));
  } catch (error) {
    console.error('Load current user error:', error);
    return res.status(500).json({ error: 'Unable to load current user' });
  }
});

router.patch(
  '/contact-visibility',
  authRequired,
  requireRole('MEDICAL_OFFICER', 'SPECIALIST'),
  async (req, res) => {
    const { public_contact } = req.body || {};
    if (typeof public_contact !== 'boolean') {
      return res.status(400).json({
        error: 'public_contact must be true or false'
      });
    }

    try {
      const { rows } = await pool.query(
        `UPDATE public.app_users
         SET profile = jsonb_set(
           COALESCE(profile, '{}'::jsonb),
           '{public_contact}',
           to_jsonb($1::boolean),
           true
         )
         WHERE id = $2
         RETURNING id, role, user_code, name, mobile, email, profile`,
        [public_contact, req.user.id]
      );

      if (!rows[0]) {
        return res.status(404).json({ error: 'User account not found' });
      }

      return res.json(publicUser(rows[0]));
    } catch (error) {
      console.error('Update contact visibility error:', error);
      return res.status(500).json({
        error: 'Unable to update contact visibility'
      });
    }
  }
);

export default router;
