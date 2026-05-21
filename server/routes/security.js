// routes/security.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Asegúrate de que esta conexión esté correctamente configurada

// Obtener todos los roles
router.get('/roles', async (req, res) => {
  try {
    const sql = `
      SELECT 
        r.ID_ROL, 
        r.NOMBRE_ROL,
        CASE 
          WHEN r.ESTADO = 1 THEN 'Activo' 
          ELSE 'Inactivo' 
        END AS ESTADO
      FROM roles r
    `;

    const [roles] = await db.query(sql);

    res.status(200).json(roles);
  } catch (err) {
    console.error('Error al obtener los roles:', err);
    res.status(500).json({ error: 'Error al obtener los roles' });
  }
});



// Obtener un rol por ID
router.get('/roles/:id', async (req, res) => {
  const roleId = req.params.id;
  try {
    const sql = `
      SELECT 
        r.ID_ROL, 
        r.NOMBRE_ROL,
        CASE 
          WHEN r.ESTADO = 1 THEN 'Activo' 
          ELSE 'Inactivo' 
        END AS ESTADO
      FROM roles r
      WHERE r.ID_ROL = ?
    `;
    const [roles] = await db.query(sql, [roleId]);

    if (roles.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    res.status(200).json(roles[0]);
  } catch (err) {
    console.error('Error al obtener el rol:', err);
    res.status(500).json({ error: 'Error al obtener el rol' });
  }
});


// Crear un nuevo rol
router.post('/roles', async (req, res) => {
  const { NOMBRE_ROL, ESTADO = 1 } = req.body; // Estado por defecto: activo

  if (!NOMBRE_ROL) {
    return res.status(400).json({ error: 'El nombre del rol es requerido' });
  }

  const sqlInsertRole = 'INSERT INTO roles (NOMBRE_ROL, ESTADO) VALUES (?, ?)';

  try {
    const [result] = await db.query(sqlInsertRole, [NOMBRE_ROL, ESTADO]);
    const rolId = result.insertId;

    res.status(201).json({ message: 'Rol creado con éxito', rol: { ID_ROL: rolId, NOMBRE_ROL, ESTADO } });
  } catch (err) {
    console.error('Error al crear el rol:', err);
    res.status(500).json({ error: 'Error al crear el rol' });
  }
});

// Actualizar un rol
router.put('/roles/:id', async (req, res) => {
  const { id } = req.params;
  const { NOMBRE_ROL, ESTADO } = req.body;

  if (!NOMBRE_ROL && ESTADO === undefined) {
    return res.status(400).json({ error: 'Se debe proporcionar al menos el nombre del rol o el estado' });
  }

  if (ESTADO !== undefined && ![0, 1].includes(ESTADO)) {
    return res.status(400).json({ error: 'El estado debe ser 0 o 1' });
  }

  const updateFields = [];
  const updateValues = [];

  if (NOMBRE_ROL) {
    updateFields.push('NOMBRE_ROL = ?');
    updateValues.push(NOMBRE_ROL);
  }

  if (ESTADO !== undefined) {
    updateFields.push('ESTADO = ?');
    updateValues.push(ESTADO);
  }

  updateValues.push(id);

  try {
    const sqlUpdate = `UPDATE roles SET ${updateFields.join(', ')} WHERE ID_ROL = ?`;
    const [result] = await db.query(sqlUpdate, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    res.status(200).json({ message: 'Rol actualizado con éxito' });
  } catch (err) {
    console.error('Error al actualizar el rol:', err);
    res.status(500).json({ error: 'Error al actualizar el rol' });
  }
});

// Eliminar un rol
router.delete('/roles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [usersUsingRole] = await db.query(
      'SELECT COUNT(*) AS total FROM gestion_usuarios WHERE ID_ROL = ?',
      [id]
    );

    if (usersUsingRole[0].total > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar el rol porque tiene usuarios asociados.',
      });
    }

    await db.query('DELETE FROM roles_permisos_objetos WHERE ID_ROL = ?', [id]);
    const [result] = await db.query('DELETE FROM roles WHERE ID_ROL = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    res.status(200).json({ message: 'Rol eliminado con éxito' });
  } catch (err) {
    console.error('Error al eliminar el rol:', err);
    res.status(500).json({ error: 'Error al eliminar el rol' });
  }
});
// Actualizar el estado de los usuarios con el rol 'Usuario'
router.put('/usuarios/estado', async (req, res) => {
  const { estado } = req.body;

  if (typeof estado !== 'number') {
    return res.status(400).json({ error: 'El estado es requerido y debe ser un número' });
  }

  const sql = `
    UPDATE gestion_usuarios gu
    SET gu.ESTADO = ?
    WHERE gu.ID_ROL = (
        SELECT r.ID_ROL
        FROM roles r
        WHERE r.NOMBRE_ROL = 'Usuario'
    )
  `;

  try {
    const [result] = await db.query(sql, [estado]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No se encontraron usuarios con el rol "Usuario"' });
    }

    res.status(200).json({
      message: 'Estado de los usuarios actualizado con éxito',
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error('Error al actualizar el estado de los usuarios:', err);
    res.status(500).json({ error: 'Error al actualizar el estado de los usuarios' });
  }
});


module.exports = router;
