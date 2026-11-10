import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import sharp from 'sharp';
import { pool } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(new Error('Upload a JPEG, PNG, or WebP image.'));
    }
    return callback(null, true);
  }
});
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseList(value, field, key) {
  let list;
  try {
    list = JSON.parse(value || '[]');
  } catch {
    throw new Error(`${field} must be a valid list.`);
  }
  if (!Array.isArray(list) || list.some((item) =>
    !item || typeof item !== 'object' || typeof item[key] !== 'string' || !item[key].trim()
  )) {
    throw new Error(`${field} must contain valid ${key} entries.`);
  }
  return list;
}

function validatePatient(body) {
  if (!body.name?.trim() || !/^\d+$/.test(body.age || '') ||
      Number(body.age) < 1 || Number(body.age) > 120 ||
      !body.gender?.trim() || !/^\d{10}$/.test(body.mobile || '')) {
    return 'Name, age (1-120), gender and a 10-digit mobile number are required.';
  }
  const abha = String(body.abha_number || '').replace(/[\s-]/g, '');
  if (abha && !/^\d{14}$/.test(abha)) {
    return 'ABHA number must be 14 digits (optional).';
  }
  if (body.consent !== 'true') return 'Patient consent is required.';
  return null;
}

async function validateAndSavePhoto(file) {
  if (!file) return null;
  let converted;
  try {
    const image = sharp(file.buffer, { limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) ||
        !metadata.width || !metadata.height ||
        metadata.width > 10000 || metadata.height > 10000) {
      throw new Error('Image format or dimensions are unsupported.');
    }

    converted = await image.rotate().jpeg({ quality: 90 }).toBuffer();
  } catch (error) {
    throw new Error('Image is invalid or corrupted. Use a valid JPEG, PNG, or WebP image up to 5 MB.');
  }
  const filename = `${randomUUID()}.jpg`;
  await fs.mkdir('uploads', { recursive: true });
  await fs.writeFile(path.join('uploads', filename), converted, { flag: 'wx' });
  return `/uploads/${filename}`;
}

async function removePhoto(photoPath) {
  if (!photoPath || !/^\/uploads\/[0-9a-f-]+\.jpg$/i.test(photoPath)) return;
  try {
    await fs.unlink(path.join('uploads', path.basename(photoPath)));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Unable to remove patient photo:', error);
  }
}

function reportUploadError(error, _req, res, next) {
  if (!error) return next();
  const message = error instanceof multer.MulterError
    ? error.code === 'LIMIT_FILE_SIZE'
      ? 'Image must be 5 MB or smaller.'
      : 'Unable to accept this image upload.'
    : error.message;
  return res.status(400).json({ error: message });
}

function patientLists(body) {
  return {
    symptoms: parseList(body.symptoms, 'Symptoms', 'name'),
    habits: parseList(body.habits, 'Habits', 'habit')
  };
}

async function findDuplicates({ healthWorkerId, mobile, abhaNumber, exceptPatientId = null }) {
  const { rows } = await pool.query(
    `SELECT id, name, mobile, abha_number, village, created_at
     FROM public.app_patients
     WHERE health_worker_id = $1
       AND deleted_at IS NULL
       AND (
         mobile = $2 OR
         ($3 <> '' AND regexp_replace(COALESCE(abha_number, ''), '[^0-9]', '', 'g') = $3)
       )
     AND ($4::bigint IS NULL OR id <> $4)
     ORDER BY created_at DESC
     LIMIT 10`,
    [healthWorkerId, mobile, abhaNumber, exceptPatientId]
  );
  return rows;
}

router.use(authRequired);

router.get('/duplicates', requireRole('HEALTH_WORKER'), async (req, res) => {
  const mobile = String(req.query.mobile || '');
  const abhaNumber = String(req.query.abha_number || '').replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(mobile) && !/^\d{14}$/.test(abhaNumber)) {
    return res.status(400).json({
      error: 'Provide a valid mobile number or 14-digit ABHA number.'
    });
  }

  try {
    const duplicates = await findDuplicates({
      healthWorkerId: req.user.id,
      mobile,
      abhaNumber
    });
    return res.json({ duplicates });
  } catch (error) {
    console.error('Patient duplicate check error:', error);
    return res.status(500).json({ error: 'Unable to check for duplicates.' });
  }
});

