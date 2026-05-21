const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalculatePropertyPublicationState } = require('../utils/publication');

const salesSelect = `
  SELECT
    v.ID_VENTA,
    v.ID_PROPIEDAD,
    v.ID_AGENTE,
    v.NOMBRE_CLIENTE,
    v.IDENTIDAD_CLIENTE,
    v.TELEFONO_CLIENTE,
    v.CORREO_CLIENTE,
    v.PRECIO_PUBLICADO,
    v.PRECIO_CIERRE,
    v.TIPO_NEGOCIO,
    v.PORCENTAJE_COMISION,
    v.MONTO_COMISION,
    v.FECHA_CIERRE,
    v.ESTADO_VENTA,
    v.OBSERVACIONES,
    v.USUARIO_CREACION,
    v.FECHA_CREACION,
    v.FECHA_ACTUALIZACION,
    p.TITULO AS PROPIEDAD_TITULO,
    p.SLUG AS PROPIEDAD_SLUG,
    p.ESTADO_COMERCIAL AS PROPIEDAD_ESTADO_COMERCIAL,
    a.NOMBRE AS AGENTE_NOMBRE,
    c.ID_COMISION,
    c.ESTADO_COMISION,
    c.FECHA_PAGO
  FROM ventas_propiedades v
  INNER JOIN propiedades p ON p.ID_PROPIEDAD = v.ID_PROPIEDAD
  INNER JOIN agentes a ON a.ID_AGENTE = v.ID_AGENTE
  LEFT JOIN comisiones c ON c.ID_VENTA = v.ID_VENTA
`;

const getCommercialStatusByOperation = (operation) =>
  operation === 'Renta' ? 'Rentada' : 'Vendida';

const calculateCommissionAmount = (closingPrice, percentage) =>
  Number((Number(closingPrice || 0) * (Number(percentage || 0) / 100)).toFixed(2));

