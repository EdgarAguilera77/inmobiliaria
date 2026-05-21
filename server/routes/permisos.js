const express = require('express');
const router = express.Router();
const db = require('../db'); // Asegúrate de que esta conexión esté correctamente configurada

// Obtener todos los permisos
router.get('/', async (req, res) => {
  try {
    const [permisos] = await db.query('SELECT * FROM permisos');
    res.status(200).json(permisos);
  } catch (err) {
    console.error('Error al obtener los permisos:', err);
    res.status(500).json({ message: 'Error al obtener los permisos', error: err.message });
  }
});

// Obtener un permiso específico por ID
router.get('/:id', async (req, res) => {
  try {
    const [permiso] = await db.query('SELECT * FROM permisos WHERE ID_PERMISO = ?', [req.params.id]);
    if (permiso.length === 0) {
      return res.status(404).json({ error: 'Permiso no encontrado' });
    }
    res.status(200).json(permiso[0]);
  } catch (err) {
    console.error('Error al obtener el permiso:', err);
    res.status(500).json({ message: 'Error al obtener el permiso', error: err.message });
  }
});

module.exports = router;
