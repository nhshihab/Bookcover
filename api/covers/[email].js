import pool from '../../lib/db.js';

// GET /api/covers/[email]
// Returns the cover history array for a logged-in subscriber.
// The email in the URL must match the session email (honour-system — no token auth).

export default async function handler(req, res) {
     if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

     const { email } = req.query;
     if (!email) return res.status(400).json({ status: 'error', message: 'email is required' });

     try {
          const conn = await pool.getConnection();
          const [rows] = await conn.execute(
               'SELECT coverHistory FROM subscribers WHERE email = ? LIMIT 1',
               [decodeURIComponent(email).toLowerCase().trim()]
          );
          conn.release();

          if (rows.length === 0) {
               return res.status(404).json({ status: 'error', message: 'Subscriber not found' });
          }

          let history = [];
          try {
               history = rows[0].coverHistory ? JSON.parse(rows[0].coverHistory) : [];
          } catch { history = []; }

          res.json({ status: 'ok', covers: history });
     } catch (error) {
          console.error('GET /covers error:', error.message);
          res.status(500).json({ status: 'error', message: error.message });
     }
}
