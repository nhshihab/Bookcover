import pool, { ensureAllTables } from '../lib/db.js';

let tablesReady = false;

export default async function handler(req, res) {
     if (!tablesReady) { await ensureAllTables(); tablesReady = true; }

     try {
          const conn = await pool.getConnection();
          await conn.ping();
          conn.release();
          res.json({ status: 'ok', message: 'Database connection successful', db: process.env.DB_NAME });
     } catch (error) {
          res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
     }
}
