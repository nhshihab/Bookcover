// Shared MySQL pool — imported by every API route
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
     host: process.env.DB_HOST,
     user: process.env.DB_USER,
     password: process.env.DB_PASS,
     database: process.env.DB_NAME,
     waitForConnections: true,
     connectionLimit: 10,
     queueLimit: 0,
});

/**
 * Ensures all required tables exist.
 * Call once at app cold-start; safe to call repeatedly (IF NOT EXISTS).
 */
export async function ensureAllTables() {
     const tables = [
          {
               name: 'payments',
               sql: `CREATE TABLE IF NOT EXISTS payments (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        paymentIntentId VARCHAR(255) NOT NULL UNIQUE,
        amount          INT NOT NULL,
        currency        VARCHAR(10)  NOT NULL,
        customerEmail   VARCHAR(255) NOT NULL,
        status          VARCHAR(50)  NOT NULL DEFAULT 'requires_payment_method',
        createdAt       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )`,
          },
          {
               name: 'orders',
               sql: `CREATE TABLE IF NOT EXISTS orders (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        userId          VARCHAR(255) NOT NULL,
        items           JSON         NOT NULL,
        totalAmount     DECIMAL(10,2) NOT NULL,
        stripePaymentId VARCHAR(255) DEFAULT NULL,
        status          VARCHAR(50)  NOT NULL DEFAULT 'pending',
        createdAt       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )`,
          },
          {
               name: 'free',
               sql: `CREATE TABLE IF NOT EXISTS free (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        userId       VARCHAR(255) NOT NULL,
        email        VARCHAR(255) NOT NULL UNIQUE,
        displayName  VARCHAR(255) DEFAULT NULL,
        photoURL     TEXT         DEFAULT NULL,
        creditsUsed  INT          NOT NULL DEFAULT 0,
        syncedAt     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
          },
          {
               name: 'subscribers',
               sql: `CREATE TABLE IF NOT EXISTS subscribers (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        email            VARCHAR(255) NOT NULL UNIQUE,
        passwordHash     VARCHAR(255) NOT NULL,
        quotaUsed        INT          NOT NULL DEFAULT 0,
        quotaLimit       INT          NOT NULL DEFAULT 30,
        subscriptionDate TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        stripePaymentId  VARCHAR(255) DEFAULT NULL,
        status           VARCHAR(50)  NOT NULL DEFAULT 'active'
      )`,
          },
     ];

     const conn = await pool.getConnection();
     for (const t of tables) {
          try {
               await conn.query(t.sql);
          } catch (err) {
               console.error(`Failed to create table "${t.name}":`, err.message);
          }
     }
     conn.release();
}

export default pool;
