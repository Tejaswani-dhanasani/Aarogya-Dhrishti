
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { pathToFileURL } from 'url';

import pool from "./db.js";
import { initDb } from './db.js';
//Routes
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import adminRoutes from './routes/admin.js';
import contactRoutes from './routes/contact.js';
import followupRoutes from './routes/followups.js';

dotenv.config();

fs.mkdirSync('uploads', { recursive: true });

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
}));

app.use(express.json());

app.use('/uploads', express.static('uploads'));

app.get("/", (_req, res) => {
  res.send("Swasthify backend is running!");
});
// Health check
app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    system: 'Swasthify API'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/followups', followupRoutes);

// LOCATION APIs
// GET all districts
app.get('/api/locations/districts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name_en
      FROM mst_districts
      WHERE is_active = TRUE
      ORDER BY name_en
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('District API error:', error.message);
    res.status(500).json({ message: 'Failed to load districts' });
  }
});

// GET mandals by district
app.get('/api/locations/mandals/:districtId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name_en
       FROM mst_mandals
       WHERE district_id = $1
         AND is_active = TRUE
       ORDER BY name_en`,
      [req.params.districtId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Mandal API error:', error.message);
    res.status(500).json({ message: 'Failed to load mandals' });
  }
});

// GET villages by mandal
app.get('/api/locations/villages/:mandalId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name_en
       FROM mst_villages
       WHERE mandal_id = $1
         AND is_active = TRUE
       ORDER BY name_en`,
      [req.params.mandalId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Village API error:', error.message);
    res.status(500).json({ message: 'Failed to load villages' });
  }
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    error: 'Server error'
  });
});

// Start server only when executed directly
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = process.env.PORT || 5000;

  initDb()
    .then(() => {
      app.listen(port, () => {
        console.log(`API running on http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error(
        'Database connection failed:',
        error.message
      );

      process.exit(1);
    });
}

async function checkDatabase() {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        current_user AS username,
        inet_server_port() AS port
    `);

    console.log("Connected database details:");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Database check failed:", error.message);
  }
}
checkDatabase();

export default app;
