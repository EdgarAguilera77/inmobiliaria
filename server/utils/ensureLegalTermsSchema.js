const db = require('../db');

const ensureLegalTermsSchema = async () => {
  const [columnRows] = await db.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'gestion_usuarios'
        AND COLUMN_NAME = 'REQUIERE_ACEPTACION_TERMINOS'
    `
  );

  if (Number(columnRows[0]?.total || 0) === 0) {
    await db.query(`
      ALTER TABLE gestion_usuarios
      ADD COLUMN REQUIERE_ACEPTACION_TERMINOS TINYINT(1) NOT NULL DEFAULT 0
    `);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS aceptaciones_terminos (
      ID_ACEPTACION INT AUTO_INCREMENT PRIMARY KEY,
      CODIGO_USUARIO INT NOT NULL,
      VERSION_TERMINOS VARCHAR(20) NOT NULL,
      TITULO_TERMINOS VARCHAR(255) NOT NULL,
      TEXTO_ACEPTADO LONGTEXT NOT NULL,
      TIPO_ACEPTACION VARCHAR(60) NOT NULL DEFAULT 'PRIMER_INGRESO',
      FECHA_ACEPTACION DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (CODIGO_USUARIO) REFERENCES gestion_usuarios(CODIGO)
    )
  `);
};

module.exports = ensureLegalTermsSchema;
