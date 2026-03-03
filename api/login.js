import bcrypt from 'bcryptjs';
import pool from '../lib/db.js';

export default async function handler(req, res) {
     if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

     const { email, password } = req.body;
     if (!email || !password) {
          return res.status(400).json({ status: 'error', message: 'email and password are required' });
     }

     try {
          const conn = await pool.getConnection();
          const [rows] = await conn.execute(
               'SELECT * FROM subscribers WHERE email = ? LIMIT 1',
               [email.toLowerCase().trim()]
          );
          conn.release();

          if (rows.length === 0) {
               return res.status(401).json({ status: 'error', message: 'No account found for this email.' });
          }
          const user = rows[0];
          if (user.status !== 'active') {
               return res.status(403).json({ status: 'error', message: 'Subscription is not active.' });
          }
          const match = await bcrypt.compare(password, user.passwordHash);
          if (!match) {
               return res.status(401).json({ status: 'error', message: 'Incorrect password.' });
          }

          res.json({
               status: 'ok',
               email: user.email,
               quotaUsed: user.quotaUsed,
               quotaLimit: user.quotaLimit,
               subscriptionDate: user.subscriptionDate,
          });
     } catch (error) {
          console.error('login error:', error.message);
          res.status(500).json({ status: 'error', message: error.message });
     }
}
