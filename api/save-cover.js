import pool from '../lib/db.js';

// POST /api/save-cover
// Body: { email, entry: { id, title, author, genre, exportedAt, config } }
// Stores full cover config including AI image (base64). Capped at 10 per user (~15MB max).

export default async function handler(req, res) {
     if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

     const { email, entry } = req.body;
     if (!email || !entry) {
          return res.status(400).json({ status: 'error', message: 'email and entry are required' });
     }

     try {
          const conn = await pool.getConnection();

          // Fetch current history
          const [rows] = await conn.execute(
               'SELECT coverHistory FROM subscribers WHERE email = ? LIMIT 1',
               [email.toLowerCase().trim()]
          );
          if (rows.length === 0) {
               conn.release();
               return res.status(404).json({ status: 'error', message: 'Subscriber not found' });
          }

          let history = [];
          try {
               history = rows[0].coverHistory ? JSON.parse(rows[0].coverHistory) : [];
          } catch { history = []; }

          // Keep full config including generatedImageUrl (base64 AI image).
          // Cap at 10 entries to stay within ~15MB per user.
          history.unshift(entry);
          if (history.length > 10) history = history.slice(0, 10);

          await conn.execute(
               'UPDATE subscribers SET coverHistory = ? WHERE email = ?',
               [JSON.stringify(history), email.toLowerCase().trim()]
          );
          conn.release();

          res.json({ status: 'ok', message: 'Cover saved to history', total: history.length });
     } catch (error) {
          console.error('save-cover error:', error.message);
          res.status(500).json({ status: 'error', message: error.message });
     }
}
