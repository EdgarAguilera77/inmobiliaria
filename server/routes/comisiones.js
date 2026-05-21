const express = require('express');
const router = express.Router();
const db = require('../db');

const commissionsSelect = `
  SELECT
    c.ID_COMISION,
    c.ID_VENTA,
    c.ID_AGENTE,
    c.PORCENTAJE_COMISION,
    c.MONTO_COMISION,
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
  const { ESTADO_COMISION, OBSERVACIONES_PAGO = null, FECHA_PAGO = null } = req.body;

  if (!ESTADO_COMISION) {
    return res.status(400).json({ error: 'El estado de la comision es obligatorio.' });
  }

  const paymentDate = ESTADO_COMISION === 'Pagada' ? FECHA_PAGO || new Date().toISOString().slice(0, 10) : FECHA_PAGO;

  try {
    const [result] = await db.query(
      `UPDATE comisiones
       SET ESTADO_COMISION = ?, FECHA_PAGO = ?, OBSERVACIONES_PAGO = ?
       WHERE ID_COMISION = ?`,
      [ESTADO_COMISION, paymentDate, OBSERVACIONES_PAGO, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Comision no encontrada.' });
    }

    res.status(200).json({ message: 'Estado de comision actualizado con exito.' });
  } catch (error) {
    console.error('Error al actualizar comision:', error);
    res.status(500).json({ error: 'Error al actualizar comision' });
  }
});

module.exports = router;
