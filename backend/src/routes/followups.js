
import { Router } from 'express';
import { pool } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authRequired, requireRole('NAVIGATOR'));

// Get the logged-in Navigator's district from the database.
async function getNavigatorDistrict(userId) {
  const { rows } = await pool.query(
    `SELECT NULLIF(TRIM(profile->>'district'), '') AS district
     FROM public.app_users
     WHERE id = $1 AND role = 'NAVIGATOR'`,
    [userId]
  );

  return rows[0]?.district || null;
}

// Check whether a patient belongs to this Navigator's district.
async function getPatientInDistrict(patientId, district) {
  const { rows } = await pool.query(
    `SELECT p.id
     FROM public.app_patients p
     JOIN public.app_users hw
       ON hw.id = p.health_worker_id
     WHERE p.id = $1
       AND p.deleted_at IS NULL
       AND LOWER(TRIM(COALESCE(hw.profile->>'district', ''))) =
           LOWER(TRIM($2))`,
    [patientId, district]
  );

  return rows[0] || null;
}

// GET: List patients belonging to the Navigator's district.
router.get('/patients', async (req, res) => {
  try {
    const district = await getNavigatorDistrict(req.user.id);

    if (!district) {
      return res.status(403).json({
        error: 'Your district is not configured. Contact your administrator.'
      });
    }

    const { rows } = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.age,
         p.gender,
         p.mobile,
         p.village,
         p.symptoms,
         p.tobacco,
         p.created_at,
         hw.name AS worker_name,
         COALESCE(f.followup_count, 0)::int AS followup_count,
         COALESCE(f.completed_followups, 0)::int AS completed_followups,
         f.last_followup_date,
         f.last_health_status,
         f.next_followup_date
       FROM public.app_patients p
       JOIN public.app_users hw
         ON hw.id = p.health_worker_id
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*) AS followup_count,
           COUNT(*) FILTER (
             WHERE followup_date <= CURRENT_DATE
           ) AS completed_followups,
           (ARRAY_AGG(
             followup_date ORDER BY followup_date DESC, created_at DESC
           ))[1] AS last_followup_date,
           (ARRAY_AGG(
             health_status ORDER BY followup_date DESC, created_at DESC
           ))[1] AS last_health_status,
           MIN(next_followup_date) FILTER (
             WHERE next_followup_date >= CURRENT_DATE
           ) AS next_followup_date
         FROM public.app_patient_followups
         WHERE patient_id = p.id
       ) f ON TRUE
       WHERE p.deleted_at IS NULL
         AND LOWER(TRIM(COALESCE(hw.profile->>'district', ''))) =
             LOWER(TRIM($1))
       ORDER BY p.created_at DESC`,
      [district]
    );

    const stats = rows.reduce((totals, patient) => ({
      completedFollowUps: totals.completedFollowUps + patient.completed_followups,
      upcomingFollowUps: totals.upcomingFollowUps + Number(Boolean(patient.next_followup_date))
    }), {
      completedFollowUps: 0,
      upcomingFollowUps: 0
    });

    return res.json({
      district,
      patients: rows,
      stats: {
        totalPatients: rows.length,
        ...stats
      }
    });
  } catch (error) {
    console.error('Navigator patient list error:', error);
    return res.status(500).json({
      error: 'Unable to load patients'
    });
  }
});

// GET: View follow-up history of a patient in the same district.
router.get('/patients/:patientId/history', async (req, res) => {
  try {
    const district = await getNavigatorDistrict(req.user.id);

    if (!district) {
      return res.status(403).json({
        error: 'Navigator district is not configured'
      });
    }

    const patient = await getPatientInDistrict(
      req.params.patientId,
      district
    );

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found in your district'
      });
    }

    const { rows } = await pool.query(
      `SELECT
         f.id,
         f.patient_id,
         f.followup_date,
         f.health_status,
         f.remarks,
         f.next_followup_date,
         f.created_at,
         n.name AS navigator_name
       FROM public.app_patient_followups f
       JOIN public.app_users n
         ON n.id = f.navigator_id
       WHERE f.patient_id = $1
       ORDER BY f.followup_date DESC, f.created_at DESC`,
      [patient.id]
    );

    return res.json(rows);
  } catch (error) {
    console.error('Follow-up history error:', error);
    return res.status(500).json({
      error: 'Unable to load follow-up history'
    });
  }
});

// POST: Add a follow-up for a patient in the same district.
router.post('/patients/:patientId', async (req, res) => {
  try {
    const district = await getNavigatorDistrict(req.user.id);

    if (!district) {
      return res.status(403).json({
        error: 'Navigator district is not configured'
      });
    }

    const patient = await getPatientInDistrict(
      req.params.patientId,
      district
    );

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found in your district'
      });
    }

    const {
      health_status,
      remarks,
      followup_date,
      next_followup_date
    } = req.body || {};

    if (typeof health_status !== 'string' || !health_status.trim()) {
      return res.status(400).json({
        error: 'Health status is required'
      });
    }
    if (health_status.trim().length > 2000) {
      return res.status(400).json({
        error: 'Health status must be 2,000 characters or fewer'
      });
    }
    if (remarks !== undefined && remarks !== null && typeof remarks !== 'string') {
      return res.status(400).json({
        error: 'Remarks must be text'
      });
    }
    if (typeof remarks === 'string' && remarks.length > 4000) {
      return res.status(400).json({
        error: 'Remarks must be 4,000 characters or fewer'
      });
    }

    const validDate = (value) =>
      !value || (
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
      );

    if (!validDate(followup_date) || !validDate(next_followup_date)) {
      return res.status(400).json({
        error: 'Enter valid dates in YYYY-MM-DD format'
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO public.app_patient_followups
       (patient_id, navigator_id, health_status, remarks,
        followup_date, next_followup_date)
       VALUES (
         $1, $2, $3, $4,
         COALESCE($5::date, CURRENT_DATE),
         $6::date
       )
       RETURNING *`,
      [
        patient.id,
        req.user.id,
        health_status.trim(),
        remarks?.trim() || null,
        followup_date || null,
        next_followup_date || null
      ]
    );

    return res.status(201).json({
      message: 'Follow-up saved successfully',
      followup: rows[0]
    });
  } catch (error) {
    console.error('Create follow-up error:', error);
    return res.status(500).json({
      error: 'Unable to save follow-up'
    });
  }
});

export default router;
