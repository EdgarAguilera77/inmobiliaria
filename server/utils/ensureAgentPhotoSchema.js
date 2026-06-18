const db = require('../db');

const ensureAgentPhotoSchema = async () => {
  const [columnRows] = await db.query(
    `
      SELECT DATA_TYPE AS dataType
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'agentes'
        AND COLUMN_NAME = 'FOTO_URL'
      LIMIT 1
    `
  );

  const currentType = String(columnRows[0]?.dataType || '').toLowerCase();

  if (currentType && currentType !== 'longtext') {
    await db.query(`
      ALTER TABLE agentes
      MODIFY COLUMN FOTO_URL LONGTEXT NULL
    `);
  }
};

module.exports = ensureAgentPhotoSchema;
