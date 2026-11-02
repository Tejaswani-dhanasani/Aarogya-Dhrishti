import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { pool } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();
const storage = multer.diskStorage({
  destination: 'uploads',
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});
const parseList = (v) => { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };

// Health worker adds a patient (with photo + consent)
router.post('/', authRequired, requireRole('HEALTH_WORKER'), upload.single('picture'), async (req, res) => {
  const b = req.body;
  if (!b.name?.trim() || !b.age || !b.gender || !/^\d{10}$/.test(b.mobile || '')) {
    return res.status(400).json({ error: 'Name, age, gender and a 10-digit mobile number are required' });
  }
  const abha = String(b.abha_number || '').replace(/[\s-]/g, '');
  if (abha && !/^\d{14}$/.test(abha)) return res.status(400).json({ error: 'ABHA number must be 14 digits (optional)' });
  if (b.consent !== 'true') return res.status(400).json({ error: 'Patient consent is required' });
  const { rows } = await pool.query(
    `INSERT INTO app_patients (health_worker_id,name,age,gender,mobile,blood_group,symptoms,previous_health,medications,tobacco,habits,picture_path,consent,abha_number,village)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,$14) RETURNING *`,
    [req.user.id, b.name.trim(), Number(b.age), b.gender, b.mobile, b.blood_group || null,
     JSON.stringify(parseList(b.symptoms)), b.previous_health || null, b.medications || null,
     b.tobacco || 'None', JSON.stringify(parseList(b.habits)), req.file ? `/uploads/${req.file.filename}` : null, abha || null, b.village?.trim() || null]
  );
  res.status(201).json(rows[0]);
});

// Health workers see their own patients; medical officers can review all patient records.
router.get('/', authRequired, requireRole('HEALTH_WORKER', 'MEDICAL_OFFICER'), async (req, res) => {
  const own = req.user.role === 'HEALTH_WORKER';
  const { rows } = await pool.query(
    `SELECT p.*, u.name AS worker_name FROM app_patients p JOIN app_users u ON u.id = p.health_worker_id
     ${own ? 'WHERE p.health_worker_id = $1' : ''} ORDER BY p.created_at DESC`,
    own ? [req.user.id] : []
  );
  res.json(rows);
});

export default router;
