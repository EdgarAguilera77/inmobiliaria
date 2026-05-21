const mysql = require('mysql2/promise'); // Importa la versión que soporta Promises

// Configuración del pool de conexiones a la base de datos
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // Reemplaza con tu usuario de MySQL
  password: '123456', // Reemplaza con tu contraseña de MySQL
  database: 'injupen_db', // Reemplaza con el nombre de tu base de datos
  waitForConnections: true,
  connectionLimit: 10, // Máximo de conexiones en el pool
  queueLimit: 0
});

module.exports = pool; // Exporta el pool de conexiones
