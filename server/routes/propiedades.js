const express = require('express');
const router = express.Router();
const db = require('../db');
const slugify = require('../utils/slugify');
const {
  recalculatePropertyPublicationState,
  syncPublicationStateForAllProperties,
} = require('../utils/publication');

const basePropertySelect = `
  SELECT p.ID_PROPIEDAD, p.ID_TIPO_PROPIEDAD, p.ID_ZONA, p.ID_AGENTE, p.TITULO, p.SLUG, p.OPERACION,
         p.PRECIO, p.HABITACIONES, p.BANOS, p.ESTACIONAMIENTOS, p.AREA_M2, p.DIRECCION,
         p.DESCRIPCION, p.IMAGEN_PORTADA, p.DESTACADA, p.ACTIVA, p.ESTADO_COMERCIAL, p.ESTADO_PUBLICACION, p.FECHA_PUBLICACION,
         p.FECHA_CREACION, p.FECHA_ACTUALIZACION,
         tp.NOMBRE AS TIPO_NOMBRE, tp.SLUG AS TIPO_SLUG,
         z.NOMBRE AS ZONA_NOMBRE, z.CIUDAD AS ZONA_CIUDAD, z.SLUG AS ZONA_SLUG,
         a.NOMBRE AS AGENTE_NOMBRE, a.CORREO AS AGENTE_CORREO, a.TELEFONO AS AGENTE_TELEFONO,
         a.FOTO_URL AS AGENTE_FOTO_URL, a.CARGO AS AGENTE_CARGO
  FROM propiedades p
  INNER JOIN tipos_propiedad tp ON tp.ID_TIPO_PROPIEDAD = p.ID_TIPO_PROPIEDAD
  INNER JOIN zonas z ON z.ID_ZONA = p.ID_ZONA
  INNER JOIN agentes a ON a.ID_AGENTE = p.ID_AGENTE
`;

const mapProperty = (row, images = []) => ({
  ID_PROPIEDAD: row.ID_PROPIEDAD,
  ID_TIPO_PROPIEDAD: row.ID_TIPO_PROPIEDAD,
  ID_ZONA: row.ID_ZONA,
  ID_AGENTE: row.ID_AGENTE,
  TITULO: row.TITULO,
  SLUG: row.SLUG,
  OPERACION: row.OPERACION,
  PRECIO: row.PRECIO,
  HABITACIONES: row.HABITACIONES,
  BANOS: row.BANOS,
  ESTACIONAMIENTOS: row.ESTACIONAMIENTOS,
  AREA_M2: row.AREA_M2,
  DIRECCION: row.DIRECCION,
  DESCRIPCION: row.DESCRIPCION,
  IMAGEN_PORTADA: row.IMAGEN_PORTADA,
  DESTACADA: row.DESTACADA,
  ACTIVA: row.ACTIVA,
  ESTADO_COMERCIAL: row.ESTADO_COMERCIAL,
  ESTADO_PUBLICACION: row.ESTADO_PUBLICACION,
  FECHA_PUBLICACION: row.FECHA_PUBLICACION,
  FECHA_CREACION: row.FECHA_CREACION,
  FECHA_ACTUALIZACION: row.FECHA_ACTUALIZACION,
  TIPO: {
    NOMBRE: row.TIPO_NOMBRE,
    SLUG: row.TIPO_SLUG,
  },
  ZONA: {
    NOMBRE: row.ZONA_NOMBRE,
    CIUDAD: row.ZONA_CIUDAD,
    SLUG: row.ZONA_SLUG,
  },
  AGENTE: {
    NOMBRE: row.AGENTE_NOMBRE,
    CORREO: row.AGENTE_CORREO,
    TELEFONO: row.AGENTE_TELEFONO,
    FOTO_URL: row.AGENTE_FOTO_URL,
    CARGO: row.AGENTE_CARGO,
  },
  IMAGENES: images,
});

const getPropertyImages = async (propertyId) => {
  const [images] = await db.query(
    `SELECT ID_IMAGEN, URL_IMAGEN, TEXTO_ALTERNATIVO, ORDEN_VISUAL, ES_PORTADA, FECHA_CREACION
     FROM propiedad_imagenes
     WHERE ID_PROPIEDAD = ?
     ORDER BY ORDEN_VISUAL ASC, ID_IMAGEN ASC`,
    [propertyId]
  );

  return images;
};

