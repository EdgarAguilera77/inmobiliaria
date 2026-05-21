const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todos los objetos
router.get('/', async (req, res) => {
  try {
    const [objetos] = await db.query('SELECT * FROM objetos');
    res.status(200).json(objetos);
  } catch (err) {
    console.error('Error al obtener los objetos:', err);
    res.status(500).json({ message: 'Error al obtener los objetos', error: err.message });
  }
});

// Obtener un objeto específico
router.get('/:id', async (req, res) => {
  try {
    const [objeto] = await db.query('SELECT * FROM objetos WHERE ID_OBJETO = ?', [req.params.id]);
    if (objeto.length === 0) {
      return res.status(404).json({ error: 'Objeto no encontrado' });
    }
    res.status(200).json(objeto[0]);
  } catch (err) {
    console.error('Error al obtener el objeto:', err);
    res.status(500).json({ message: 'Error al obtener el objeto', error: err.message });
  }
});

// Crear nuevo objeto
router.post('/', async (req, res) => {
  const { nombre_objeto, descripcion_objeto } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO) VALUES (?, ?)',
      [nombre_objeto, descripcion_objeto]
    );
    res.status(201).json({ id: result.insertId, nombre_objeto, descripcion_objeto });
  } catch (err) {
    console.error('Error al crear el objeto:', err);
    res.status(500).json({ message: 'Error al crear el objeto', error: err.message });
  }
});

// Actualizar un objeto existente
router.put('/:id', async (req, res) => {
  const { nombre_objeto, descripcion_objeto } = req.body;
  const { id } = req.params;

  try {
    const [result] = await db.query(
      'UPDATE objetos SET NOMBRE_OBJETO = ?, DESCRIPCION_OBJETO = ? WHERE ID_OBJETO = ?',
      [nombre_objeto, descripcion_objeto, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Objeto no encontrado para actualizar' });
    }

    res.status(200).json({ message: 'Objeto actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar el objeto:', err);
    res.status(500).json({ message: 'Error al actualizar el objeto', error: err.message });
  }
});

// Eliminar un objeto
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM objetos WHERE ID_OBJETO = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Objeto no encontrado para eliminar' });
    }

    res.status(200).json({ message: 'Objeto eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar el objeto:', err);
    res.status(500).json({ message: 'Error al eliminar el objeto', error: err.message });
  }
});

module.exports = router;
