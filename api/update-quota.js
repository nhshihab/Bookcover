import pool from '../lib/db.js';

export default async function handler(req, res) {
     if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' });

     const { email, quotaUsed } = req.body;
     if (!email || quotaUsed === undefined) {
          return res.status(400).json({ status: 'error', message: 'email and quotaUsed are required' });
     }

     try {
          const conn = await pool.getConnection();
          await conn.execute('UPDATE subscribers SET quotaUsed = ? WHERE email = ?', [quotaUsed, email]);
          conn.release();
          res.json({ status: 'ok' });
     } catch (error) {
          console.error('update-quota error:', error.message);
          res.status(500).json({ status: 'error', message: error.message });
     }
}
