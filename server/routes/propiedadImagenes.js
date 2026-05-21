const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/propiedad/:idPropiedad', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ID_IMAGEN, ID_PROPIEDAD, URL_IMAGEN, TEXTO_ALTERNATIVO, ORDEN_VISUAL, ES_PORTADA, FECHA_CREACION
       FROM propiedad_imagenes
       WHERE ID_PROPIEDAD = ?
       ORDER BY ORDEN_VISUAL ASC, ID_IMAGEN ASC`,
      [req.params.idPropiedad]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener imagenes de propiedad:', error);
    res.status(500).json({ error: 'Error al obtener imagenes de propiedad' });
  }
});

router.post('/', async (req, res) => {
  const {
    ID_PROPIEDAD,
    URL_IMAGEN,
    TEXTO_ALTERNATIVO = '',
    ORDEN_VISUAL = 1,
    ES_PORTADA = 0,
  } = req.body;

  if (!ID_PROPIEDAD || !URL_IMAGEN) {
    return res.status(400).json({ error: 'La propiedad y la URL de imagen son obligatorias' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO propiedad_imagenes (ID_PROPIEDAD, URL_IMAGEN, TEXTO_ALTERNATIVO, ORDEN_VISUAL, ES_PORTADA)
       VALUES (?, ?, ?, ?, ?)`,
      [ID_PROPIEDAD, URL_IMAGEN, TEXTO_ALTERNATIVO, ORDEN_VISUAL, ES_PORTADA]
    );

    if (Number(ES_PORTADA) === 1) {
      await db.query(
        `UPDATE propiedades SET IMAGEN_PORTADA = ? WHERE ID_PROPIEDAD = ?`,
        [URL_IMAGEN, ID_PROPIEDAD]
      );
    }

    res.status(201).json({ message: 'Imagen agregada con exito', id: result.insertId });
  } catch (error) {
    console.error('Error al agregar imagen:', error);
    res.status(500).json({ error: 'Error al agregar imagen' });
  }
});

router.put('/:id', async (req, res) => {
  const {
    URL_IMAGEN,
    TEXTO_ALTERNATIVO = '',
    ORDEN_VISUAL = 1,
    ES_PORTADA = 0,
  } = req.body;

  if (!URL_IMAGEN) {
    return res.status(400).json({ error: 'La URL de imagen es obligatoria' });
  }

  try {
    const [currentRows] = await db.query(
      'SELECT ID_PROPIEDAD FROM propiedad_imagenes WHERE ID_IMAGEN = ?',
      [req.params.id]
    );

    if (!currentRows.length) {
      return res.status(404).json({ error: 'Imagen no encontrada' });
    }

    const propertyId = currentRows[0].ID_PROPIEDAD;
    const [result] = await db.query(
      `UPDATE propiedad_imagenes
       SET URL_IMAGEN = ?, TEXTO_ALTERNATIVO = ?, ORDEN_VISUAL = ?, ES_PORTADA = ?
       WHERE ID_IMAGEN = ?`,
      [URL_IMAGEN, TEXTO_ALTERNATIVO, ORDEN_VISUAL, ES_PORTADA, req.params.id]
    );

    if (Number(ES_PORTADA) === 1) {
      await db.query(
        `UPDATE propiedades SET IMAGEN_PORTADA = ? WHERE ID_PROPIEDAD = ?`,
        [URL_IMAGEN, propertyId]
      );
    }

    res.status(200).json({ message: 'Imagen actualizada con exito', affectedRows: result.affectedRows });
  } catch (error) {
    console.error('Error al actualizar imagen:', error);
    res.status(500).json({ error: 'Error al actualizar imagen' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM propiedad_imagenes WHERE ID_IMAGEN = ?', [req.params.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Imagen no encontrada' });
    }

    res.status(200).json({ message: 'Imagen eliminada con exito' });
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

module.exports = router;

