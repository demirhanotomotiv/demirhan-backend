const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'test',
  port: process.env.MYSQL_PORT || 3306
});

// Bağlantı hata yönetimi
connection.connect((err) => {
  if (err) {
    console.error('MySQL bağlantı hatası:', err.message);
    return;
  }
  console.log('MySQL veritabanına başarıyla bağlandı');
});

connection.on('error', (err) => {
  console.error('MySQL bağlantı hatası:', err.message);
});

module.exports = connection; 