import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/officials', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT role, name, mobile, email, profile
       FROM app_users
       WHERE role = ANY($1::text[])
         AND profile->>'public_contact' = 'true'
       ORDER BY role, name`,
      [['MEDICAL_OFFICER', 'SPECIALIST']],
    );
    res.json(rows.map((official) => ({
      role: official.role,
      name: official.name,
      mobile: official.mobile,
      email: official.email,
      district: official.profile?.district || '',
      specialization: official.profile?.specialization || '',
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load public official contacts' });
  }
});

export default router;
