const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todos los permisos de un rol
router.get('/rol/:rolId', async (req, res) => {
  const { rolId } = req.params;
  console.log(`Obteniendo permisos para el rol ID: ${rolId}`);

  if (!rolId || isNaN(rolId)) {
    console.error('ID de rol inválido o no proporcionado:', rolId);
    return res.status(400).json({ error: 'ID de rol inválido o no proporcionado' });
  }

  try {
    const [permisos] = await db.query(`
      SELECT rpo.*, o.NOMBRE_OBJETO, p.NOMBRE_PERMISO 
      FROM roles_permisos_objetos rpo
      JOIN objetos o ON rpo.ID_OBJETO = o.ID_OBJETO
      JOIN permisos p ON rpo.ID_PERMISO = p.ID_PERMISO
      WHERE rpo.ID_ROL = ?
    `, [rolId]);

    console.log(`Permisos obtenidos para el rol ${rolId}:`, permisos);
    res.status(200).json(permisos);
  } catch (err) {
    console.error('Error al obtener los permisos del rol:', err);
    res.status(500).json({ message: 'Error al obtener los permisos del rol', error: err.message });
  }
});

// Asignar permiso a un rol sobre un objeto
router.post('/asignar', async (req, res) => {
  const { ID_ROL, ID_OBJETO, ID_PERMISO } = req.body;

  console.log('Datos recibidos para asignar permiso:', { ID_ROL, ID_OBJETO, ID_PERMISO });

  if (!ID_ROL || !ID_OBJETO || !ID_PERMISO || isNaN(ID_ROL) || isNaN(ID_OBJETO) || isNaN(ID_PERMISO)) {
    console.error('Datos inválidos para asignar permiso:', { ID_ROL, ID_OBJETO, ID_PERMISO });
    return res.status(400).json({ error: 'Datos inválidos para asignar permiso' });
  }

  try {
    const [existente] = await db.query(
      'SELECT * FROM roles_permisos_objetos WHERE ID_ROL = ? AND ID_OBJETO = ? AND ID_PERMISO = ?',
      [ID_ROL, ID_OBJETO, ID_PERMISO]
    );

    if (existente.length > 0) {
      console.warn('Esta asignación ya existe:', { ID_ROL, ID_OBJETO, ID_PERMISO });
      return res.status(400).json({ error: 'Esta asignación ya existe' });
    }

    const [result] = await db.query(
      'INSERT INTO roles_permisos_objetos (ID_ROL, ID_OBJETO, ID_PERMISO) VALUES (?, ?, ?)',
      [ID_ROL, ID_OBJETO, ID_PERMISO]
    );

    console.log('Permiso asignado exitosamente:', {
      id: result.insertId,
      ID_ROL,
      ID_OBJETO,
      ID_PERMISO,
    });

    res.status(201).json({
      id: result.insertId,
      ID_ROL,
      ID_OBJETO,
      ID_PERMISO,
    });
  } catch (err) {
    console.error('Error al asignar el permiso:', err);
    res.status(500).json({ message: 'Error al asignar el permiso', error: err.message });
  }
});

// Revocar permiso
// Revocar permiso usando ID_ROL, ID_OBJETO y ID_PERMISO
router.delete('/revocar', async (req, res) => {
  const { ID_ROL, ID_OBJETO, ID_PERMISO } = req.body; // Cambiar a req.body para recibir los datos necesarios

  console.log('Datos recibidos para revocar permiso:', { ID_ROL, ID_OBJETO, ID_PERMISO });

  // Validar que los datos sean válidos
  if (!ID_ROL || !ID_OBJETO || !ID_PERMISO || isNaN(ID_ROL) || isNaN(ID_OBJETO) || isNaN(ID_PERMISO)) {
    console.error('Datos inválidos para revocar permiso:', { ID_ROL, ID_OBJETO, ID_PERMISO });
    return res.status(400).json({ error: 'Datos inválidos para revocar permiso' });
  }

  try {
    // Intentar eliminar el permiso usando los parámetros proporcionados
    const [result] = await db.query(
      'DELETE FROM roles_permisos_objetos WHERE ID_ROL = ? AND ID_OBJETO = ? AND ID_PERMISO = ?',
      [ID_ROL, ID_OBJETO, ID_PERMISO]
    );

    // Verificar si se eliminó algún registro
    if (result.affectedRows === 0) {
      console.warn('Permiso no encontrado o ya eliminado:', { ID_ROL, ID_OBJETO, ID_PERMISO });
      return res.status(404).json({ error: 'Permiso no encontrado o ya eliminado' });
    }

    console.log('Permiso revocado exitosamente:', { ID_ROL, ID_OBJETO, ID_PERMISO });
    res.status(200).json({ message: 'Permiso revocado exitosamente' });
  } catch (err) {
    console.error('Error al revocar el permiso:', err);
    res.status(500).json({ message: 'Error al revocar el permiso', error: err.message });
  }
});

// Verificar si un rol tiene un permiso específico sobre un objeto
router.get('/verificar', async (req, res) => {
  const { ID_ROL, ID_OBJETO, ID_PERMISO } = req.query;

  console.log('Verificando permiso:', { ID_ROL, ID_OBJETO, ID_PERMISO });

  if (!ID_ROL || !ID_OBJETO || !ID_PERMISO || isNaN(ID_ROL) || isNaN(ID_OBJETO) || isNaN(ID_PERMISO)) {
    console.error('Datos inválidos para verificar permiso:', { ID_ROL, ID_OBJETO, ID_PERMISO });
    return res.status(400).json({ error: 'Datos inválidos para verificar permiso' });
  }

  try {
    const [permiso] = await db.query(
      'SELECT * FROM roles_permisos_objetos WHERE ID_ROL = ? AND ID_OBJETO = ? AND ID_PERMISO = ?',
      [ID_ROL, ID_OBJETO, ID_PERMISO]
    );

    console.log(
      `Permiso ${permiso.length > 0 ? 'encontrado' : 'no encontrado'} para:`,
      { ID_ROL, ID_OBJETO, ID_PERMISO }
    );

    res.status(200).json({
      tienePermiso: permiso.length > 0,
    });
  } catch (err) {
    console.error('Error al verificar el permiso:', err);
    res.status(500).json({ message: 'Error al verificar el permiso', error: err.message });
  }
});

module.exports = router;
