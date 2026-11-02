
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { pathToFileURL } from 'url';

import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import adminRoutes from './routes/admin.js';
import contactRoutes from './routes/contact.js';

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

export default app;
