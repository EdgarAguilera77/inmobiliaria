const express = require('express');
const router = express.Router();
const db = require('../db');
const slugify = require('../utils/slugify');

router.get('/', async (req, res) => {
  try {
    const filters = [];
    const values = [];

    if (req.query.activo !== undefined) {
      filters.push('ESTADO = ?');
      values.push(Number(req.query.activo));
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT ID_PLAN, NOMBRE, SLUG, DESCRIPCION, PRECIO, DURACION_DIAS, LIMITE_IMAGENES,
              ADMITE_DESTACADA, NIVEL_PRIORIDAD, ESTADO, FECHA_CREACION, FECHA_ACTUALIZACION
       FROM planes_publicacion
       ${whereClause}
       ORDER BY NIVEL_PRIORIDAD DESC, PRECIO ASC, ID_PLAN DESC`,
      values
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

router.post('/', async (req, res) => {
  const {
    NOMBRE,
    DESCRIPCION = null,
    PRECIO = 0,
    DURACION_DIAS = 30,
    LIMITE_IMAGENES = 10,
    ADMITE_DESTACADA = 0,
    NIVEL_PRIORIDAD = 1,
    ESTADO = 1,
  } = req.body;

  if (!NOMBRE) {
    return res.status(400).json({ error: 'El nombre del plan es obligatorio.' });
  }

  try {
    const slug = slugify(NOMBRE);
    const [result] = await db.query(
      `INSERT INTO planes_publicacion (
        NOMBRE, SLUG, DESCRIPCION, PRECIO, DURACION_DIAS,
        LIMITE_IMAGENES, ADMITE_DESTACADA, NIVEL_PRIORIDAD, ESTADO
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        NOMBRE.trim(),
        slug,
        DESCRIPCION,
        Number(PRECIO) || 0,
        Number(DURACION_DIAS) || 30,
        Number(LIMITE_IMAGENES) || 10,
        ADMITE_DESTACADA ? 1 : 0,
        Number(NIVEL_PRIORIDAD) || 1,
        ESTADO ? 1 : 0,
      ]
    );

    res.status(201).json({ message: 'Plan creado con exito', id: result.insertId });
  } catch (error) {
    console.error('Error al crear plan:', error);
    res.status(500).json({ error: 'Error al crear plan' });
  }
});

router.put('/:id', async (req, res) => {
  const {
    NOMBRE,
    DESCRIPCION = null,
    PRECIO = 0,
    DURACION_DIAS = 30,
    LIMITE_IMAGENES = 10,
    ADMITE_DESTACADA = 0,
    NIVEL_PRIORIDAD = 1,
    ESTADO = 1,
  } = req.body;

  if (!NOMBRE) {
    return res.status(400).json({ error: 'El nombre del plan es obligatorio.' });
  }

  try {
    const slug = slugify(NOMBRE);
    const [result] = await db.query(
      `UPDATE planes_publicacion
       SET NOMBRE = ?, SLUG = ?, DESCRIPCION = ?, PRECIO = ?, DURACION_DIAS = ?,
           LIMITE_IMAGENES = ?, ADMITE_DESTACADA = ?, NIVEL_PRIORIDAD = ?, ESTADO = ?
       WHERE ID_PLAN = ?`,
      [
        NOMBRE.trim(),
        slug,
        DESCRIPCION,
        Number(PRECIO) || 0,
        Number(DURACION_DIAS) || 30,
        Number(LIMITE_IMAGENES) || 10,
        ADMITE_DESTACADA ? 1 : 0,
        Number(NIVEL_PRIORIDAD) || 1,
        ESTADO ? 1 : 0,
        req.params.id,
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Plan no encontrado.' });
    }

    res.status(200).json({ message: 'Plan actualizado con exito' });
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM planes_publicacion WHERE ID_PLAN = ?', [
      req.params.id,
    ]);

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Plan no encontrado.' });
    }

    res.status(200).json({ message: 'Plan eliminado con exito' });
  } catch (error) {
    console.error('Error al eliminar plan:', error);
    res.status(500).json({ error: 'Error al eliminar plan' });
  }
});

module.exports = router;
