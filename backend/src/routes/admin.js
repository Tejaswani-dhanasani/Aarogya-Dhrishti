
import { Router } from 'express';
import { pool } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

const MANAGED_ROLES = {
  SUPER_ADMIN: ['DISTRICT_ADMIN'],
  DISTRICT_ADMIN: ['MEDICAL_OFFICER', 'SPECIALIST', 'NAVIGATOR'],
};

const VISIBLE_ROLES = {
  SUPER_ADMIN: [
    'DISTRICT_ADMIN',
    'MEDICAL_OFFICER',
    'SPECIALIST',
    'NAVIGATOR',
  ],
  DISTRICT_ADMIN: [
    'MEDICAL_OFFICER',
    'SPECIALIST',
    'NAVIGATOR',
  ],
};

router.use(authRequired, requireRole('SUPER_ADMIN', 'DISTRICT_ADMIN'));

// Get officials managed by the logged-in administrator
router.get('/officials', async (req, res) => {
  try {
    let district = null;

    if (req.user.role === 'DISTRICT_ADMIN') {
      const admins = await pool.query(
        `SELECT profile FROM public.app_users
         WHERE id = $1 AND role = $2`,
        [req.user.id, 'DISTRICT_ADMIN']
      );

      district = admins.rows[0]?.profile?.district;

      if (!district) {
        return res.status(403).json({
          error: 'Your account has no assigned district',
        });
      }
    }

    const { rows } = await pool.query(
      `SELECT
         id, role, user_code, name, mobile, email,
         profile, created_at, approval_status,
         approved_by, approved_at, rejection_reason,
         account_status
       FROM public.app_users
       WHERE role = ANY($1::text[])
         AND (
           $2::text IS NULL OR
           lower(trim(profile->>'district')) = lower(trim($2))
         )
       ORDER BY created_at DESC`,
      [VISIBLE_ROLES[req.user.role], district]
    );

    res.json(rows);

  } catch (error) {
    console.error('Load officials error:', error);

    res.status(500).json({
      error: 'Unable to load managed officials',
    });
  }
});

// Approve or reject a pending registration
router.patch('/officials/:id/approval', async (req, res) => {
  const { id } = req.params;
  const { status, rejection_reason } = req.body || {};

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({
      error: 'Status must be APPROVED or REJECTED',
    });
  }

  if (status === 'REJECTED' &&
      (!rejection_reason || !rejection_reason.trim())) {
    return res.status(400).json({
      error: 'Rejection reason is required',
    });
  }

  try {
    let district = null;

    if (req.user.role === 'DISTRICT_ADMIN') {
      const admins = await pool.query(
        `SELECT profile FROM public.app_users
         WHERE id = $1 AND role = $2`,
        [req.user.id, 'DISTRICT_ADMIN']
      );

      district = admins.rows[0]?.profile?.district;

      if (!district) {
        return res.status(403).json({
          error: 'Your account has no assigned district',
        });
      }
    }

    const { rows } = await pool.query(
      `UPDATE public.app_users
       SET approval_status = $1,
           approved_by = $2,
           approved_at = CASE
             WHEN $1 = 'APPROVED' THEN NOW()
             ELSE NULL
           END,
           rejection_reason = CASE
             WHEN $1 = 'REJECTED' THEN $3
             ELSE NULL
           END
       WHERE id = $4
         AND role = ANY($5::text[])
         AND approval_status = 'PENDING'
         AND (
           $6::text IS NULL OR
           lower(trim(profile->>'district')) = lower(trim($6))
         )
       RETURNING
         id, role, user_code, name, approval_status,
         approved_by, approved_at, rejection_reason`,
      [
        status,
        String(req.user.id),
        status === 'REJECTED' ? rejection_reason.trim() : null,
        id,
        MANAGED_ROLES[req.user.role],
        district,
      ]
    );

    if (!rows[0]) {
      return res.status(404).json({
        error: 'Pending registration not found or not managed by you',
      });
    }

    res.json({
      message: `Registration ${status.toLowerCase()} successfully`,
      user: rows[0],
    });

  } catch (error) {
    console.error('Approval error:', error);

    res.status(500).json({
      error: 'Unable to update registration status',
    });
  }
});

export default router;
