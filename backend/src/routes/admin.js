import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { profileKeys, ROLES, validateRegistration } from '../roleFields.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();
const publicUser = (user) => ({
  id: user.id,
  role: user.role,
  user_code: user.user_code,
  name: user.name,
  mobile: user.mobile,
  email: user.email,
  profile: user.profile,
  created_at: user.created_at,
});
const MANAGED_ROLES = {
  SUPER_ADMIN: ['DISTRICT_ADMIN'],
  DISTRICT_ADMIN: ['MEDICAL_OFFICER', 'SPECIALIST', 'NAVIGATOR'],
};
const VISIBLE_ROLES = {
  SUPER_ADMIN: ['DISTRICT_ADMIN', 'MEDICAL_OFFICER', 'SPECIALIST', 'NAVIGATOR'],
  DISTRICT_ADMIN: MANAGED_ROLES.DISTRICT_ADMIN,
};

router.use(authRequired, requireRole('SUPER_ADMIN', 'DISTRICT_ADMIN'));

router.get('/officials', async (req, res) => {
  try {
    let district = null;
    if (req.user.role === 'DISTRICT_ADMIN') {
      const admins = await pool.query(
        'SELECT profile FROM app_users WHERE id=$1 AND role=$2',
        [req.user.id, req.user.role],
      );
      district = admins.rows[0]?.profile?.district;
      if (!district) return res.status(403).json({ error: 'Your account has no assigned district' });
    }

    const { rows } = await pool.query(
      `SELECT id, role, user_code, name, mobile, email, profile, created_at
       FROM app_users
       WHERE role = ANY($1::text[])
         AND ($2::text IS NULL OR lower(trim(profile->>'district')) = lower(trim($2)))
       ORDER BY created_at DESC`,
      [VISIBLE_ROLES[req.user.role], district],
    );
    res.json(rows.map(publicUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load managed officials' });
  }
});

router.post('/officials', async (req, res) => {
  const body = req.body || {};
  const { role } = body;
  if (!MANAGED_ROLES[req.user.role]?.includes(role)) {
    return res.status(403).json({ error: 'You are not allowed to create an account for this role' });
  }

  const validationError = validateRegistration(role, body);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    if (req.user.role === 'DISTRICT_ADMIN') {
      const admins = await pool.query(
        'SELECT profile FROM app_users WHERE id=$1 AND role=$2',
        [req.user.id, req.user.role],
      );
      const district = admins.rows[0]?.profile?.district;
      if (!district) return res.status(403).json({ error: 'Your account has no assigned district' });
      if (body.district.trim().toLowerCase() !== district.trim().toLowerCase()) {
        return res.status(403).json({ error: 'You can only create officials assigned to your district' });
      }
    }

    const profile = Object.fromEntries(
      profileKeys(role).map((key) => [key, String(body[key]).trim()]),
    );
    const passwordHash = await bcrypt.hash(body.password, 10);
    const { rows } = await pool.query(
      `INSERT INTO app_users (role, user_code, name, mobile, email, password_hash, profile)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, role, user_code, name, mobile, email, profile, created_at`,
      [
        role,
        body.user_code.trim(),
        body.name.trim(),
        body.mobile.trim(),
        body.email?.trim() || null,
        passwordHash,
        profile,
      ],
    );
    res.status(201).json({ message: 'Official account created', user: publicUser(rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: `${ROLES[role].idLabel} already registered` });
    }
    console.error(error);
    res.status(500).json({ error: 'Unable to create official account' });
  }
});

export default router;
