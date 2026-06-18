const express = require('express');
const db = require('../db');
const { TERMS_TEXT, TERMS_TITLE, TERMS_VERSION } = require('../utils/legalTerms');

const router = express.Router();

router.get('/history', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          at.ID_ACEPTACION,
          at.CODIGO_USUARIO,
          gu.NOMBRE,
          gu.CORREO,
          at.VERSION_TERMINOS,
          at.TITULO_TERMINOS,
          at.TEXTO_ACEPTADO,
          at.TIPO_ACEPTACION,
          at.FECHA_ACEPTACION
        FROM aceptaciones_terminos at
        INNER JOIN gestion_usuarios gu
          ON gu.CODIGO = at.CODIGO_USUARIO
        ORDER BY at.FECHA_ACEPTACION DESC, at.ID_ACEPTACION DESC
      `
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error al consultar el historial de terminos:', error);
    return res.status(500).json({ error: 'No se pudo consultar el historial de terminos.' });
  }
});

router.get('/status/:codigo', async (req, res) => {
  const { codigo } = req.params;

  try {
    const [userRows] = await db.query(
      `
        SELECT CODIGO, NOMBRE, REQUIERE_ACEPTACION_TERMINOS
        FROM gestion_usuarios
        WHERE CODIGO = ?
      `,
      [codigo]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = userRows[0];

    const [acceptanceRows] = await db.query(
      `
        SELECT ID_ACEPTACION, VERSION_TERMINOS, FECHA_ACEPTACION
        FROM aceptaciones_terminos
        WHERE CODIGO_USUARIO = ? AND VERSION_TERMINOS = ?
        ORDER BY FECHA_ACEPTACION DESC
        LIMIT 1
      `,
      [codigo, TERMS_VERSION]
    );

    const accepted = acceptanceRows.length > 0;
    const required = Number(user.REQUIERE_ACEPTACION_TERMINOS) === 1 && !accepted;

    return res.status(200).json({
      required,
      accepted,
      acceptedAt: acceptanceRows[0]?.FECHA_ACEPTACION || null,
      document: {
        version: TERMS_VERSION,
        title: TERMS_TITLE,
        text: TERMS_TEXT.trim(),
      },
    });
  } catch (error) {
    console.error('Error al consultar el estado de terminos:', error);
    return res.status(500).json({ error: 'No se pudo consultar el estado de terminos.' });
  }
});

router.post('/accept', async (req, res) => {
  const { codigoUsuario, acceptedByName } = req.body;

  if (!codigoUsuario) {
    return res.status(400).json({ error: 'El codigo del usuario es obligatorio.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [userRows] = await connection.query(
      `
        SELECT CODIGO, NOMBRE, REQUIERE_ACEPTACION_TERMINOS
        FROM gestion_usuarios
        WHERE CODIGO = ?
        FOR UPDATE
      `,
      [codigoUsuario]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = userRows[0];

    const [existingAcceptance] = await connection.query(
      `
        SELECT ID_ACEPTACION
        FROM aceptaciones_terminos
        WHERE CODIGO_USUARIO = ? AND VERSION_TERMINOS = ?
        LIMIT 1
      `,
      [codigoUsuario, TERMS_VERSION]
    );

    if (existingAcceptance.length === 0) {
      await connection.query(
        `
          INSERT INTO aceptaciones_terminos
          (CODIGO_USUARIO, VERSION_TERMINOS, TITULO_TERMINOS, TEXTO_ACEPTADO, TIPO_ACEPTACION)
          VALUES (?, ?, ?, ?, 'PRIMER_INGRESO')
        `,
        [
          codigoUsuario,
          TERMS_VERSION,
          TERMS_TITLE,
          TERMS_TEXT.trim(),
        ]
      );
    }

    await connection.query(
      `
        UPDATE gestion_usuarios
        SET REQUIERE_ACEPTACION_TERMINOS = 0
        WHERE CODIGO = ?
      `,
      [codigoUsuario]
    );

    await connection.commit();

    return res.status(200).json({
      message: 'Aceptacion de terminos registrada correctamente.',
      version: TERMS_VERSION,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar la aceptacion de terminos:', error);
    return res.status(500).json({ error: 'No se pudo registrar la aceptacion de terminos.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
