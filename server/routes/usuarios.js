const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();
const db = require('../db');

const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_BLOCK_MINUTES = 5;

const mapUserStatusToAgentStatus = (status) => (Number(status) === 1 ? 'Activo' : 'Inactivo');

const ensureLinkedAgent = async (
  connection,
  { userId, name, phone, email, status, photoUrl = null, specialty = '' }
) => {
  const normalizedEmail = String(email || '').trim();
  const normalizedName = String(name || '').trim();
  const normalizedPhone = String(phone || '').trim();
  const agentStatus = mapUserStatusToAgentStatus(status);

  const [existingAgentRows] = await connection.query(
    `SELECT ID_AGENTE
     FROM agentes
     WHERE ID_USUARIO = ? OR CORREO = ?
     LIMIT 1`,
    [userId, normalizedEmail]
  );

  if (existingAgentRows.length > 0) {
    await connection.query(
      `UPDATE agentes
       SET ID_USUARIO = ?, NOMBRE = ?, CARGO = ?, TELEFONO = ?, CORREO = ?, FOTO_URL = COALESCE(?, FOTO_URL),
           ESPECIALIDAD = COALESCE(NULLIF(ESPECIALIDAD, ''), ?), ESTADO = ?
       WHERE ID_AGENTE = ?`,
      [
        userId,
        normalizedName,
        'Agente',
        normalizedPhone,
        normalizedEmail,
        photoUrl,
        specialty,
        agentStatus,
        existingAgentRows[0].ID_AGENTE,
      ]
    );

    return existingAgentRows[0].ID_AGENTE;
  }

  const [insertAgentResult] = await connection.query(
    `INSERT INTO agentes (ID_USUARIO, NOMBRE, CARGO, TELEFONO, CORREO, FOTO_URL, ESPECIALIDAD, ESTADO)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, normalizedName, 'Agente', normalizedPhone, normalizedEmail, photoUrl, specialty, agentStatus]
  );

  return insertAgentResult.insertId;
};

const getSqlErrorMessage = (error, fallbackMessage) => {
  if (!error || !error.code) {
    return fallbackMessage;
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return 'El rol o el servicio seleccionado no existe en la base de datos.';
  }

  if (error.code === 'ER_DUP_ENTRY') {
    return 'Ya existe un registro con uno de los datos unicos enviados.';
  }

  if (error.code === 'ER_BAD_NULL_ERROR') {
    return 'Faltan datos obligatorios para completar la operacion.';
  }

  if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
    return 'No se puede eliminar el usuario porque aun tiene informacion relacionada en el sistema.';
  }

  return fallbackMessage;
};

const buildLockoutMessage = (blockedUntil) => {
  const blockedDate = blockedUntil instanceof Date ? blockedUntil : new Date(blockedUntil);
  const remainingMs = blockedDate.getTime() - Date.now();
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  return `Has excedido los ${MAX_LOGIN_ATTEMPTS} intentos permitidos. Intenta nuevamente en ${remainingMinutes} minuto(s).`;
};

// Login de usuario
router.post('/login', async (req, res) => {
  const { CORREO, PASSWORD } = req.body;

  if (!CORREO || !PASSWORD) {
    return res.status(400).json({ message: 'Correo y contrasena son obligatorios' });
  }

  try {
    const [userRows] = await db.query('SELECT * FROM gestion_usuarios WHERE CORREO = ?', [CORREO]);

    if (userRows.length === 0) {
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

    const user = userRows[0];

    if (user.BLOQUEADO_HASTA && new Date(user.BLOQUEADO_HASTA) > new Date()) {
      return res.status(423).json({
        message: buildLockoutMessage(user.BLOQUEADO_HASTA),
      });
    }

    const isPasswordMatch = await bcrypt.compare(PASSWORD, user.PASSWORD);

    if (!isPasswordMatch) {
      const nextFailedAttempts = Number(user.INTENTOS_LOGIN_FALLIDOS || 0) + 1;

      if (nextFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
        await db.query(
          `
            UPDATE gestion_usuarios
            SET INTENTOS_LOGIN_FALLIDOS = ?, BLOQUEADO_HASTA = DATE_ADD(NOW(), INTERVAL ? MINUTE)
            WHERE CODIGO = ?
          `,
          [MAX_LOGIN_ATTEMPTS, LOGIN_BLOCK_MINUTES, user.CODIGO]
        );

        return res.status(423).json({
          message: `Has excedido los ${MAX_LOGIN_ATTEMPTS} intentos permitidos. Tu acceso fue bloqueado durante ${LOGIN_BLOCK_MINUTES} minutos.`,
        });
      }

      await db.query(
        `
          UPDATE gestion_usuarios
          SET INTENTOS_LOGIN_FALLIDOS = ?, BLOQUEADO_HASTA = NULL
          WHERE CODIGO = ?
        `,
        [nextFailedAttempts, user.CODIGO]
      );

      return res.status(401).json({
        message: `Credenciales invalidas. Intento ${nextFailedAttempts} de ${MAX_LOGIN_ATTEMPTS}.`,
      });
    }

    await db.query(
      `
        UPDATE gestion_usuarios
        SET INTENTOS_LOGIN_FALLIDOS = 0, BLOQUEADO_HASTA = NULL
        WHERE CODIGO = ?
      `,
      [user.CODIGO]
    );

    if (user.ESTADO === 0) {
      return res.status(403).json({ message: 'Usuario inactivo' });
    }

    const cambiarPassword = user.CAMBIAR_PASSWORD === 1;

    return res.status(200).json({
      message: cambiarPassword
        ? 'Debes cambiar tu contrasena antes de continuar'
        : 'Login exitoso',
      cambiarPassword,
      user: {
        CODIGO: user.CODIGO,
        NOMBRE: user.NOMBRE,
        CORREO: user.CORREO,
        ID_ROL: user.ID_ROL,
        ID_SERVICIO: user.ID_SERVICIO,
        ESTADO: user.ESTADO,
        REQUIERE_ACEPTACION_TERMINOS: Number(user.REQUIERE_ACEPTACION_TERMINOS || 0),
      },
    });
  } catch (err) {
    console.error('Error en el login:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear un nuevo usuario con contrasena encriptada
router.post('/', async (req, res) => {
  const {
    NOMBRE,
    IDENTIFICACION,
    CORREO,
    TELEFONO,
    PASSWORD,
    ID_ROL,
    ID_SERVICIO,
    ESTADO,
    REQUIERE_ACEPTACION_TERMINOS,
    FOTO_URL = null,
  } = req.body;

  if (!NOMBRE || !IDENTIFICACION || !CORREO || !TELEFONO || !PASSWORD || !ID_ROL || !ID_SERVICIO) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existingUser] = await connection.query(
      'SELECT COUNT(*) AS count FROM gestion_usuarios WHERE CORREO = ?',
      [CORREO]
    );

    if (existingUser[0].count > 0) {
      return res.status(409).json({ error: 'Correo ya registrado' });
    }

    const [[role]] = await connection.query('SELECT ID_ROL FROM roles WHERE ID_ROL = ?', [ID_ROL]);
    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    const [[service]] = await connection.query('SELECT ID_SERVICIO FROM servicios WHERE ID_SERVICIO = ?', [
      ID_SERVICIO,
    ]);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(PASSWORD, saltRounds);

    const sql = `
      INSERT INTO gestion_usuarios
      (NOMBRE, IDENTIFICACION, CORREO, TELEFONO, PASSWORD, ID_ROL, ID_SERVICIO, ESTADO, REQUIERE_ACEPTACION_TERMINOS)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const [result] = await connection.query(sql, [
      NOMBRE,
      IDENTIFICACION,
      CORREO,
      TELEFONO,
      hashedPassword,
      ID_ROL,
      ID_SERVICIO,
      ESTADO,
      Number(REQUIERE_ACEPTACION_TERMINOS ?? 1),
    ]);

    await ensureLinkedAgent(connection, {
      userId: result.insertId,
      name: NOMBRE,
      phone: TELEFONO,
      email: CORREO,
      status: ESTADO,
      photoUrl: FOTO_URL,
    });

    await connection.commit();

    return res.status(201).json({ message: 'Usuario creado con exito', usuarioId: result.insertId });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error en la base de datos:', err);
    return res.status(500).json({ error: getSqlErrorMessage(err, 'Error interno del servidor') });
  } finally {
    connection?.release();
  }
});

