import pool from '../../lib/db.js';

// GET /api/orders/[userId] — fetch order history for a user
export default async function handler(req, res) {
     if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

     const { userId } = req.query;
     try {
          const conn = await pool.getConnection();
          const [rows] = await conn.execute(
               `SELECT id, userId, items, totalAmount, stripePaymentId, status, createdAt
       FROM orders WHERE userId = ? ORDER BY createdAt DESC`,
               [userId]
          );
          conn.release();

          const orders = rows.map(row => ({
               ...row,
               items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
          }));

          res.json({ status: 'ok', orders });
     } catch (error) {
          console.error('GET /orders error:', error.message);
          res.status(500).json({ status: 'error', message: error.message });
     }
}
