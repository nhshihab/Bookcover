import pool from '../lib/db.js';

// GET /api/reset-quota?email=...&key=...
// Resets quotaUsed to 0 and quotaLimit to 30 for the given subscriber.
// Protected by ADMIN_KEY environment variable — never expose the key publicly.

export default async function handler(req, res) {
     if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

     const { email, key } = req.query;

     // ── Auth check ────────────────────────────────────────────
     const adminKey = process.env.ADMIN_KEY;
     if (!adminKey) {
          return res.status(500).json({ status: 'error', message: 'ADMIN_KEY not configured on server.' });
     }
     if (!key || key !== adminKey) {
          return res.status(403).json({ status: 'error', message: 'Forbidden — invalid admin key.' });
     }

     if (!email) {
          return res.status(400).json({ status: 'error', message: 'email query param is required.' });
     }

     try {
          const conn = await pool.getConnection();

          const [rows] = await conn.execute(
               'SELECT id FROM subscribers WHERE email = ? LIMIT 1',
               [email.toLowerCase().trim()]
          );

          if (rows.length === 0) {
               conn.release();
               return res.status(404).json({ status: 'error', message: `No subscriber found for: ${email}` });
          }

          await conn.execute(
               'UPDATE subscribers SET quotaUsed = 0, quotaLimit = 30, status = ? WHERE email = ?',
               ['active', email.toLowerCase().trim()]
          );
          conn.release();

          res.json({
               status: 'ok',
               message: `Quota reset for ${email} — 0 / 30 covers, status: active.`,
          });
     } catch (error) {
          console.error('reset-quota error:', error.message);
          res.status(500).json({ status: 'error', message: error.message });
     }
}