// Obtener todos los usuarios con sus roles
router.get('/', async (req, res) => {
  const sql = `
    SELECT gu.*, r.NOMBRE_ROL, s.NOMBRE_SERVICIO, a.FOTO_URL
    FROM gestion_usuarios gu
    JOIN roles r ON gu.ID_ROL = r.ID_ROL
    LEFT JOIN servicios s ON gu.ID_SERVICIO = s.ID_SERVICIO
    LEFT JOIN agentes a ON a.ID_USUARIO = gu.CODIGO;
  `;

  try {
    const [results] = await db.query(sql);
    return res.status(200).json(results);
  } catch (err) {
    console.error('Error al obtener los usuarios:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Actualizar un usuario
router.put('/:codigo', async (req, res) => {
  const { codigo } = req.params;
  const {
    NOMBRE,
    IDENTIFICACION,
    CORREO,
    TELEFONO,
    PASSWORD,
    ID_ROL,
    ID_SERVICIO,
    ESTADO,
    REQUIERE_ACEPTACION_TERMINOS,
    FOTO_URL = null,
  } = req.body;

  if (
    !NOMBRE ||
    !IDENTIFICACION ||
    !CORREO ||
    !TELEFONO ||
    !ID_ROL ||
    !ID_SERVICIO ||
    ESTADO === undefined
  ) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existingUser] = await connection.query('SELECT PASSWORD FROM gestion_usuarios WHERE CODIGO = ?', [
      codigo,
    ]);

    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const [duplicateEmailRows] = await connection.query(
      'SELECT CODIGO FROM gestion_usuarios WHERE CORREO = ? AND CODIGO <> ?',
      [CORREO, codigo]
    );

    if (duplicateEmailRows.length > 0) {
      return res.status(409).json({ error: 'Correo ya registrado por otro usuario' });
    }

    const [[role]] = await connection.query('SELECT ID_ROL FROM roles WHERE ID_ROL = ?', [ID_ROL]);
    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    const [[service]] = await connection.query('SELECT ID_SERVICIO FROM servicios WHERE ID_SERVICIO = ?', [
      ID_SERVICIO,
    ]);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    let hashedPassword = existingUser[0].PASSWORD;
    let cambiarPassword = 0;

    if (PASSWORD && PASSWORD !== hashedPassword) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(PASSWORD, saltRounds);
      cambiarPassword = 1;
    }

    const sql = `
      UPDATE gestion_usuarios
      SET NOMBRE = ?, IDENTIFICACION = ?, CORREO = ?, TELEFONO = ?, PASSWORD = ?, ID_ROL = ?, ID_SERVICIO = ?, ESTADO = ?, CAMBIAR_PASSWORD = ?, REQUIERE_ACEPTACION_TERMINOS = ?
      WHERE CODIGO = ?;
    `;

    const [result] = await connection.query(sql, [
      NOMBRE,
      IDENTIFICACION,
      CORREO,
      TELEFONO,
      hashedPassword,
      ID_ROL,
      ID_SERVICIO,
      ESTADO,
      cambiarPassword,
      Number(REQUIERE_ACEPTACION_TERMINOS ?? 0),
      codigo,
    ]);

    await ensureLinkedAgent(connection, {
      userId: Number(codigo),
      name: NOMBRE,
      phone: TELEFONO,
      email: CORREO,
      status: ESTADO,
      photoUrl: FOTO_URL,
    });

    await connection.commit();

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: 'Usuario actualizado con exito' });
    }

    return res.status(404).json({ message: 'Usuario no encontrado' });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error en la base de datos:', err);
    return res.status(500).json({ error: getSqlErrorMessage(err, err.message) });
  } finally {
    connection?.release();
  }
});

