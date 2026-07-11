const db = require('../db');

const ensurePropertyDetailsSchema = async () => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'propiedades'
       AND COLUMN_NAME = 'DETALLES_JSON'`
  );

  if (Number(rows?.[0]?.total || 0) > 0) {
    return;
  }

  await db.query(
    `ALTER TABLE propiedades
     ADD COLUMN DETALLES_JSON LONGTEXT NULL
     AFTER DESCRIPCION`
  );
};

module.exports = ensurePropertyDetailsSchema;
