const mysql = require('mysql2');

// Connection pool oluştur (Railway için daha güvenilir)
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.MYSQLDATABASE || 'test',
  port: process.env.MYSQLPORT || process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});

// Promise wrapper
const promisePool = pool.promise();

// Bağlantı testi
pool.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL bağlantı hatası:', err.message);
    return;
  }
  console.log('MySQL veritabanına başarıyla bağlandı');
  connection.release();
});

module.exports = { pool, promisePool }; 