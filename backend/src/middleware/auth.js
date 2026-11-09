
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export const SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Login required' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    // Static Super Admin has no database account.
    if (decoded.id === 'super-admin' && decoded.role === 'SUPER_ADMIN') {
      req.user = decoded;
      return next();
    }

    // Verify the user's current status in the database.
    const { rows } = await pool.query(
      `SELECT id, role, approval_status, account_status
       FROM public.app_users
       WHERE id = $1`,
      [decoded.id]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        error: 'User account not found'
      });
    }

    if (user.role !== decoded.role) {
      return res.status(401).json({
        error: 'Invalid user session'
      });
    }

    if (user.approval_status !== 'APPROVED') {
      return res.status(403).json({
        error: 'Your account is not approved. Please contact your administrator.'
      });
    }

    if (user.account_status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Your account is suspended. Contact your administrator.'
      });
    }

    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Session expired, please login again'
      });
    }

    console.error('Authentication error:', error);

    return res.status(500).json({
      error: 'Authentication service error'
    });
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: 'Not allowed for your role' });
