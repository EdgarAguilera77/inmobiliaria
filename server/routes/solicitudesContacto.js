const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT sc.ID_SOLICITUD, sc.ID_PROPIEDAD, sc.NOMBRE, sc.CORREO, sc.TELEFONO, sc.MENSAJE,
              sc.ESTADO, sc.FECHA_CREACION, sc.FECHA_ACTUALIZACION,
              p.TITULO AS PROPIEDAD_TITULO, p.SLUG AS PROPIEDAD_SLUG
       FROM solicitudes_contacto sc
       LEFT JOIN propiedades p ON p.ID_PROPIEDAD = sc.ID_PROPIEDAD
       ORDER BY sc.FECHA_CREACION DESC`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ID_SOLICITUD, ID_PROPIEDAD, NOMBRE, CORREO, TELEFONO, MENSAJE,
              ESTADO, FECHA_CREACION, FECHA_ACTUALIZACION
       FROM solicitudes_contacto
       WHERE ID_SOLICITUD = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    res.status(500).json({ error: 'Error al obtener solicitud' });
  }
});

router.post('/', async (req, res) => {
  const { ID_PROPIEDAD = null, NOMBRE, CORREO, TELEFONO, MENSAJE, ESTADO = 'Nuevo' } = req.body;

  if (!NOMBRE || !CORREO || !TELEFONO || !MENSAJE) {
    return res.status(400).json({ error: 'Nombre, correo, telefono y mensaje son obligatorios' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO solicitudes_contacto (ID_PROPIEDAD, NOMBRE, CORREO, TELEFONO, MENSAJE, ESTADO)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ID_PROPIEDAD, NOMBRE.trim(), CORREO.trim(), TELEFONO.trim(), MENSAJE, ESTADO]
    );

    res.status(201).json({ message: 'Solicitud creada con exito', id: result.insertId });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
});

router.patch('/:id/estado', async (req, res) => {
  const { ESTADO } = req.body;

  if (!ESTADO) {
    return res.status(400).json({ error: 'El estado es obligatorio' });
  }

  try {
    const [result] = await db.query(
      `UPDATE solicitudes_contacto
       SET ESTADO = ?
       WHERE ID_SOLICITUD = ?`,
      [ESTADO, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.status(200).json({ message: 'Estado de solicitud actualizado con exito' });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    res.status(500).json({ error: 'Error al actualizar solicitud' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM solicitudes_contacto WHERE ID_SOLICITUD = ?',
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.status(200).json({ message: 'Solicitud eliminada con exito' });
  } catch (error) {
    console.error('Error al eliminar solicitud:', error);
    res.status(500).json({ error: 'Error al eliminar solicitud' });
  }
});

module.exports = router;

