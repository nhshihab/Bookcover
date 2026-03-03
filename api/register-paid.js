import bcrypt from 'bcryptjs';
import pool from '../lib/db.js';

export default async function handler(req, res) {
     if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

     const { email, password, stripePaymentId } = req.body;
     if (!email || !password) {
          return res.status(400).json({ status: 'error', message: 'email and password are required' });
     }
     if (password.length < 6) {
          return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters.' });
     }

     try {
          const passwordHash = await bcrypt.hash(password, 10);
          const conn = await pool.getConnection();
          await conn.execute(
               `INSERT INTO subscribers (email, passwordHash, quotaUsed, quotaLimit, stripePaymentId, status)
       VALUES (?, ?, 0, 30, ?, 'active')
       ON DUPLICATE KEY UPDATE
         passwordHash     = VALUES(passwordHash),
         quotaUsed        = 0,
         quotaLimit       = 30,
         stripePaymentId  = VALUES(stripePaymentId),
         status           = 'active',
         subscriptionDate = CURRENT_TIMESTAMP`,
               [email.toLowerCase().trim(), passwordHash, stripePaymentId || null]
          );
          conn.release();
          res.json({ status: 'ok', message: 'Subscriber registered' });
     } catch (error) {
          console.error('register-paid error:', error.message);
          res.status(500).json({ status: 'error', message: error.message });
     }
}
