const express = require('express');
const router = express.Router();
const db = require('../db');
const slugify = require('../utils/slugify');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ID_ZONA, NOMBRE, CIUDAD, SLUG, DESCRIPCION, ESTADO, FECHA_CREACION, FECHA_ACTUALIZACION
       FROM zonas
       ORDER BY CIUDAD ASC, NOMBRE ASC`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener zonas:', error);
    res.status(500).json({ error: 'Error al obtener zonas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ID_ZONA, NOMBRE, CIUDAD, SLUG, DESCRIPCION, ESTADO, FECHA_CREACION, FECHA_ACTUALIZACION
       FROM zonas
       WHERE ID_ZONA = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error al obtener zona:', error);
    res.status(500).json({ error: 'Error al obtener zona' });
  }
});

router.post('/', async (req, res) => {
  const { NOMBRE, CIUDAD, DESCRIPCION = '', ESTADO = 1 } = req.body;

  if (!NOMBRE || !NOMBRE.trim() || !CIUDAD || !CIUDAD.trim()) {
    return res.status(400).json({ error: 'El nombre y la ciudad son obligatorios' });
  }

  try {
    const slug = slugify(`${NOMBRE}-${CIUDAD}`);
    const [result] = await db.query(
      `INSERT INTO zonas (NOMBRE, CIUDAD, SLUG, DESCRIPCION, ESTADO)
       VALUES (?, ?, ?, ?, ?)`,
      [NOMBRE.trim(), CIUDAD.trim(), slug, DESCRIPCION, ESTADO]
    );

    res.status(201).json({ message: 'Zona creada con exito', id: result.insertId });
  } catch (error) {
    console.error('Error al crear zona:', error);
    res.status(500).json({ error: 'Error al crear zona' });
  }
});

router.put('/:id', async (req, res) => {
  const { NOMBRE, CIUDAD, DESCRIPCION = '', ESTADO = 1 } = req.body;

  if (!NOMBRE || !NOMBRE.trim() || !CIUDAD || !CIUDAD.trim()) {
    return res.status(400).json({ error: 'El nombre y la ciudad son obligatorios' });
  }

  try {
    const slug = slugify(`${NOMBRE}-${CIUDAD}`);
    const [result] = await db.query(
      `UPDATE zonas
       SET NOMBRE = ?, CIUDAD = ?, SLUG = ?, DESCRIPCION = ?, ESTADO = ?
       WHERE ID_ZONA = ?`,
      [NOMBRE.trim(), CIUDAD.trim(), slug, DESCRIPCION, ESTADO, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }

    res.status(200).json({ message: 'Zona actualizada con exito' });
  } catch (error) {
    console.error('Error al actualizar zona:', error);
    res.status(500).json({ error: 'Error al actualizar zona' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM zonas WHERE ID_ZONA = ?', [req.params.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }

    res.status(200).json({ message: 'Zona eliminada con exito' });
  } catch (error) {
    console.error('Error al eliminar zona:', error);
    res.status(500).json({ error: 'Error al eliminar zona' });
  }
});

module.exports = router;

