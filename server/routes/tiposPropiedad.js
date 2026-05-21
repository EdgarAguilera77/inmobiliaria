const express = require('express');
const router = express.Router();
const db = require('../db');
const slugify = require('../utils/slugify');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ID_TIPO_PROPIEDAD, NOMBRE, SLUG, DESCRIPCION, ESTADO, FECHA_CREACION, FECHA_ACTUALIZACION
       FROM tipos_propiedad
       ORDER BY NOMBRE ASC`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener tipos de propiedad:', error);
    res.status(500).json({ error: 'Error al obtener tipos de propiedad' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ID_TIPO_PROPIEDAD, NOMBRE, SLUG, DESCRIPCION, ESTADO, FECHA_CREACION, FECHA_ACTUALIZACION
       FROM tipos_propiedad
       WHERE ID_TIPO_PROPIEDAD = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Tipo de propiedad no encontrado' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error al obtener tipo de propiedad:', error);
    res.status(500).json({ error: 'Error al obtener tipo de propiedad' });
  }
});

router.post('/', async (req, res) => {
  const { NOMBRE, DESCRIPCION = '', ESTADO = 1 } = req.body;

  if (!NOMBRE || !NOMBRE.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const slug = slugify(NOMBRE);
    const [result] = await db.query(
      `INSERT INTO tipos_propiedad (NOMBRE, SLUG, DESCRIPCION, ESTADO)
       VALUES (?, ?, ?, ?)`,
      [NOMBRE.trim(), slug, DESCRIPCION, ESTADO]
    );

    res.status(201).json({
      message: 'Tipo de propiedad creado con exito',
      id: result.insertId,
    });
  } catch (error) {
    console.error('Error al crear tipo de propiedad:', error);
    res.status(500).json({ error: 'Error al crear tipo de propiedad' });
  }
});

router.put('/:id', async (req, res) => {
  const { NOMBRE, DESCRIPCION = '', ESTADO = 1 } = req.body;

  if (!NOMBRE || !NOMBRE.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const slug = slugify(NOMBRE);
    const [result] = await db.query(
      `UPDATE tipos_propiedad
       SET NOMBRE = ?, SLUG = ?, DESCRIPCION = ?, ESTADO = ?
       WHERE ID_TIPO_PROPIEDAD = ?`,
      [NOMBRE.trim(), slug, DESCRIPCION, ESTADO, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Tipo de propiedad no encontrado' });
    }

    res.status(200).json({ message: 'Tipo de propiedad actualizado con exito' });
  } catch (error) {
    console.error('Error al actualizar tipo de propiedad:', error);
    res.status(500).json({ error: 'Error al actualizar tipo de propiedad' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM tipos_propiedad WHERE ID_TIPO_PROPIEDAD = ?',
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Tipo de propiedad no encontrado' });
    }

    res.status(200).json({ message: 'Tipo de propiedad eliminado con exito' });
  } catch (error) {
    console.error('Error al eliminar tipo de propiedad:', error);
    res.status(500).json({ error: 'Error al eliminar tipo de propiedad' });
  }
});

module.exports = router;

