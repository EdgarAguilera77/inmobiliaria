const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalculatePropertyPublicationState, syncExpiredSubscriptions } = require('../utils/publication');

const getSqlErrorMessage = (error, fallbackMessage) => {
  if (!error || !error.code) {
    return fallbackMessage;
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return 'La propiedad, el plan o el agente seleccionado no existe en la base de datos.';
  }

  if (error.code === 'ER_BAD_NULL_ERROR') {
    return 'Faltan datos obligatorios para guardar la suscripcion.';
  }

  return fallbackMessage;
};

const subscriptionSelect = `
  SELECT
    s.ID_SUSCRIPCION,
    s.ID_PROPIEDAD,
    s.ID_PLAN,
    s.ID_AGENTE,
    s.PRECIO_PLAN,
    s.PRECIO_FINAL,
    s.FECHA_INICIO,
    s.FECHA_FIN,
    s.ESTADO_SUSCRIPCION,
    s.AUTO_RENOVAR,
    s.OBSERVACIONES,
    s.FECHA_CREACION,
    s.FECHA_ACTUALIZACION,
    p.TITULO AS PROPIEDAD_TITULO,
    p.SLUG AS PROPIEDAD_SLUG,
    p.ESTADO_PUBLICACION AS PROPIEDAD_ESTADO_PUBLICACION,
    pl.NOMBRE AS PLAN_NOMBRE,
    pl.DURACION_DIAS,
    pl.LIMITE_IMAGENES,
    pl.ADMITE_DESTACADA,
    pl.NIVEL_PRIORIDAD,
    a.NOMBRE AS AGENTE_NOMBRE,
    COALESCE(SUM(CASE WHEN ps.ESTADO_PAGO = 'Pagado' THEN ps.MONTO ELSE 0 END), 0) AS TOTAL_PAGADO,
    COUNT(ps.ID_PAGO) AS TOTAL_PAGOS
  FROM suscripciones_publicacion s
  INNER JOIN propiedades p ON p.ID_PROPIEDAD = s.ID_PROPIEDAD
  INNER JOIN planes_publicacion pl ON pl.ID_PLAN = s.ID_PLAN
  LEFT JOIN agentes a ON a.ID_AGENTE = s.ID_AGENTE
  LEFT JOIN pagos_suscripcion ps ON ps.ID_SUSCRIPCION = s.ID_SUSCRIPCION
`;

