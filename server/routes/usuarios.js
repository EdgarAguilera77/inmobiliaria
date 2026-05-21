const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db'); // Conexión a la base de datos

// Login de usuario
router.post('/login', async (req, res) => {
  const { CORREO, PASSWORD } = req.body;

  try {
    // Verificar que el usuario existe
    const [userRows] = await db.query('SELECT * FROM gestion_usuarios WHERE CORREO = ?', [CORREO]);

    if (userRows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = userRows[0];

    // Verificar la contraseña encriptada
    const isPasswordMatch = await bcrypt.compare(PASSWORD, user.PASSWORD);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar si el usuario está inactivo
    if (user.ESTADO === 0) {
      return res.status(403).json({ message: 'Usuario inactivo' });
    }

    // Verificar si el usuario debe cambiar su contraseña
    const cambiarPassword = user.CAMBIAR_PASSWORD === 1;

    // Devuelve la respuesta con el objeto user y cambiarPassword
    res.status(200).json({
      message: cambiarPassword ? 'Debes cambiar tu contraseña antes de continuar' : 'Login exitoso',
      cambiarPassword,
      user: {
        CODIGO: user.CODIGO,
        NOMBRE: user.NOMBRE,
        CORREO: user.CORREO,
        ID_ROL: user.ID_ROL,
        ID_SERVICIO: user.ID_SERVICIO,
        ESTADO: user.ESTADO,
      },
    });
  } catch (err) {
    console.error('Error en el login:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Crear un nuevo usuario con contraseña encriptada
router.post('/', async (req, res) => {
  const { NOMBRE, IDENTIFICACION, CORREO, TELEFONO, PASSWORD, ID_ROL, ID_SERVICIO, ESTADO } = req.body;

  if (!NOMBRE || !IDENTIFICACION || !CORREO || !TELEFONO || !PASSWORD || !ID_ROL || !ID_SERVICIO) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud' });
  }

  try {
    // Verificar si el correo ya está registrado
    const [existingUser] = await db.query(
      'SELECT COUNT(*) AS count FROM gestion_usuarios WHERE CORREO = ?',
      [CORREO]
    );

    if (existingUser[0].count > 0) {
      return res.status(409).json({ error: 'Correo ya registrado' });
    }

    // Encriptar la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(PASSWORD, saltRounds);

    // Insertar el nuevo usuario con contraseña encriptada
    const sql = `
      INSERT INTO gestion_usuarios 
      (NOMBRE, IDENTIFICACION, CORREO, TELEFONO, PASSWORD, ID_ROL, ID_SERVICIO, ESTADO) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const [result] = await db.query(sql, [NOMBRE, IDENTIFICACION, CORREO, TELEFONO, hashedPassword, ID_ROL, ID_SERVICIO, ESTADO]);
    res.status(201).json({ message: 'Usuario creado con éxito', usuarioId: result.insertId });
  } catch (err) {
    console.error('Error en la base de datos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todos los usuarios con sus roles
router.get('/', async (req, res) => {
  const sql = `
    SELECT gu.*, r.NOMBRE_ROL, s.NOMBRE_SERVICIO
    FROM gestion_usuarios gu
    JOIN roles r ON gu.ID_ROL = r.ID_ROL
    JOIN servicios s ON gu.ID_SERVICIO = s.ID_SERVICIO;
  `;
  try {
    const [results] = await db.query(sql);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error al obtener los usuarios:', err);
    res.status(500).json({ error: err.message });
  }
});


// Actualizar un usuario
router.put('/:codigo', async (req, res) => {
  const { codigo } = req.params;
  const { NOMBRE, IDENTIFICACION, CORREO, TELEFONO, PASSWORD, ID_ROL, ID_SERVICIO, ESTADO } = req.body;

  // Verifica los campos requeridos
  if (!NOMBRE || !IDENTIFICACION || !CORREO || !TELEFONO || !ID_ROL || !ID_SERVICIO || ESTADO === undefined) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud' });
  }

  try {
    // Consulta al usuario actual para recuperar su contraseña
    const [existingUser] = await db.query('SELECT PASSWORD FROM gestion_usuarios WHERE CODIGO = ?', [codigo]);

    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Mantén la contraseña actual por defecto
    let hashedPassword = existingUser[0].PASSWORD;
    let cambiarPassword = 0; // Por defecto, no se requiere cambio de contraseña

    // Si se envía una nueva contraseña (texto plano), generar un nuevo hash
    if (PASSWORD && PASSWORD !== hashedPassword) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(PASSWORD, saltRounds);
      cambiarPassword = 1; // Requerir cambio de contraseña si esta fue actualizada
    }

    // Actualiza el registro en la base de datos
    const sql = `
      UPDATE gestion_usuarios 
      SET NOMBRE = ?, IDENTIFICACION = ?, CORREO = ?, TELEFONO = ?, PASSWORD = ?, ID_ROL = ?, ID_SERVICIO = ?, ESTADO = ?, CAMBIAR_PASSWORD = ?
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
      codigo,
    ]);

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Usuario actualizado con éxito' });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (err) {
    console.error('Error en la base de datos:', err);
    res.status(500).json({ error: err.message });
  }
});



// Eliminar un usuario
router.delete('/:codigo', async (req, res) => {
  const { codigo } = req.params;

  const sql = 'DELETE FROM gestion_usuarios WHERE CODIGO = ?';
  try {
    const [result] = await db.query(sql, [codigo]);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Usuario eliminado con éxito' });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (err) {
    console.error('Error en la base de datos:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener todos los servicios
router.get('/servicios', async (req, res) => {
  const sql = 'SELECT ID_SERVICIO, NOMBRE_SERVICIO FROM servicios';
  try {
    const [results] = await db.query(sql);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error al obtener los servicios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener el estado de un usuario por código
router.get('/:codigo/estado', async (req, res) => {
  const { codigo } = req.params;

  if (!codigo) {
    return res.status(400).json({ error: 'El código del usuario es obligatorio' });
  }

  const sql = `
    SELECT ESTADO 
    FROM gestion_usuarios 
    WHERE CODIGO = ?;
  `;

  try {
    const [rows] = await db.query(sql, [codigo]);

    if (rows.length > 0) {
      return res.status(200).json({ estado: rows[0].ESTADO });
    } else {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (err) {
    console.error('Error en la base de datos:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar la contraseña del usuario
router.patch('/usuarios/:codigo/cambiar-password', async (req, res) => {
  const { codigo } = req.params;
  const { nuevaPassword } = req.body;

  if (!nuevaPassword) {
    return res.status(400).json({ error: 'La nueva contraseña es obligatoria' });
  }

  try {
    // Obtener la contraseña actual del usuario
    const sqlGetPassword = `SELECT PASSWORD FROM gestion_usuarios WHERE CODIGO = ?`;
    const [rows] = await db.query(sqlGetPassword, [codigo]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const currentPasswordHash = rows[0].PASSWORD;

    // Comparar la nueva contraseña con la actual
    const isSamePassword = await bcrypt.compare(nuevaPassword, currentPasswordHash);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ error: 'La nueva contraseña no puede ser igual a la contraseña actual.' });
    }

    // Generar un hash para la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nuevaPassword, saltRounds);

    // Actualizar la contraseña y desactivar el cambio de contraseña obligatorio
    const sqlUpdatePassword = `
      UPDATE gestion_usuarios 
      SET PASSWORD = ?, CAMBIAR_PASSWORD = 0 
      WHERE CODIGO = ?;
    `;
    const [result] = await db.query(sqlUpdatePassword, [hashedPassword, codigo]);

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Contraseña actualizada con éxito' });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (err) {
    console.error('Error en la base de datos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
//actualizar el estado 



module.exports = router;