router.get('/', async (req, res) => {
  try {
    await syncPublicationStateForAllProperties();
    const filters = [];
    const values = [];

    if (req.query.activa !== undefined) {
      filters.push('p.ACTIVA = ?');
      values.push(Number(req.query.activa));
    }

    if (req.query.destacada !== undefined) {
      filters.push('p.DESTACADA = ?');
      values.push(Number(req.query.destacada));
    }

    if (req.query.tipoId) {
      filters.push('p.ID_TIPO_PROPIEDAD = ?');
      values.push(Number(req.query.tipoId));
    }

    if (req.query.estadoComercial) {
      filters.push('p.ESTADO_COMERCIAL = ?');
      values.push(req.query.estadoComercial);
    }

    if (req.query.estadoPublicacion) {
      filters.push('p.ESTADO_PUBLICACION = ?');
      values.push(req.query.estadoPublicacion);
    }

    if (req.query.zonaId) {
      filters.push('p.ID_ZONA = ?');
      values.push(Number(req.query.zonaId));
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await db.query(
      `${basePropertySelect} ${whereClause} ORDER BY p.FECHA_CREACION DESC`,
      values
    );

    res.status(200).json(rows.map((row) => mapProperty(row)));
  } catch (error) {
    console.error('Error al obtener propiedades:', error);
    res.status(500).json({ error: 'Error al obtener propiedades' });
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    await syncPublicationStateForAllProperties();
    const [rows] = await db.query(`${basePropertySelect} WHERE p.SLUG = ?`, [req.params.slug]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const images = await getPropertyImages(rows[0].ID_PROPIEDAD);
    res.status(200).json(mapProperty(rows[0], images));
  } catch (error) {
    console.error('Error al obtener propiedad por slug:', error);
    res.status(500).json({ error: 'Error al obtener propiedad por slug' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    await syncPublicationStateForAllProperties();
    const [rows] = await db.query(`${basePropertySelect} WHERE p.ID_PROPIEDAD = ?`, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const images = await getPropertyImages(req.params.id);
    res.status(200).json(mapProperty(rows[0], images));
  } catch (error) {
    console.error('Error al obtener propiedad:', error);
    res.status(500).json({ error: 'Error al obtener propiedad' });
  }
});

router.post('/', async (req, res) => {
  const {
    ID_TIPO_PROPIEDAD,
    ID_ZONA,
    ID_AGENTE,
    TITULO,
    OPERACION,
    PRECIO = 0,
    HABITACIONES = 0,
    BANOS = 0,
    ESTACIONAMIENTOS = 0,
    AREA_M2 = 0,
    DIRECCION,
    DESCRIPCION,
    IMAGEN_PORTADA = null,
    DESTACADA = 0,
    ACTIVA = 1,
    ESTADO_COMERCIAL = ACTIVA ? 'Disponible' : 'Inactiva',
    ESTADO_PUBLICACION = 'Borrador',
  } = req.body;

  if (!ID_TIPO_PROPIEDAD || !ID_ZONA || !ID_AGENTE || !TITULO || !DIRECCION || !OPERACION) {
    return res.status(400).json({ error: 'Faltan datos obligatorios de la propiedad' });
  }

  try {
    const slug = slugify(TITULO);
    const [result] = await db.query(
      `INSERT INTO propiedades (
        ID_TIPO_PROPIEDAD, ID_ZONA, ID_AGENTE, TITULO, SLUG, OPERACION, PRECIO,
        HABITACIONES, BANOS, ESTACIONAMIENTOS, AREA_M2, DIRECCION, DESCRIPCION,
        IMAGEN_PORTADA, DESTACADA, ACTIVA, ESTADO_COMERCIAL, ESTADO_PUBLICACION
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ID_TIPO_PROPIEDAD,
        ID_ZONA,
        ID_AGENTE,
        TITULO.trim(),
        slug,
        OPERACION,
        PRECIO,
        HABITACIONES,
        BANOS,
        ESTACIONAMIENTOS,
        AREA_M2,
        DIRECCION.trim(),
        DESCRIPCION || '',
        IMAGEN_PORTADA,
        DESTACADA,
        ACTIVA,
        ESTADO_COMERCIAL,
        ESTADO_PUBLICACION,
      ]
    );

    res.status(201).json({ message: 'Propiedad creada con exito', id: result.insertId });
  } catch (error) {
    console.error('Error al crear propiedad:', error);
    res.status(500).json({ error: 'Error al crear propiedad' });
  }
});

router.put('/:id', async (req, res) => {
  const {
    ID_TIPO_PROPIEDAD,
    ID_ZONA,
    ID_AGENTE,
    TITULO,
    OPERACION,
    PRECIO = 0,
    HABITACIONES = 0,
    BANOS = 0,
    ESTACIONAMIENTOS = 0,
    AREA_M2 = 0,
    DIRECCION,
    DESCRIPCION,
    IMAGEN_PORTADA = null,
    DESTACADA = 0,
    ACTIVA = 1,
    ESTADO_COMERCIAL = ACTIVA ? 'Disponible' : 'Inactiva',
    ESTADO_PUBLICACION = 'Borrador',
  } = req.body;

  if (!ID_TIPO_PROPIEDAD || !ID_ZONA || !ID_AGENTE || !TITULO || !DIRECCION || !OPERACION) {
    return res.status(400).json({ error: 'Faltan datos obligatorios de la propiedad' });
  }

  try {
    const slug = slugify(TITULO);
    const [result] = await db.query(
      `UPDATE propiedades
       SET ID_TIPO_PROPIEDAD = ?, ID_ZONA = ?, ID_AGENTE = ?, TITULO = ?, SLUG = ?, OPERACION = ?,
           PRECIO = ?, HABITACIONES = ?, BANOS = ?, ESTACIONAMIENTOS = ?, AREA_M2 = ?, DIRECCION = ?,
           DESCRIPCION = ?, IMAGEN_PORTADA = ?, DESTACADA = ?, ACTIVA = ?, ESTADO_COMERCIAL = ?, ESTADO_PUBLICACION = ?
       WHERE ID_PROPIEDAD = ?`,
      [
        ID_TIPO_PROPIEDAD,
        ID_ZONA,
        ID_AGENTE,
        TITULO.trim(),
        slug,
        OPERACION,
        PRECIO,
        HABITACIONES,
        BANOS,
        ESTACIONAMIENTOS,
        AREA_M2,
        DIRECCION.trim(),
        DESCRIPCION || '',
        IMAGEN_PORTADA,
        DESTACADA,
        ACTIVA,
        ESTADO_COMERCIAL,
        ESTADO_PUBLICACION,
        req.params.id,
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.status(200).json({ message: 'Propiedad actualizada con exito' });
  } catch (error) {
    console.error('Error al actualizar propiedad:', error);
    res.status(500).json({ error: 'Error al actualizar propiedad' });
  }
});

router.patch('/:id/toggle-destacada', async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE propiedades
       SET DESTACADA = CASE WHEN DESTACADA = 1 THEN 0 ELSE 1 END
       WHERE ID_PROPIEDAD = ?`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.status(200).json({ message: 'Estado destacada actualizado con exito' });
  } catch (error) {
    console.error('Error al cambiar destacada:', error);
    res.status(500).json({ error: 'Error al cambiar destacada' });
  }
});

router.patch('/:id/toggle-activa', async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE propiedades
       SET ACTIVA = CASE WHEN ACTIVA = 1 THEN 0 ELSE 1 END
       WHERE ID_PROPIEDAD = ?`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    await recalculatePropertyPublicationState(Number(req.params.id));

    res.status(200).json({ message: 'Estado activa actualizado con exito' });
  } catch (error) {
    console.error('Error al cambiar activa:', error);
    res.status(500).json({ error: 'Error al cambiar activa' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM propiedades WHERE ID_PROPIEDAD = ?', [req.params.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.status(200).json({ message: 'Propiedad eliminada con exito' });
  } catch (error) {
    console.error('Error al eliminar propiedad:', error);
    res.status(500).json({ error: 'Error al eliminar propiedad' });
  }
});

module.exports = router;
