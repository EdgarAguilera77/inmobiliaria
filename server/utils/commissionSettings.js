const db = require('../db');
const { DEFAULT_SETTINGS } = require('./ensureCommissionSettingsSchema');

const normalizePercent = (value, fallback) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, numericValue));
};

const getCommissionSettings = async (connection = null) => {
  const executor = connection || db;
  const [rows] = await executor.query(
    `SELECT ID_CONFIGURACION, COMISION_MINIMA, COMISION_MAXIMA,
            COMISION_POR_DEFECTO, PORCENTAJE_AGENTE_POR_DEFECTO
     FROM configuracion_comisiones
     ORDER BY ID_CONFIGURACION ASC
     LIMIT 1`
  );

  if (!rows.length) {
    return {
      id: 1,
      minimumRate: DEFAULT_SETTINGS.COMISION_MINIMA,
      maximumRate: DEFAULT_SETTINGS.COMISION_MAXIMA,
      defaultRate: DEFAULT_SETTINGS.COMISION_POR_DEFECTO,
      defaultAgentRate: DEFAULT_SETTINGS.PORCENTAJE_AGENTE_POR_DEFECTO,
    };
  }

  const row = rows[0];
  const minimumRate = Number(row.COMISION_MINIMA ?? DEFAULT_SETTINGS.COMISION_MINIMA);
  const maximumRate = Number(row.COMISION_MAXIMA ?? DEFAULT_SETTINGS.COMISION_MAXIMA);
  const boundedMinimum = Math.min(minimumRate, maximumRate);
  const boundedMaximum = Math.max(minimumRate, maximumRate);
  const defaultPlatformRate = Math.min(
    boundedMaximum,
    Math.max(
      boundedMinimum,
      Number(
        row.PORCENTAJE_AGENTE_POR_DEFECTO ??
          DEFAULT_SETTINGS.PORCENTAJE_AGENTE_POR_DEFECTO
      )
    )
  );

  return {
    id: row.ID_CONFIGURACION,
    minimumRate: boundedMinimum,
    maximumRate: boundedMaximum,
    defaultRate: Number(row.COMISION_POR_DEFECTO ?? DEFAULT_SETTINGS.COMISION_POR_DEFECTO),
    defaultAgentRate: defaultPlatformRate,
  };
};

const sanitizeCommissionSettings = (payload = {}) => {
  const minimumRate = normalizePercent(
    payload.COMISION_MINIMA,
    DEFAULT_SETTINGS.COMISION_MINIMA
  );
  const maximumRate = normalizePercent(
    payload.COMISION_MAXIMA,
    DEFAULT_SETTINGS.COMISION_MAXIMA
  );
  const boundedMinimum = Math.min(minimumRate, maximumRate);
  const boundedMaximum = Math.max(minimumRate, maximumRate);
  const defaultRate = Math.min(
    boundedMaximum,
    Math.max(
      boundedMinimum,
      normalizePercent(payload.COMISION_POR_DEFECTO, DEFAULT_SETTINGS.COMISION_POR_DEFECTO)
    )
  );
  const defaultAgentRate = normalizePercent(
    payload.PORCENTAJE_AGENTE_POR_DEFECTO,
    DEFAULT_SETTINGS.PORCENTAJE_AGENTE_POR_DEFECTO
  );

  return {
    minimumRate: boundedMinimum,
    maximumRate: boundedMaximum,
    defaultRate,
    defaultAgentRate: Math.min(boundedMaximum, Math.max(boundedMinimum, defaultAgentRate)),
  };
};

module.exports = {
  DEFAULT_SETTINGS,
  getCommissionSettings,
  sanitizeCommissionSettings,
};