router.get('/', async (req, res) => {
  try {
    const filters = [];
    const values = [];

    if (req.query.agentId) {
      filters.push('v.ID_AGENTE = ?');
      values.push(Number(req.query.agentId));
    }

    if (req.query.estadoVenta) {
      filters.push('v.ESTADO_VENTA = ?');
      values.push(req.query.estadoVenta);
    }

    if (req.query.tipoNegocio) {
      filters.push('v.TIPO_NEGOCIO = ?');
      values.push(req.query.tipoNegocio);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await db.query(`${salesSelect} ${whereClause} ORDER BY v.FECHA_CIERRE DESC, v.ID_VENTA DESC`, values);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`${salesSelect} WHERE v.ID_VENTA = ?`, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({ error: 'Error al obtener venta' });
  }
});

router.post('/', async (req, res) => {
  const {
    ID_PROPIEDAD,
    ID_AGENTE,
    NOMBRE_CLIENTE,
    IDENTIDAD_CLIENTE = null,
    TELEFONO_CLIENTE = null,
    CORREO_CLIENTE = null,
    PRECIO_CIERRE,
    TIPO_NEGOCIO,
    PORCENTAJE_COMISION,
    FECHA_CIERRE,
    OBSERVACIONES = null,
    USUARIO_CREACION = null,
  } = req.body;

  if (!ID_PROPIEDAD || !ID_AGENTE || !NOMBRE_CLIENTE || !PRECIO_CIERRE || !TIPO_NEGOCIO || PORCENTAJE_COMISION === undefined || !FECHA_CIERRE) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para cerrar la venta.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [propertyRows] = await connection.query(
      `SELECT ID_PROPIEDAD, TITULO, PRECIO, OPERACION, ACTIVA, ESTADO_COMERCIAL
       FROM propiedades
       WHERE ID_PROPIEDAD = ?
       FOR UPDATE`,
      [ID_PROPIEDAD]
    );

    if (!propertyRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Propiedad no encontrada.' });
    }

    const property = propertyRows[0];

    if (!property.ACTIVA || property.ESTADO_COMERCIAL !== 'Disponible') {
      await connection.rollback();
      return res.status(409).json({ error: 'La propiedad ya no esta disponible para cerrar un negocio.' });
    }

    const saleOperation = TIPO_NEGOCIO || property.OPERACION;
    const commissionAmount = calculateCommissionAmount(PRECIO_CIERRE, PORCENTAJE_COMISION);
    const propertyCommercialStatus = getCommercialStatusByOperation(saleOperation);

    const [saleResult] = await connection.query(
      `INSERT INTO ventas_propiedades (
        ID_PROPIEDAD, ID_AGENTE, NOMBRE_CLIENTE, IDENTIDAD_CLIENTE, TELEFONO_CLIENTE,
        CORREO_CLIENTE, PRECIO_PUBLICADO, PRECIO_CIERRE, TIPO_NEGOCIO,
        PORCENTAJE_COMISION, MONTO_COMISION, FECHA_CIERRE, ESTADO_VENTA,
        OBSERVACIONES, USUARIO_CREACION
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Cerrada', ?, ?)`,
      [
        ID_PROPIEDAD,
        ID_AGENTE,
        NOMBRE_CLIENTE.trim(),
        IDENTIDAD_CLIENTE,
        TELEFONO_CLIENTE,
        CORREO_CLIENTE,
        property.PRECIO,
        PRECIO_CIERRE,
        saleOperation,
        PORCENTAJE_COMISION,
        commissionAmount,
        FECHA_CIERRE,
        OBSERVACIONES,
        USUARIO_CREACION,
      ]
    );

    await connection.query(
      `INSERT INTO comisiones (
        ID_VENTA, ID_AGENTE, PORCENTAJE_COMISION, MONTO_COMISION, ESTADO_COMISION
      ) VALUES (?, ?, ?, ?, 'Pendiente')`,
      [saleResult.insertId, ID_AGENTE, PORCENTAJE_COMISION, commissionAmount]
    );

    await connection.query(
      `UPDATE propiedades
       SET ACTIVA = 0,
           DESTACADA = 0,
           ESTADO_COMERCIAL = ?,
           ESTADO_PUBLICACION = 'Pausada'
       WHERE ID_PROPIEDAD = ?`,
      [propertyCommercialStatus, ID_PROPIEDAD]
    );

    await connection.commit();
    res.status(201).json({
      message: 'Venta registrada con exito',
      id: saleResult.insertId,
      montoComision: commissionAmount,
      estadoPropiedad: propertyCommercialStatus,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar venta:', error);
    res.status(500).json({ error: 'Error al registrar venta' });
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res) => {
  const {
    ID_AGENTE,
    NOMBRE_CLIENTE,
    IDENTIDAD_CLIENTE = null,
    TELEFONO_CLIENTE = null,
    CORREO_CLIENTE = null,
    PRECIO_CIERRE,
    TIPO_NEGOCIO,
    PORCENTAJE_COMISION,
    FECHA_CIERRE,
    ESTADO_VENTA = 'Cerrada',
    OBSERVACIONES = null,
  } = req.body;

  if (!ID_AGENTE || !NOMBRE_CLIENTE || !PRECIO_CIERRE || !TIPO_NEGOCIO || PORCENTAJE_COMISION === undefined || !FECHA_CIERRE) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para actualizar la venta.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [salesRows] = await connection.query(
      `SELECT ID_VENTA, ID_PROPIEDAD, PRECIO_PUBLICADO
       FROM ventas_propiedades
       WHERE ID_VENTA = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (!salesRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Venta no encontrada.' });
    }

    const sale = salesRows[0];
    const commissionAmount = calculateCommissionAmount(PRECIO_CIERRE, PORCENTAJE_COMISION);
    const propertyCommercialStatus =
      ESTADO_VENTA === 'Anulada' ? 'Disponible' : getCommercialStatusByOperation(TIPO_NEGOCIO);

    await connection.query(
      `UPDATE ventas_propiedades
       SET ID_AGENTE = ?, NOMBRE_CLIENTE = ?, IDENTIDAD_CLIENTE = ?, TELEFONO_CLIENTE = ?,
           CORREO_CLIENTE = ?, PRECIO_CIERRE = ?, TIPO_NEGOCIO = ?, PORCENTAJE_COMISION = ?,
           MONTO_COMISION = ?, FECHA_CIERRE = ?, ESTADO_VENTA = ?, OBSERVACIONES = ?
       WHERE ID_VENTA = ?`,
      [
        ID_AGENTE,
        NOMBRE_CLIENTE.trim(),
        IDENTIDAD_CLIENTE,
        TELEFONO_CLIENTE,
        CORREO_CLIENTE,
        PRECIO_CIERRE,
        TIPO_NEGOCIO,
        PORCENTAJE_COMISION,
        commissionAmount,
        FECHA_CIERRE,
        ESTADO_VENTA,
        OBSERVACIONES,
        req.params.id,
      ]
    );

    await connection.query(
      `UPDATE comisiones
       SET ID_AGENTE = ?, PORCENTAJE_COMISION = ?, MONTO_COMISION = ?
       WHERE ID_VENTA = ?`,
      [ID_AGENTE, PORCENTAJE_COMISION, commissionAmount, req.params.id]
    );

    await connection.query(
      `UPDATE propiedades
       SET ACTIVA = ?, ESTADO_COMERCIAL = ?, DESTACADA = CASE WHEN ? = 'Disponible' THEN DESTACADA ELSE 0 END
       WHERE ID_PROPIEDAD = ?`,
      [propertyCommercialStatus === 'Disponible' ? 1 : 0, propertyCommercialStatus, propertyCommercialStatus, sale.ID_PROPIEDAD]
    );

    await recalculatePropertyPublicationState(sale.ID_PROPIEDAD, connection);

    await connection.commit();
    res.status(200).json({ message: 'Venta actualizada con exito', montoComision: commissionAmount });
  } catch (error) {
    await connection.rollback();
    console.error('Error al actualizar venta:', error);
    res.status(500).json({ error: 'Error al actualizar venta' });
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [salesRows] = await connection.query(
      `SELECT ID_VENTA, ID_PROPIEDAD
       FROM ventas_propiedades
       WHERE ID_VENTA = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (!salesRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Venta no encontrada.' });
    }

    const sale = salesRows[0];

    await connection.query('DELETE FROM comisiones WHERE ID_VENTA = ?', [req.params.id]);
    await connection.query('DELETE FROM ventas_propiedades WHERE ID_VENTA = ?', [req.params.id]);
    await connection.query(
      `UPDATE propiedades
       SET ACTIVA = 1, ESTADO_COMERCIAL = 'Disponible'
       WHERE ID_PROPIEDAD = ?`,
      [sale.ID_PROPIEDAD]
    );

    await recalculatePropertyPublicationState(sale.ID_PROPIEDAD, connection);

    await connection.commit();
    res.status(200).json({ message: 'Venta eliminada con exito y propiedad reactivada.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar venta:', error);
    res.status(500).json({ error: 'Error al eliminar venta' });
  } finally {
    connection.release();
  }
});

module.exports = router;
