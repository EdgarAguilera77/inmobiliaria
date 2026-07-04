const db = require('../db');

const ensurePropertyPublicationManualSchema = async () => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'propiedades'
       AND COLUMN_NAME = 'ESTADO_PUBLICACION_MANUAL'`
  );

  if (Number(rows?.[0]?.total || 0) > 0) {
    return;
  }

  await db.query(
    `ALTER TABLE propiedades
     ADD COLUMN ESTADO_PUBLICACION_MANUAL ENUM('Borrador', 'Publicada') NULL
     AFTER ESTADO_PUBLICACION`
  );
};

module.exports = ensurePropertyPublicationManualSchema;
