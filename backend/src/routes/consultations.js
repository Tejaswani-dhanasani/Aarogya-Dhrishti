import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { pool } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/join/:roomName', async (req, res) => {
  const { roomName } = req.params;
  if (!/^aarogya-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(roomName)) {
    return res.status(404).json({ error: 'Consultation link is invalid or unavailable.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT room_name, scheduled_at, status
       FROM public.app_consultations
       WHERE room_name = $1`,
      [roomName]
    );
    const appointment = rows[0];

    if (!appointment) {
      return res.status(404).json({ error: 'Consultation link is invalid or unavailable.' });
    }
    if (appointment.status !== 'SCHEDULED') {
      return res.status(410).json({ error: 'This consultation is no longer available.' });
    }

    return res.json({
      roomName: appointment.room_name,
      scheduledAt: appointment.scheduled_at,
      status: appointment.status
    });
  } catch (error) {
    console.error('Validate consultation link error:', error);
    return res.status(500).json({ error: 'Unable to validate consultation link.' });
  }
});

router.use(authRequired, requireRole('SPECIALIST'));

async function getSpecialistDistrict(userId) {
  const { rows } = await pool.query(
    `SELECT NULLIF(TRIM(profile->>'district'), '') AS district
     FROM public.app_users
     WHERE id = $1 AND role = 'SPECIALIST'`,
    [userId]
  );

  return rows[0]?.district || null;
}

router.get('/patients', async (req, res) => {
  try {
    const district = await getSpecialistDistrict(req.user.id);
    if (!district) {
      return res.status(403).json({
        error: 'Your district is not configured. Contact your administrator.'
      });
    }

    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.age, p.gender, p.village
       FROM public.app_patients p
       JOIN public.app_users hw ON hw.id = p.health_worker_id
       WHERE p.deleted_at IS NULL
         AND LOWER(TRIM(COALESCE(hw.profile->>'district', ''))) =
             LOWER(TRIM($1))
       ORDER BY p.created_at DESC`,
      [district]
    );

    return res.json(rows);
  } catch (error) {
    console.error('Consultation patient list error:', error);
    return res.status(500).json({ error: 'Unable to load patients' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, p.name AS patient_name, p.age AS patient_age,
              p.gender AS patient_gender
       FROM public.app_consultations c
       JOIN public.app_patients p ON p.id = c.patient_id
       WHERE c.specialist_id = $1
         AND p.deleted_at IS NULL
       ORDER BY c.scheduled_at DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    console.error('Consultation list error:', error);
    return res.status(500).json({ error: 'Unable to load consultations' });
  }
});

router.post('/', async (req, res) => {
  const { patientId, scheduledAt, reason } = req.body || {};
  const appointmentDate = new Date(scheduledAt);

  if (!/^\d+$/.test(String(patientId || '')) ||
      !scheduledAt ||
      Number.isNaN(appointmentDate.getTime())) {
    return res.status(400).json({
      error: 'A patient and valid appointment date/time are required.'
    });
  }

  if (appointmentDate <= new Date()) {
    return res.status(400).json({
      error: 'Please select a future appointment time.'
    });
  }

  try {
    const district = await getSpecialistDistrict(req.user.id);
    if (!district) {
      return res.status(403).json({
        error: 'Your district is not configured. Contact your administrator.'
      });
    }

    const { rows: patients } = await pool.query(
      `SELECT p.id
       FROM public.app_patients p
       JOIN public.app_users hw ON hw.id = p.health_worker_id
       WHERE p.id = $1
         AND p.deleted_at IS NULL
         AND LOWER(TRIM(COALESCE(hw.profile->>'district', ''))) =
             LOWER(TRIM($2))`,
      [patientId, district]
    );

    if (!patients[0]) {
      return res.status(404).json({
        error: 'Patient not found in your district.'
      });
    }

    const roomName = `aarogya-${randomUUID()}`;
    const { rows } = await pool.query(
      `INSERT INTO public.app_consultations
       (patient_id, specialist_id, scheduled_at, reason, room_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        patients[0].id,
        req.user.id,
        appointmentDate,
        typeof reason === 'string' ? reason.trim() || null : null,
        roomName
      ]
    );

    return res.status(201).json({
      message: 'Consultation scheduled successfully.',
      appointment: rows[0],
      patientJoinUrl: `/patient-consultation/${roomName}`
    });
  } catch (error) {
    console.error('Schedule consultation error:', error);
    return res.status(500).json({
      error: 'Unable to schedule consultation.'
    });
  }
});

router.patch('/:id', async (req, res) => {
  const { status, specialistNotes } = req.body || {};
  const allowedStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];

  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid consultation ID.' });
  }
  if (status !== undefined && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid consultation status.' });
  }
  if (specialistNotes !== undefined && typeof specialistNotes !== 'string') {
    return res.status(400).json({ error: 'Consultation notes must be text.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE public.app_consultations
       SET status = COALESCE($1, status),
           specialist_notes = COALESCE($2, specialist_notes),
           updated_at = NOW()
       WHERE id = $3 AND specialist_id = $4
       RETURNING *`,
      [
        status ?? null,
        specialistNotes?.trim() ?? null,
        req.params.id,
        req.user.id
      ]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Consultation not found.' });
    }

    return res.json({
      message: 'Consultation updated successfully.',
      appointment: rows[0]
    });
  } catch (error) {
    console.error('Update consultation error:', error);
    return res.status(500).json({
      error: 'Unable to update consultation.'
    });
  }
});

export default router;
