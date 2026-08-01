const db = require('../db');

const ensureLoginSecuritySchema = async () => {
  const [failedAttemptsColumnRows] = await db.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'gestion_usuarios'
        AND COLUMN_NAME = 'INTENTOS_LOGIN_FALLIDOS'
    `
  );

  if (Number(failedAttemptsColumnRows[0]?.total || 0) === 0) {
    await db.query(`
      ALTER TABLE gestion_usuarios
      ADD COLUMN INTENTOS_LOGIN_FALLIDOS INT NOT NULL DEFAULT 0
    `);
  }

  const [blockedUntilColumnRows] = await db.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'gestion_usuarios'
        AND COLUMN_NAME = 'BLOQUEADO_HASTA'
    `
  );

  if (Number(blockedUntilColumnRows[0]?.total || 0) === 0) {
    await db.query(`
      ALTER TABLE gestion_usuarios
      ADD COLUMN BLOQUEADO_HASTA DATETIME NULL DEFAULT NULL
    `);
  }
};

module.exports = ensureLoginSecuritySchema;
