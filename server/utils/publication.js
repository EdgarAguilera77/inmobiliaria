const db = require('../db');

const PUBLICATION_STATE_BY_SUBSCRIPTION = {
  'Pendiente de pago': 'Pendiente de pago',
  Activa: 'Publicada',
  Vencida: 'Vencida',
  Cancelada: 'Pausada',
};

const getExecutor = (connection) => connection || db;

const syncExpiredSubscriptions = async (connection = null) => {
  const executor = getExecutor(connection);

  await executor.query(
    `UPDATE suscripciones_publicacion
     SET ESTADO_SUSCRIPCION = 'Vencida'
     WHERE ESTADO_SUSCRIPCION = 'Activa'
       AND FECHA_FIN < CURDATE()`
  );
};

const recalculatePropertyPublicationState = async (propertyId, connection = null) => {
  const executor = getExecutor(connection);

  const [propertyRows] = await executor.query(
    `SELECT ID_PROPIEDAD, ACTIVA, ESTADO_COMERCIAL
     FROM propiedades
     WHERE ID_PROPIEDAD = ?`,
    [propertyId]
  );

  if (!propertyRows.length) {
    return null;
  }

  const property = propertyRows[0];

  if (property.ESTADO_COMERCIAL !== 'Disponible') {
    await executor.query(
      `UPDATE propiedades
       SET ESTADO_PUBLICACION = 'Pausada'
       WHERE ID_PROPIEDAD = ?`,
      [propertyId]
    );
    return 'Pausada';
  }

  const [subscriptionRows] = await executor.query(
    `SELECT ID_SUSCRIPCION, ESTADO_SUSCRIPCION
     FROM suscripciones_publicacion
     WHERE ID_PROPIEDAD = ?
     ORDER BY FECHA_FIN DESC, ID_SUSCRIPCION DESC
     LIMIT 1`,
    [propertyId]
  );

  const latestSubscription = subscriptionRows[0];
  const publicationStatus = latestSubscription
    ? PUBLICATION_STATE_BY_SUBSCRIPTION[latestSubscription.ESTADO_SUSCRIPCION] || 'Borrador'
    : 'Borrador';

  await executor.query(
    `UPDATE propiedades
     SET ESTADO_PUBLICACION = ?
     WHERE ID_PROPIEDAD = ?`,
    [publicationStatus, propertyId]
  );

  return publicationStatus;
};

const syncPublicationStateForAllProperties = async (connection = null) => {
  const executor = getExecutor(connection);
  await syncExpiredSubscriptions(connection);

  const [propertyRows] = await executor.query(`SELECT ID_PROPIEDAD FROM propiedades`);
  await Promise.all(
    propertyRows.map((property) =>
      recalculatePropertyPublicationState(property.ID_PROPIEDAD, connection)
    )
  );
};

module.exports = {
  recalculatePropertyPublicationState,
  syncExpiredSubscriptions,
  syncPublicationStateForAllProperties,
};