const parseDate = (value) => {
  const normalized = value ? new Date(value) : new Date();
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const formatDate = (date) => date.toISOString().slice(0, 10);

const addDays = (dateValue, daysToAdd) => {
  const nextDate = parseDate(dateValue);
  nextDate.setDate(nextDate.getDate() + Number(daysToAdd || 0));
  return nextDate;
};

const calculateSubscriptionDates = (startDateValue, durationDays) => {
  const startDate = parseDate(startDateValue || new Date());
  const endDate = addDays(startDate, durationDays);
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

const resolveActiveStatus = (requestedStatus, endDate) => {
  if (requestedStatus === 'Cancelada') {
    return 'Cancelada';
  }

  if (requestedStatus === 'Pendiente de pago') {
    return 'Pendiente de pago';
  }

  return parseDate(endDate) < parseDate(new Date()) ? 'Vencida' : 'Activa';
};

router.get('/', async (req, res) => {
  try {
    await syncExpiredSubscriptions();

    const filters = [];
    const values = [];

    if (req.query.propertyId) {
      filters.push('s.ID_PROPIEDAD = ?');
      values.push(Number(req.query.propertyId));
    }

    if (req.query.planId) {
      filters.push('s.ID_PLAN = ?');
      values.push(Number(req.query.planId));
    }

    if (req.query.estado) {
      filters.push('s.ESTADO_SUSCRIPCION = ?');
      values.push(req.query.estado);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await db.query(
      `${subscriptionSelect}
       ${whereClause}
       GROUP BY
         s.ID_SUSCRIPCION, s.ID_PROPIEDAD, s.ID_PLAN, s.ID_AGENTE, s.PRECIO_PLAN, s.PRECIO_FINAL,
         s.FECHA_INICIO, s.FECHA_FIN, s.ESTADO_SUSCRIPCION, s.AUTO_RENOVAR, s.OBSERVACIONES,
         s.FECHA_CREACION, s.FECHA_ACTUALIZACION,
         p.TITULO, p.SLUG, p.ESTADO_PUBLICACION,
         pl.NOMBRE, pl.DURACION_DIAS, pl.LIMITE_IMAGENES, pl.ADMITE_DESTACADA, pl.NIVEL_PRIORIDAD,
         a.NOMBRE
       ORDER BY s.FECHA_FIN DESC, s.ID_SUSCRIPCION DESC`,
      values
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

router.post('/', async (req, res) => {
  const {
    ID_PROPIEDAD,
    ID_PLAN,
    ID_AGENTE = null,
    PRECIO_FINAL = null,
    FECHA_INICIO,
    FECHA_FIN = null,
    ESTADO_SUSCRIPCION = 'Pendiente de pago',
    AUTO_RENOVAR = 0,
    OBSERVACIONES = null,
  } = req.body;

  if (!ID_PROPIEDAD || !ID_PLAN) {
    return res.status(400).json({ error: 'La propiedad y el plan son obligatorios.' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    await syncExpiredSubscriptions(connection);

    const [[property]] = await connection.query(
      `SELECT ID_PROPIEDAD, ACTIVA, ESTADO_COMERCIAL
       FROM propiedades
       WHERE ID_PROPIEDAD = ?`,
      [ID_PROPIEDAD]
    );

    if (!property) {
      await connection.rollback();
      return res.status(404).json({ error: 'Propiedad no encontrada.' });
    }

    if (!property.ACTIVA || property.ESTADO_COMERCIAL !== 'Disponible') {
      await connection.rollback();
      return res.status(409).json({
        error: 'La propiedad debe estar activa y disponible para asignarle una suscripcion.',
      });
    }

    const [[plan]] = await connection.query(
      `SELECT ID_PLAN, PRECIO, DURACION_DIAS, ESTADO
       FROM planes_publicacion
       WHERE ID_PLAN = ?`,
      [ID_PLAN]
    );

    if (!plan) {
      await connection.rollback();
      return res.status(404).json({ error: 'Plan no encontrado.' });
    }

    if (!plan.ESTADO) {
      await connection.rollback();
      return res.status(409).json({ error: 'El plan seleccionado esta inactivo.' });
    }

    const { startDate, endDate } = calculateSubscriptionDates(FECHA_INICIO, plan.DURACION_DIAS);
    const finalStatus = ESTADO_SUSCRIPCION === 'Cancelada'
      ? 'Cancelada'
      : 'Pendiente de pago';

    await connection.query(
      `UPDATE suscripciones_publicacion
       SET ESTADO_SUSCRIPCION = 'Cancelada'
       WHERE ID_PROPIEDAD = ?
         AND ESTADO_SUSCRIPCION IN ('Pendiente de pago', 'Activa')`,
      [ID_PROPIEDAD]
    );

    const [result] = await connection.query(
      `INSERT INTO suscripciones_publicacion (
        ID_PROPIEDAD, ID_PLAN, ID_AGENTE, PRECIO_PLAN, PRECIO_FINAL, FECHA_INICIO, FECHA_FIN,
        ESTADO_SUSCRIPCION, AUTO_RENOVAR, OBSERVACIONES
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(ID_PROPIEDAD),
        Number(ID_PLAN),
        ID_AGENTE ? Number(ID_AGENTE) : null,
        Number(plan.PRECIO) || 0,
        Number(plan.PRECIO) || 0,
        startDate,
        endDate,
        finalStatus,
        AUTO_RENOVAR ? 1 : 0,
        OBSERVACIONES,
      ]
    );

    await recalculatePropertyPublicationState(Number(ID_PROPIEDAD), connection);

    await connection.commit();
    res.status(201).json({ message: 'Suscripcion creada con exito', id: result.insertId });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error al crear suscripcion:', error);
    res.status(500).json({ error: getSqlErrorMessage(error, 'Error al crear suscripcion') });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.put('/:id', async (req, res) => {
  const {
    ID_PLAN,
    ID_AGENTE = null,
    PRECIO_FINAL = null,
    FECHA_INICIO,
    FECHA_FIN = null,
    ESTADO_SUSCRIPCION = 'Pendiente de pago',
    AUTO_RENOVAR = 0,
    OBSERVACIONES = null,
  } = req.body;

  if (!ID_PLAN) {
    return res.status(400).json({ error: 'El plan es obligatorio.' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    await syncExpiredSubscriptions(connection);

    const [[currentSubscription]] = await connection.query(
      `SELECT ID_SUSCRIPCION, ID_PROPIEDAD
       FROM suscripciones_publicacion
       WHERE ID_SUSCRIPCION = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (!currentSubscription) {
      await connection.rollback();
      return res.status(404).json({ error: 'Suscripcion no encontrada.' });
    }

    const [[plan]] = await connection.query(
      `SELECT ID_PLAN, PRECIO, DURACION_DIAS, ESTADO
       FROM planes_publicacion
       WHERE ID_PLAN = ?`,
      [ID_PLAN]
    );

    if (!plan) {
      await connection.rollback();
      return res.status(404).json({ error: 'Plan no encontrado.' });
    }

    if (!plan.ESTADO) {
      await connection.rollback();
      return res.status(409).json({ error: 'El plan seleccionado esta inactivo.' });
    }

    const { startDate, endDate } = calculateSubscriptionDates(
      FECHA_INICIO || new Date(),
      plan.DURACION_DIAS
    );
    const finalStatus = resolveActiveStatus(ESTADO_SUSCRIPCION, endDate);

    await connection.query(
      `UPDATE suscripciones_publicacion
       SET ID_PLAN = ?, ID_AGENTE = ?, PRECIO_PLAN = ?, PRECIO_FINAL = ?, FECHA_INICIO = ?, FECHA_FIN = ?,
           ESTADO_SUSCRIPCION = ?, AUTO_RENOVAR = ?, OBSERVACIONES = ?
       WHERE ID_SUSCRIPCION = ?`,
      [
        Number(ID_PLAN),
        ID_AGENTE ? Number(ID_AGENTE) : null,
        Number(plan.PRECIO) || 0,
        Number(plan.PRECIO) || 0,
        startDate,
        endDate,
        finalStatus,
        AUTO_RENOVAR ? 1 : 0,
        OBSERVACIONES,
        req.params.id,
      ]
    );

    await recalculatePropertyPublicationState(currentSubscription.ID_PROPIEDAD, connection);

    await connection.commit();
    res.status(200).json({ message: 'Suscripcion actualizada con exito' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error al actualizar suscripcion:', error);
    res.status(500).json({ error: getSqlErrorMessage(error, 'Error al actualizar suscripcion') });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.delete('/:id', async (req, res) => {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [[currentSubscription]] = await connection.query(
      `SELECT ID_SUSCRIPCION, ID_PROPIEDAD
       FROM suscripciones_publicacion
       WHERE ID_SUSCRIPCION = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (!currentSubscription) {
      await connection.rollback();
      return res.status(404).json({ error: 'Suscripcion no encontrada.' });
    }

    await connection.query('DELETE FROM suscripciones_publicacion WHERE ID_SUSCRIPCION = ?', [
      req.params.id,
    ]);

    await recalculatePropertyPublicationState(currentSubscription.ID_PROPIEDAD, connection);

    await connection.commit();
    res.status(200).json({ message: 'Suscripcion eliminada con exito' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error al eliminar suscripcion:', error);
    res.status(500).json({ error: getSqlErrorMessage(error, 'Error al eliminar suscripcion') });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