router.post(
  '/',
  requireRole('HEALTH_WORKER'),
  upload.single('picture'),
  reportUploadError,
  async (req, res) => {
    const body = req.body || {};
    const validationError = validatePatient(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const clientId = body.client_id;
    if (clientId && !UUID_PATTERN.test(clientId)) {
      return res.status(400).json({ error: 'Invalid offline record identifier.' });
    }

    let photoPath;
    try {
      if (clientId) {
        const { rows } = await pool.query(
          `SELECT * FROM public.app_patients
           WHERE client_id = $1 AND health_worker_id = $2`,
          [clientId, req.user.id]
        );
        if (rows[0]) return res.status(200).json({ patient: rows[0], duplicate: true });
      }

      const duplicates = await findDuplicates({
        healthWorkerId: req.user.id,
        mobile: body.mobile,
        abhaNumber: String(body.abha_number || '').replace(/[\s-]/g, '')
      });
      if (duplicates.length && body.allow_duplicate !== 'true') {
        return res.status(409).json({
          error: 'A patient with the same mobile number or ABHA number already exists.',
          duplicateCandidates: duplicates
        });
      }

      const { symptoms, habits } = patientLists(body);
      photoPath = await validateAndSavePhoto(req.file);
      const { rows } = await pool.query(
        `INSERT INTO public.app_patients
         (health_worker_id, name, age, gender, mobile, blood_group, symptoms,
          previous_health, medications, tobacco, habits, picture_path, consent,
          abha_number, village, client_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,$14,$15)
         RETURNING *`,
        [
          req.user.id, body.name.trim(), Number(body.age), body.gender.trim(),
          body.mobile, body.blood_group || null, JSON.stringify(symptoms),
          body.previous_health || null, body.medications || null,
          body.tobacco || 'None', JSON.stringify(habits), photoPath,
          String(body.abha_number || '').replace(/[\s-]/g, '') || null,
          body.village?.trim() || null, clientId || null
        ]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      if (photoPath) await removePhoto(photoPath);
      if (error.message.includes('must be a valid list') ||
          error.message.includes('must contain valid')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.startsWith('Image is invalid')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.code === '23505' && clientId) {
        const { rows } = await pool.query(
          `SELECT * FROM public.app_patients
           WHERE client_id = $1 AND health_worker_id = $2`,
          [clientId, req.user.id]
        );
        if (rows[0]) return res.status(200).json({ patient: rows[0], duplicate: true });
      }
      console.error('Create patient error:', error);
      return res.status(500).json({ error: 'Unable to save patient record.' });
    }
  }
);

router.get('/', requireRole('HEALTH_WORKER', 'MEDICAL_OFFICER'), async (req, res) => {
  try {
    const own = req.user.role === 'HEALTH_WORKER';
    const { rows } = await pool.query(
      `SELECT p.*, u.name AS worker_name,
              EXISTS (
                SELECT 1 FROM public.app_clinical_reports report
                WHERE report.patient_id = p.id
              ) AS has_clinical_report
       FROM public.app_patients p
       JOIN public.app_users u ON u.id = p.health_worker_id
       WHERE p.deleted_at IS NULL
         ${own ? 'AND p.health_worker_id = $1' : ''}
       ORDER BY p.created_at DESC`,
      own ? [req.user.id] : []
    );
    return res.json(rows);
  } catch (error) {
    console.error('Load patients error:', error);
    return res.status(500).json({ error: 'Unable to load patient records.' });
  }
});

router.put(
  '/:id',
  requireRole('HEALTH_WORKER'),
  upload.single('picture'),
  reportUploadError,
  async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid patient ID.' });
    }
    const body = req.body || {};
    const validationError = validatePatient(body);
    if (validationError) return res.status(400).json({ error: validationError });

    let photoPath;
    try {
      const { rows: existingRows } = await pool.query(
        `SELECT * FROM public.app_patients
         WHERE id = $1 AND health_worker_id = $2 AND deleted_at IS NULL`,
        [req.params.id, req.user.id]
      );
      const existing = existingRows[0];
      if (!existing) return res.status(404).json({ error: 'Patient not found.' });

      const duplicates = await findDuplicates({
        healthWorkerId: req.user.id,
        mobile: body.mobile,
        abhaNumber: String(body.abha_number || '').replace(/[\s-]/g, ''),
        exceptPatientId: req.params.id
      });
      if (duplicates.length) {
        return res.status(409).json({
          error: 'Another patient with the same mobile number or ABHA number already exists.',
          duplicateCandidates: duplicates
        });
      }

      const { symptoms, habits } = patientLists(body);
      photoPath = await validateAndSavePhoto(req.file);
      const nextPhotoPath = photoPath
        || (body.remove_picture === 'true' ? null : existing.picture_path);
      const { rows } = await pool.query(
        `UPDATE public.app_patients
         SET name = $1, age = $2, gender = $3, mobile = $4, blood_group = $5,
             symptoms = $6, previous_health = $7, medications = $8,
             tobacco = $9, habits = $10, picture_path = $11, abha_number = $12,
             village = $13, updated_at = NOW()
         WHERE id = $14 AND health_worker_id = $15 AND deleted_at IS NULL
         RETURNING *`,
        [
          body.name.trim(), Number(body.age), body.gender.trim(), body.mobile,
          body.blood_group || null, JSON.stringify(symptoms),
          body.previous_health || null, body.medications || null,
          body.tobacco || 'None', JSON.stringify(habits), nextPhotoPath,
          String(body.abha_number || '').replace(/[\s-]/g, '') || null,
          body.village?.trim() || null, req.params.id, req.user.id
        ]
      );

      if (existing.picture_path && existing.picture_path !== nextPhotoPath) {
        await removePhoto(existing.picture_path);
      }
      return res.json(rows[0]);
    } catch (error) {
      if (photoPath) await removePhoto(photoPath);
      if (error.message.includes('must be a valid list') ||
          error.message.includes('must contain valid')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.startsWith('Image is invalid')) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Update patient error:', error);
      return res.status(500).json({ error: 'Unable to update patient record.' });
    }
  }
);

router.delete('/:id', requireRole('HEALTH_WORKER'), async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid patient ID.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE public.app_patients
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND health_worker_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Patient not found.' });
    return res.json({ message: 'Patient record archived.' });
  } catch (error) {
    console.error('Archive patient error:', error);
    return res.status(500).json({ error: 'Unable to archive patient record.' });
  }
});

export default router;
