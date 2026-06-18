const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.ID_AGENTE, a.ID_USUARIO, a.NOMBRE, a.CARGO, a.TELEFONO, a.CORREO, a.FOTO_URL,
              a.ESPECIALIDAD, a.ESTADO, a.FECHA_CREACION, a.FECHA_ACTUALIZACION,
              gu.NOMBRE AS NOMBRE_USUARIO
       FROM agentes a
       LEFT JOIN gestion_usuarios gu ON gu.CODIGO = a.ID_USUARIO
       ORDER BY a.NOMBRE ASC`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener agentes:', error);
    res.status(500).json({ error: 'Error al obtener agentes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ID_AGENTE, ID_USUARIO, NOMBRE, CARGO, TELEFONO, CORREO, FOTO_URL,
              ESPECIALIDAD, ESTADO, FECHA_CREACION, FECHA_ACTUALIZACION
       FROM agentes
       WHERE ID_AGENTE = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Agente no encontrado' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error al obtener agente:', error);
    res.status(500).json({ error: 'Error al obtener agente' });
  }
});

router.post('/', async (req, res) => {
  const {
    ID_USUARIO = null,
    NOMBRE,
    CARGO,
    TELEFONO,
    CORREO,
    FOTO_URL = null,
    ESPECIALIDAD = '',
    ESTADO = 'Activo',
  } = req.body;

  if (!NOMBRE || !CARGO || !TELEFONO || !CORREO) {
    return res.status(400).json({ error: 'Nombre, cargo, telefono y correo son obligatorios' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO agentes (ID_USUARIO, NOMBRE, CARGO, TELEFONO, CORREO, FOTO_URL, ESPECIALIDAD, ESTADO)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ID_USUARIO, NOMBRE.trim(), CARGO.trim(), TELEFONO.trim(), CORREO.trim(), FOTO_URL, ESPECIALIDAD, ESTADO]
    );

    res.status(201).json({ message: 'Agente creado con exito', id: result.insertId });
  } catch (error) {
    console.error('Error al crear agente:', error);
    res.status(500).json({ error: 'Error al crear agente', detail: error.sqlMessage || error.message });
  }
});

router.put('/:id', async (req, res) => {
  const {
    ID_USUARIO = null,
    NOMBRE,
    CARGO,
    TELEFONO,
    CORREO,
    FOTO_URL = null,
    ESPECIALIDAD = '',
    ESTADO = 'Activo',
  } = req.body;

  if (!NOMBRE || !CARGO || !TELEFONO || !CORREO) {
    return res.status(400).json({ error: 'Nombre, cargo, telefono y correo son obligatorios' });
  }

  try {
    const [result] = await db.query(
      `UPDATE agentes
       SET ID_USUARIO = ?, NOMBRE = ?, CARGO = ?, TELEFONO = ?, CORREO = ?, FOTO_URL = ?, ESPECIALIDAD = ?, ESTADO = ?
       WHERE ID_AGENTE = ?`,
      [ID_USUARIO, NOMBRE.trim(), CARGO.trim(), TELEFONO.trim(), CORREO.trim(), FOTO_URL, ESPECIALIDAD, ESTADO, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Agente no encontrado' });
    }

    res.status(200).json({ message: 'Agente actualizado con exito' });
  } catch (error) {
    console.error('Error al actualizar agente:', error);
    res.status(500).json({ error: 'Error al actualizar agente', detail: error.sqlMessage || error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM agentes WHERE ID_AGENTE = ?', [req.params.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Agente no encontrado' });
    }

    res.status(200).json({ message: 'Agente eliminado con exito' });
  } catch (error) {
    console.error('Error al eliminar agente:', error);
    res.status(500).json({ error: 'Error al eliminar agente' });
  }
});

module.exports = router;
