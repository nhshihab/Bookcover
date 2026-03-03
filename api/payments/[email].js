import pool from '../../lib/db.js';

// DELETE /api/payments/[email]  — removes payment record on subscription cancel
export default async function handler(req, res) {
     if (req.method !== 'DELETE') return res.status(405).json({ message: 'Method not allowed' });

     const { email } = req.query;
     try {
          const conn = await pool.getConnection();
          await conn.execute('DELETE FROM payments WHERE customerEmail = ?', [email]);
          conn.release();
          res.json({ status: 'ok', message: 'Payment record deleted' });
     } catch (error) {
          console.error('DELETE /payments error:', error.message);
          res.status(500).json({ status: 'error', message: error.message });
     }
}
