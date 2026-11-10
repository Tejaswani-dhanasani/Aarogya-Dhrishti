import { Router } from 'express';
import { pool } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();
const CLINICIAN_ROLES = ['MEDICAL_OFFICER', 'SPECIALIST'];
const ALLOWED_ROLES = [...CLINICIAN_ROLES, 'HEALTH_WORKER'];
const REPORT_SEVERITIES = ['NON_SERIOUS', 'SERIOUS'];
const MAX_MEDICINES = 20;

router.use(authRequired);

async function findAccessiblePatient(patientId, user) {
  const { rows } = await pool.query(
    `SELECT p.id, p.health_worker_id,
            NULLIF(TRIM(hw.profile->>'district'), '') AS patient_district,
            NULLIF(TRIM(clinician.profile->>'district'), '') AS clinician_district
     FROM public.app_patients p
     JOIN public.app_users hw ON hw.id = p.health_worker_id
     LEFT JOIN public.app_users clinician ON clinician.id = $2
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [patientId, user.id]
  );
  const patient = rows[0];
  if (!patient) return false;
  if (user.role === 'HEALTH_WORKER') {
    return String(patient.health_worker_id) === String(user.id);
  }
  return Boolean(
    patient.patient_district &&
    patient.clinician_district &&
    patient.patient_district.toLowerCase() === patient.clinician_district.toLowerCase()
  );
}

function validateReport(body) {
  if (!REPORT_SEVERITIES.includes(body.severity)) {
    return 'Select whether the clinician-assessed condition is serious or non-serious.';
  }
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 4000)) {
    return 'Clinical notes must be 4,000 characters or fewer.';
  }
  if (!Array.isArray(body.medicines) || body.medicines.length > MAX_MEDICINES) {
    return `Provide a medicine list with no more than ${MAX_MEDICINES} items.`;
  }
  if (body.severity === 'SERIOUS' && body.medicines.length) {
    return 'Medication entries are only allowed for a clinician-assessed non-serious condition.';
  }
  for (const medicine of body.medicines) {
    if (!medicine || typeof medicine !== 'object') return 'Each medicine entry must be an object.';
    const requiredTextFields = [
      ['name', 150, 'Medicine name'],
      ['dosage', 100, 'Dosage'],
      ['frequency', 100, 'Frequency'],
      ['duration', 100, 'Duration'],
      ['unit', 30, 'Quantity unit']
    ];
    for (const [field, maxLength, label] of requiredTextFields) {
      if (typeof medicine[field] !== 'string' || !medicine[field].trim() ||
          medicine[field].trim().length > maxLength) {
        return `${label} is required and must be ${maxLength} characters or fewer.`;
      }
    }
    if (medicine.instructions !== undefined &&
        (typeof medicine.instructions !== 'string' || medicine.instructions.length > 500)) {
      return 'Medicine instructions must be 500 characters or fewer.';
    }
    const quantity = Number(medicine.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 99999999) {
      return 'Medicine quantity must be a positive number.';
    }
  }
  return null;
}

router.get(
  '/patients',
  requireRole(...CLINICIAN_ROLES),
  async (req, res) => {
    try {
      const { rows: clinicianRows } = await pool.query(
        `SELECT NULLIF(TRIM(profile->>'district'), '') AS district
         FROM public.app_users WHERE id = $1 AND role = $2`,
        [req.user.id, req.user.role]
      );
      const district = clinicianRows[0]?.district;
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
           AND LOWER(TRIM(COALESCE(hw.profile->>'district', ''))) = LOWER(TRIM($1))
         ORDER BY p.created_at DESC`,
        [district]
      );
      return res.json(rows);
    } catch (error) {
      console.error('Load clinical report patients error:', error);
      return res.status(500).json({ error: 'Unable to load patients for clinical reports.' });
    }
  }
);

router.get(
  '/patients/:patientId',
  requireRole(...ALLOWED_ROLES),
  async (req, res) => {
    if (!/^\d+$/.test(req.params.patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID.' });
    }

    try {
      if (!await findAccessiblePatient(req.params.patientId, req.user)) {
        return res.status(404).json({ error: 'Patient not found.' });
      }
      const { rows } = await pool.query(
        `SELECT r.id,
                r.patient_id,
                r.severity,
                r.notes,
                r.created_at,
                clinician.name AS clinician_name,
                'RPT-' || LPAD(r.id::text, GREATEST(6, LENGTH(r.id::text)), '0') AS report_code,
                CASE WHEN COUNT(m.id) > 0
                  THEN 'RX-' || LPAD(r.id::text, GREATEST(6, LENGTH(r.id::text)), '0')
                  ELSE NULL
                END AS prescription_code,
                COALESCE(
                  JSONB_AGG(JSONB_BUILD_OBJECT(
                    'id', m.id,
                    'name', m.medicine_name,
                    'dosage', m.dosage,
                    'frequency', m.frequency,
                    'duration', m.duration,
                    'quantity', m.quantity,
                    'unit', m.quantity_unit,
                    'instructions', m.instructions
                  ) ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL),
                  '[]'::jsonb
                ) AS medicines
         FROM public.app_clinical_reports r
         JOIN public.app_users clinician ON clinician.id = r.clinician_id
         LEFT JOIN public.app_clinical_report_medicines m ON m.report_id = r.id
         WHERE r.patient_id = $1
         GROUP BY r.id, clinician.name
         ORDER BY r.created_at DESC`,
        [req.params.patientId]
      );
      return res.json({ reports: rows });
    } catch (error) {
      console.error('Load patient clinical reports error:', error);
      return res.status(500).json({ error: 'Unable to load patient clinical reports.' });
    }
  }
);

router.post(
  '/patients/:patientId',
  requireRole(...CLINICIAN_ROLES),
  async (req, res) => {
    if (!/^\d+$/.test(req.params.patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID.' });
    }
    const validationError = validateReport(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError });

    let client;
    try {
      if (!await findAccessiblePatient(req.params.patientId, req.user)) {
        return res.status(404).json({ error: 'Patient not found in your district.' });
      }

      client = await pool.connect();
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO public.app_clinical_reports (patient_id, clinician_id, severity, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, patient_id, severity, notes, created_at`,
        [
          req.params.patientId,
          req.user.id,
          req.body.severity,
          req.body.notes?.trim() || null
        ]
      );
      const report = rows[0];
      for (const medicine of req.body.medicines) {
        await client.query(
          `INSERT INTO public.app_clinical_report_medicines
           (report_id, medicine_name, dosage, frequency, duration, quantity, quantity_unit, instructions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            report.id,
            medicine.name.trim(),
            medicine.dosage.trim(),
            medicine.frequency.trim(),
            medicine.duration.trim(),
            Number(medicine.quantity),
            medicine.unit.trim(),
            medicine.instructions?.trim() || null
          ]
        );
      }
      await client.query('COMMIT');

      return res.status(201).json({
        report: {
          ...report,
          report_code: `RPT-${String(report.id).padStart(6, '0')}`,
          prescription_code: req.body.medicines.length
            ? `RX-${String(report.id).padStart(6, '0')}`
            : null
        }
      });
    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback clinical report failed:', rollbackError);
        }
      }
      console.error('Create clinical report error:', error);
      return res.status(500).json({ error: 'Unable to save the clinical report.' });
    } finally {
      client?.release();
    }
  }
);

export default router;
