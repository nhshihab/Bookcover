import pool from '../lib/db.js';

/**
 * Unified subscription management endpoint.
 *
 * POST /api/subscription?action=cancel
 *   Body: { email }
 *   → sets subscribers.status = 'cancelled'
 *
 * PUT  /api/subscription?action=update-quota
 *   Body: { email, quotaUsed }
 *   → updates subscribers.quotaUsed
 */
export default async function handler(req, res) {
     const { action } = req.query;

     // ── Cancel subscription ──────────────────────────────────────────────────
     if (action === 'cancel') {
          if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

          const { email } = req.body;
          if (!email) return res.status(400).json({ status: 'error', message: 'email is required' });

          try {
               const conn = await pool.getConnection();
               await conn.execute("UPDATE subscribers SET status = 'cancelled' WHERE email = ?", [email]);
               conn.release();
               return res.json({ status: 'ok', message: 'Subscription cancelled' });
          } catch (error) {
               console.error('cancel-subscription error:', error.message);
               return res.status(500).json({ status: 'error', message: error.message });
          }
     }

     // ── Update quota ─────────────────────────────────────────────────────────
     if (action === 'update-quota') {
          if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' });

          const { email, quotaUsed } = req.body;
          if (!email || quotaUsed === undefined) {
               return res.status(400).json({ status: 'error', message: 'email and quotaUsed are required' });
          }

          try {
               const conn = await pool.getConnection();
               await conn.execute('UPDATE subscribers SET quotaUsed = ? WHERE email = ?', [quotaUsed, email]);
               conn.release();
               return res.json({ status: 'ok' });
          } catch (error) {
               console.error('update-quota error:', error.message);
               return res.status(500).json({ status: 'error', message: error.message });
          }
     }

     return res.status(400).json({ status: 'error', message: 'Unknown action. Use ?action=cancel or ?action=update-quota' });
}