// Eliminar un usuario
router.delete('/:codigo', async (req, res) => {
  const { codigo } = req.params;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `DELETE FROM aceptaciones_terminos
       WHERE CODIGO_USUARIO = ?`,
      [codigo]
    );

    await connection.query(
      `UPDATE agentes
       SET ID_USUARIO = NULL, ESTADO = 'Inactivo'
       WHERE ID_USUARIO = ?`,
      [codigo]
    );

    const [result] = await connection.query('DELETE FROM gestion_usuarios WHERE CODIGO = ?', [codigo]);

    await connection.commit();

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: 'Usuario eliminado con exito' });
    }

    return res.status(404).json({ message: 'Usuario no encontrado' });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error en la base de datos:', err);
    return res.status(500).json({
      error: getSqlErrorMessage(
        err,
        'No se pudo eliminar el usuario porque tiene informacion relacionada en el sistema.'
      ),
    });
  } finally {
    connection?.release();
  }
});

// Obtener el estado de un usuario por codigo
router.get('/:codigo/estado', async (req, res) => {
  const { codigo } = req.params;

  if (!codigo) {
    return res.status(400).json({ error: 'El codigo del usuario es obligatorio' });
  }

  try {
    const [rows] = await db.query(
      `
        SELECT ESTADO
        FROM gestion_usuarios
        WHERE CODIGO = ?;
      `,
      [codigo]
    );

    if (rows.length > 0) {
      return res.status(200).json({ estado: rows[0].ESTADO });
    }

    return res.status(404).json({ error: 'Usuario no encontrado' });
  } catch (err) {
    console.error('Error en la base de datos:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener catalogo de servicios
router.get('/servicios', async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT ID_SERVICIO, NOMBRE_SERVICIO
        FROM servicios
        ORDER BY NOMBRE_SERVICIO ASC;
      `
    );

    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error al obtener servicios:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar la contrasena del usuario
router.patch('/usuarios/:codigo/cambiar-password', async (req, res) => {
  const { codigo } = req.params;
  const { nuevaPassword } = req.body;

  if (!nuevaPassword) {
    return res.status(400).json({ error: 'La nueva contrasena es obligatoria' });
  }

  try {
    const [rows] = await db.query('SELECT PASSWORD FROM gestion_usuarios WHERE CODIGO = ?', [
      codigo,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const currentPasswordHash = rows[0].PASSWORD;
    const isSamePassword = await bcrypt.compare(nuevaPassword, currentPasswordHash);

    if (isSamePassword) {
      return res.status(400).json({
        error: 'La nueva contrasena no puede ser igual a la contrasena actual.',
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nuevaPassword, saltRounds);

    const [result] = await db.query(
      `
        UPDATE gestion_usuarios
        SET PASSWORD = ?, CAMBIAR_PASSWORD = 0
        WHERE CODIGO = ?;
      `,
      [hashedPassword, codigo]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: 'Contrasena actualizada con exito' });
    }

    return res.status(404).json({ message: 'Usuario no encontrado' });
  } catch (err) {
    console.error('Error en la base de datos:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
