const express = require('express');
const router = express.Router();
const db = require('../db');
const { getCommissionSettings, sanitizeCommissionSettings } = require('../utils/commissionSettings');

const commissionsSelect = `
  SELECT
    c.ID_COMISION,
    c.ID_VENTA,
    c.ID_AGENTE,
    c.PORCENTAJE_COMISION,
    c.MONTO_COMISION,
    c.PORCENTAJE_AGENTE,
    c.MONTO_AGENTE,
    c.PORCENTAJE_PROPIETARIO,
    c.MONTO_PROPIETARIO,
    c.ESTADO_COMISION,
    c.FECHA_GENERACION,
    c.FECHA_PAGO,
    c.OBSERVACIONES_PAGO,
    v.ID_PROPIEDAD,
    v.NOMBRE_CLIENTE,
    v.PRECIO_CIERRE,
    v.TIPO_NEGOCIO,
    v.FECHA_CIERRE,
    p.TITULO AS PROPIEDAD_TITULO,
    p.SLUG AS PROPIEDAD_SLUG,
    a.NOMBRE AS AGENTE_NOMBRE
  FROM comisiones c
  INNER JOIN ventas_propiedades v ON v.ID_VENTA = c.ID_VENTA
  INNER JOIN propiedades p ON p.ID_PROPIEDAD = v.ID_PROPIEDAD
  INNER JOIN agentes a ON a.ID_AGENTE = c.ID_AGENTE
`;

const normalizePercentage = (value, fallback) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, numericValue));
};

router.get('/', async (req, res) => {
  try {
    const filters = [];
    const values = [];

    if (req.query.agentId) {
      filters.push('c.ID_AGENTE = ?');
      values.push(Number(req.query.agentId));
    }

    if (req.query.estadoComision) {
      filters.push('c.ESTADO_COMISION = ?');
      values.push(req.query.estadoComision);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await db.query(
      `${commissionsSelect} ${whereClause} ORDER BY c.FECHA_GENERACION DESC, c.ID_COMISION DESC`,
      values
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener comisiones:', error);
    res.status(500).json({ error: 'Error al obtener comisiones' });
  }
});

router.get('/configuracion', async (req, res) => {
  try {
    const settings = await getCommissionSettings();
    res.status(200).json({
      ID_CONFIGURACION: settings.id,
      COMISION_MINIMA: settings.minimumRate,
      COMISION_MAXIMA: settings.maximumRate,
      COMISION_POR_DEFECTO: settings.defaultRate,
      PORCENTAJE_AGENTE_POR_DEFECTO: settings.defaultAgentRate,
    });
  } catch (error) {
    console.error('Error al obtener configuracion de comisiones:', error);
    res.status(500).json({ error: 'Error al obtener configuracion de comisiones' });
  }
});

router.put('/configuracion', async (req, res) => {
  try {
    const settings = sanitizeCommissionSettings(req.body);
    const currentSettings = await getCommissionSettings();

    await db.query(
      `UPDATE configuracion_comisiones
       SET COMISION_MINIMA = ?, COMISION_MAXIMA = ?, COMISION_POR_DEFECTO = ?,
           PORCENTAJE_AGENTE_POR_DEFECTO = ?
       WHERE ID_CONFIGURACION = ?`,
      [
        settings.minimumRate,
        settings.maximumRate,
        settings.defaultRate,
        settings.defaultAgentRate,
        currentSettings.id,
      ]
    );

    res.status(200).json({ message: 'Configuracion de comisiones actualizada con exito.' });
  } catch (error) {
    console.error('Error al actualizar configuracion de comisiones:', error);
    res.status(500).json({ error: 'Error al actualizar configuracion de comisiones' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`${commissionsSelect} WHERE c.ID_COMISION = ?`, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Comision no encontrada' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error al obtener comision:', error);
    res.status(500).json({ error: 'Error al obtener comision' });
  }
});

router.patch('/:id/estado', async (req, res) => {
  const {
    ESTADO_COMISION,
    OBSERVACIONES_PAGO = null,
    FECHA_PAGO = null,
    PORCENTAJE_PAGINA = null,
  } = req.body;

  if (!ESTADO_COMISION) {
    return res.status(400).json({ error: 'El estado de la comision es obligatorio.' });
  }

  const paymentDate = ESTADO_COMISION === 'Pagada' ? FECHA_PAGO || new Date().toISOString().slice(0, 10) : FECHA_PAGO;

  try {
    const [rows] = await db.query(
      `SELECT ID_COMISION, MONTO_COMISION, PORCENTAJE_PROPIETARIO
       FROM comisiones
       WHERE ID_COMISION = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Comision no encontrada.' });
    }

    const currentCommission = rows[0];
    const commissionSettings = await getCommissionSettings();
    const requestedPlatformRate = PORCENTAJE_PAGINA === null ? null : Number(PORCENTAJE_PAGINA);
    const normalizedPlatformRate =
      requestedPlatformRate === null || Number.isNaN(requestedPlatformRate)
        ? Number(currentCommission.PORCENTAJE_PROPIETARIO || commissionSettings.defaultAgentRate)
        : Math.min(
            commissionSettings.maximumRate,
            Math.max(commissionSettings.minimumRate, normalizePercentage(requestedPlatformRate, commissionSettings.defaultAgentRate))
          );
    const grossCommissionAmount = Number(currentCommission.MONTO_COMISION || 0);
    const platformAmount = Number(
      (grossCommissionAmount * (normalizedPlatformRate / 100)).toFixed(2)
    );
    const agentNetRate = Number((100 - normalizedPlatformRate).toFixed(2));
    const agentNetAmount = Number((grossCommissionAmount - platformAmount).toFixed(2));

    const [result] = await db.query(
      `UPDATE comisiones
       SET ESTADO_COMISION = ?, FECHA_PAGO = ?, OBSERVACIONES_PAGO = ?,
           PORCENTAJE_PROPIETARIO = ?, MONTO_PROPIETARIO = ?,
           PORCENTAJE_AGENTE = ?, MONTO_AGENTE = ?
       WHERE ID_COMISION = ?`,
      [
        ESTADO_COMISION,
        paymentDate,
        OBSERVACIONES_PAGO,
        normalizedPlatformRate,
        platformAmount,
        agentNetRate,
        agentNetAmount,
        req.params.id,
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Comision no encontrada.' });
    }

    res.status(200).json({
      message: 'Comision actualizada con exito.',
      porcentajePagina: normalizedPlatformRate,
      montoPagina: platformAmount,
      porcentajeAgenteNeto: agentNetRate,
      montoAgenteNeto: agentNetAmount,
    });
  } catch (error) {
    console.error('Error al actualizar comision:', error);
    res.status(500).json({ error: 'Error al actualizar comision' });
  }
});

module.exports = router;
