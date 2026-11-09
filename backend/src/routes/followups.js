
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
         hw.name AS worker_name
       FROM public.app_patients p
       JOIN public.app_users hw
         ON hw.id = p.health_worker_id
       WHERE LOWER(TRIM(COALESCE(hw.profile->>'district', ''))) =
             LOWER(TRIM($1))
       ORDER BY p.created_at DESC`,
      [district]
    );

    return res.json({
      district,
      patients: rows
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

    if (!health_status?.trim()) {
      return res.status(400).json({
        error: 'Health status is required'
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
