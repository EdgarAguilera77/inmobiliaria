const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalculatePropertyPublicationState, syncExpiredSubscriptions } = require('../utils/publication');

const paymentSelect = `
  SELECT
    ps.ID_PAGO,
    ps.ID_SUSCRIPCION,
    ps.MONTO,
    ps.METODO_PAGO,
    ps.REFERENCIA_PAGO,
    ps.ESTADO_PAGO,
    ps.FECHA_PAGO,
    ps.OBSERVACIONES,
    ps.FECHA_CREACION,
    ps.FECHA_ACTUALIZACION,
    s.ID_PROPIEDAD,
    s.ID_PLAN,
    s.ESTADO_SUSCRIPCION,
    p.TITULO AS PROPIEDAD_TITULO,
    pl.NOMBRE AS PLAN_NOMBRE
  FROM pagos_suscripcion ps
  INNER JOIN suscripciones_publicacion s ON s.ID_SUSCRIPCION = ps.ID_SUSCRIPCION
  INNER JOIN propiedades p ON p.ID_PROPIEDAD = s.ID_PROPIEDAD
  INNER JOIN planes_publicacion pl ON pl.ID_PLAN = s.ID_PLAN
`;

const resolveSubscriptionStatusFromPayment = (paymentStatus, endDate) => {
  if (paymentStatus !== 'Pagado') {
    return 'Pendiente de pago';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const finish = new Date(endDate);
  finish.setHours(0, 0, 0, 0);

  return finish < today ? 'Vencida' : 'Activa';
};

const recalculateSubscriptionStatus = async (connection, subscriptionId, endDate) => {
  const [[summary]] = await connection.query(
    `SELECT
        SUM(CASE WHEN ESTADO_PAGO = 'Pagado' THEN 1 ELSE 0 END) AS PAGADOS,
        SUM(CASE WHEN ESTADO_PAGO = 'Pendiente' THEN 1 ELSE 0 END) AS PENDIENTES
     FROM pagos_suscripcion
     WHERE ID_SUSCRIPCION = ?`,
    [subscriptionId]
  );

  const paidCount = Number(summary?.PAGADOS || 0);
  const pendingCount = Number(summary?.PENDIENTES || 0);

  let nextStatus = 'Pendiente de pago';
  if (paidCount > 0) {
    nextStatus = resolveSubscriptionStatusFromPayment('Pagado', endDate);
  } else if (pendingCount > 0) {
    nextStatus = 'Pendiente de pago';
  }

  await connection.query(
    `UPDATE suscripciones_publicacion
     SET ESTADO_SUSCRIPCION = ?
     WHERE ID_SUSCRIPCION = ?`,
    [nextStatus, subscriptionId]
  );
};

router.get('/', async (req, res) => {
  try {
    await syncExpiredSubscriptions();

    const filters = [];
    const values = [];

    if (req.query.subscriptionId) {
      filters.push('ps.ID_SUSCRIPCION = ?');
      values.push(Number(req.query.subscriptionId));
    }

    if (req.query.estado) {
      filters.push('ps.ESTADO_PAGO = ?');
      values.push(req.query.estado);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await db.query(
      `${paymentSelect}
       ${whereClause}
       ORDER BY COALESCE(ps.FECHA_PAGO, DATE(ps.FECHA_CREACION)) DESC, ps.ID_PAGO DESC`,
      values
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener pagos de publicacion:', error);
    res.status(500).json({ error: 'Error al obtener pagos de publicacion' });
  }
});

router.post('/', async (req, res) => {
  const {
    ID_SUSCRIPCION,
    MONTO,
    METODO_PAGO = 'Transferencia',
    REFERENCIA_PAGO = null,
    ESTADO_PAGO = 'Pendiente',
    FECHA_PAGO = null,
    OBSERVACIONES = null,
  } = req.body;

  if (!ID_SUSCRIPCION || MONTO === undefined) {
    return res.status(400).json({ error: 'La suscripcion y el monto son obligatorios.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await syncExpiredSubscriptions(connection);

    const [[subscription]] = await connection.query(
      `SELECT ID_SUSCRIPCION, ID_PROPIEDAD, FECHA_FIN
       FROM suscripciones_publicacion
       WHERE ID_SUSCRIPCION = ?
       FOR UPDATE`,
      [ID_SUSCRIPCION]
    );

    if (!subscription) {
      await connection.rollback();
      return res.status(404).json({ error: 'Suscripcion no encontrada.' });
    }

    const [result] = await connection.query(
      `INSERT INTO pagos_suscripcion (
        ID_SUSCRIPCION, MONTO, METODO_PAGO, REFERENCIA_PAGO, ESTADO_PAGO, FECHA_PAGO, OBSERVACIONES
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(ID_SUSCRIPCION),
        Number(MONTO) || 0,
        METODO_PAGO,
        REFERENCIA_PAGO,
        ESTADO_PAGO,
        FECHA_PAGO,
        OBSERVACIONES,
      ]
    );

    await recalculateSubscriptionStatus(connection, ID_SUSCRIPCION, subscription.FECHA_FIN);

    await recalculatePropertyPublicationState(subscription.ID_PROPIEDAD, connection);

    await connection.commit();
    res.status(201).json({ message: 'Pago registrado con exito', id: result.insertId });
  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar pago de publicacion:', error);
    res.status(500).json({ error: 'Error al registrar pago de publicacion' });
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res) => {
  const {
    MONTO,
    METODO_PAGO = 'Transferencia',
    REFERENCIA_PAGO = null,
    ESTADO_PAGO = 'Pendiente',
    FECHA_PAGO = null,
    OBSERVACIONES = null,
  } = req.body;

  if (MONTO === undefined) {
    return res.status(400).json({ error: 'El monto del pago es obligatorio.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await syncExpiredSubscriptions(connection);

    const [[payment]] = await connection.query(
      `SELECT ps.ID_PAGO, ps.ID_SUSCRIPCION, s.ID_PROPIEDAD, s.FECHA_FIN
       FROM pagos_suscripcion ps
       INNER JOIN suscripciones_publicacion s ON s.ID_SUSCRIPCION = ps.ID_SUSCRIPCION
       WHERE ps.ID_PAGO = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (!payment) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    await connection.query(
      `UPDATE pagos_suscripcion
       SET MONTO = ?, METODO_PAGO = ?, REFERENCIA_PAGO = ?, ESTADO_PAGO = ?, FECHA_PAGO = ?, OBSERVACIONES = ?
       WHERE ID_PAGO = ?`,
      [
        Number(MONTO) || 0,
        METODO_PAGO,
        REFERENCIA_PAGO,
        ESTADO_PAGO,
        FECHA_PAGO,
        OBSERVACIONES,
        req.params.id,
      ]
    );

    await recalculateSubscriptionStatus(connection, payment.ID_SUSCRIPCION, payment.FECHA_FIN);

    await recalculatePropertyPublicationState(payment.ID_PROPIEDAD, connection);

    await connection.commit();
    res.status(200).json({ message: 'Pago actualizado con exito' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al actualizar pago de publicacion:', error);
    res.status(500).json({ error: 'Error al actualizar pago de publicacion' });
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [[payment]] = await connection.query(
      `SELECT ps.ID_PAGO, ps.ID_SUSCRIPCION, s.ID_PROPIEDAD, s.FECHA_FIN
       FROM pagos_suscripcion ps
       INNER JOIN suscripciones_publicacion s ON s.ID_SUSCRIPCION = ps.ID_SUSCRIPCION
       WHERE ps.ID_PAGO = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (!payment) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    await connection.query('DELETE FROM pagos_suscripcion WHERE ID_PAGO = ?', [req.params.id]);
    await recalculateSubscriptionStatus(connection, payment.ID_SUSCRIPCION, payment.FECHA_FIN);
    await recalculatePropertyPublicationState(payment.ID_PROPIEDAD, connection);

    await connection.commit();
    res.status(200).json({ message: 'Pago eliminado con exito' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar pago de publicacion:', error);
    res.status(500).json({ error: 'Error al eliminar pago de publicacion' });
  } finally {
    connection.release();
  }
});

module.exports = router;
