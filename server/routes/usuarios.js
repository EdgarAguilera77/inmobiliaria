const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();
const db = require('../db');

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

  return fallbackMessage;
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
    const isPasswordMatch = await bcrypt.compare(PASSWORD, user.PASSWORD);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

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
  } = req.body;

  if (!NOMBRE || !IDENTIFICACION || !CORREO || !TELEFONO || !PASSWORD || !ID_ROL || !ID_SERVICIO) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud' });
  }

  try {
    const [existingUser] = await db.query(
      'SELECT COUNT(*) AS count FROM gestion_usuarios WHERE CORREO = ?',
      [CORREO]
    );

    if (existingUser[0].count > 0) {
      return res.status(409).json({ error: 'Correo ya registrado' });
    }

    const [[role]] = await db.query('SELECT ID_ROL FROM roles WHERE ID_ROL = ?', [ID_ROL]);
    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    const [[service]] = await db.query('SELECT ID_SERVICIO FROM servicios WHERE ID_SERVICIO = ?', [
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

    const [result] = await db.query(sql, [
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

    return res.status(201).json({ message: 'Usuario creado con exito', usuarioId: result.insertId });
  } catch (err) {
    console.error('Error en la base de datos:', err);
    return res.status(500).json({ error: getSqlErrorMessage(err, 'Error interno del servidor') });
  }
});

// Obtener todos los usuarios con sus roles
router.get('/', async (req, res) => {
  const sql = `
    SELECT gu.*, r.NOMBRE_ROL, s.NOMBRE_SERVICIO
    FROM gestion_usuarios gu
    JOIN roles r ON gu.ID_ROL = r.ID_ROL
    LEFT JOIN servicios s ON gu.ID_SERVICIO = s.ID_SERVICIO;
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

  try {
    const [existingUser] = await db.query('SELECT PASSWORD FROM gestion_usuarios WHERE CODIGO = ?', [
      codigo,
    ]);

    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const [duplicateEmailRows] = await db.query(
      'SELECT CODIGO FROM gestion_usuarios WHERE CORREO = ? AND CODIGO <> ?',
      [CORREO, codigo]
    );

    if (duplicateEmailRows.length > 0) {
      return res.status(409).json({ error: 'Correo ya registrado por otro usuario' });
    }

    const [[role]] = await db.query('SELECT ID_ROL FROM roles WHERE ID_ROL = ?', [ID_ROL]);
    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    const [[service]] = await db.query('SELECT ID_SERVICIO FROM servicios WHERE ID_SERVICIO = ?', [
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

    const [result] = await db.query(sql, [
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

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: 'Usuario actualizado con exito' });
    }

    return res.status(404).json({ message: 'Usuario no encontrado' });
  } catch (err) {
    console.error('Error en la base de datos:', err);
    return res.status(500).json({ error: getSqlErrorMessage(err, err.message) });
  }
});

// Eliminar un usuario
router.delete('/:codigo', async (req, res) => {
  const { codigo } = req.params;

  try {
    const [result] = await db.query('DELETE FROM gestion_usuarios WHERE CODIGO = ?', [codigo]);

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: 'Usuario eliminado con exito' });
    }

    return res.status(404).json({ message: 'Usuario no encontrado' });
  } catch (err) {
    console.error('Error en la base de datos:', err);
    return res.status(500).json({ error: err.message });
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
