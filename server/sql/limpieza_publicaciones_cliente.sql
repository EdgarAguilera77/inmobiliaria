USE inmobiliaria_db;

START TRANSACTION;

-- Verificacion previa
SELECT COUNT(*) AS total_pagos_publicacion FROM pagos_suscripcion;
SELECT COUNT(*) AS total_suscripciones_publicacion FROM suscripciones_publicacion;
SELECT ID_PROPIEDAD, TITULO, ESTADO_PUBLICACION
FROM propiedades
ORDER BY ID_PROPIEDAD;

-- 1. Eliminar pagos de publicacion
DELETE FROM pagos_suscripcion;

-- 2. Eliminar suscripciones de publicacion
DELETE FROM suscripciones_publicacion;

-- 3. Reiniciar estado de publicacion para dejar propiedades en borrador
UPDATE propiedades
SET ESTADO_PUBLICACION = 'Borrador'
WHERE ESTADO_PUBLICACION IN ('Pendiente de pago', 'Publicada', 'Vencida', 'Pausada');

-- 4. Si alguna propiedad estaba inactiva, conservar su logica comercial
UPDATE propiedades
SET ESTADO_PUBLICACION = 'Borrador'
WHERE ACTIVA = 0;

-- Verificacion final
SELECT COUNT(*) AS pagos_restantes FROM pagos_suscripcion;
SELECT COUNT(*) AS suscripciones_restantes FROM suscripciones_publicacion;
SELECT ID_PROPIEDAD, TITULO, ESTADO_PUBLICACION
FROM propiedades
ORDER BY ID_PROPIEDAD;

COMMIT;
