const db = require('../db');

const ensureColumn = async (tableName, columnName, definition) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (Number(rows?.[0]?.total || 0) > 0) {
    return;
  }

  await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
};

const ensureCommissionSplitSchema = async () => {
  await ensureColumn(
    'comisiones',
    'PORCENTAJE_AGENTE',
    "DECIMAL(6,2) NOT NULL DEFAULT 95.00 AFTER MONTO_COMISION"
  );
  await ensureColumn(
    'comisiones',
    'MONTO_AGENTE',
    "DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER PORCENTAJE_AGENTE"
  );
  await ensureColumn(
    'comisiones',
    'PORCENTAJE_PROPIETARIO',
    "DECIMAL(6,2) NOT NULL DEFAULT 5.00 AFTER MONTO_AGENTE"
  );
  await ensureColumn(
    'comisiones',
    'MONTO_PROPIETARIO',
    "DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER PORCENTAJE_PROPIETARIO"
  );

  await db.query(
    `UPDATE comisiones
     SET
       PORCENTAJE_PROPIETARIO = COALESCE(NULLIF(PORCENTAJE_PROPIETARIO, 0), 5),
       PORCENTAJE_AGENTE = CASE
         WHEN COALESCE(PORCENTAJE_PROPIETARIO, 5) > 100 THEN 0
         ELSE 100 - COALESCE(NULLIF(PORCENTAJE_PROPIETARIO, 0), 5)
       END,
       MONTO_PROPIETARIO = ROUND(
         MONTO_COMISION * (COALESCE(NULLIF(PORCENTAJE_PROPIETARIO, 0), 5) / 100),
         2
       ),
       MONTO_AGENTE = ROUND(
         MONTO_COMISION -
         ROUND(MONTO_COMISION * (COALESCE(NULLIF(PORCENTAJE_PROPIETARIO, 0), 5) / 100), 2),
         2
       )`
  );
};

module.exports = ensureCommissionSplitSchema;
