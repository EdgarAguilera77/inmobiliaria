USE injupen_db;

SET NAMES utf8mb4;

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Dashboard', 'Panel principal administrativo de la inmobiliaria'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Dashboard'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Propiedades', 'Gestion de propiedades inmobiliarias'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Propiedades'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Agentes', 'Gestion y CRUD de agentes inmobiliarios'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Agentes'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'TiposPropiedad', 'Gestion y CRUD de tipos de propiedad'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'TiposPropiedad'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Zonas', 'Gestion y CRUD de ciudades o zonas inmobiliarias'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Zonas'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Imagenes', 'Gestion de imagenes de propiedades'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Imagenes'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Contactos', 'Gestion de solicitudes y contactos de clientes'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Contactos'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Usuarios', 'Gestion de usuarios administrativos del portal'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Usuarios'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'RolesPermisos', 'Gestion de roles y permisos del portal'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'RolesPermisos'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Ventas', 'Ventas de propiedades'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Ventas'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Comisiones', 'Comisiones por ventas'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Comisiones'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Planes', 'Planes de publicacion inmobiliaria'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Planes'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'Suscripciones', 'Suscripciones por propiedad'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'Suscripciones'
);

INSERT INTO objetos (NOMBRE_OBJETO, DESCRIPCION_OBJETO)
SELECT 'PagosPublicacion', 'Pagos de suscripciones'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM objetos WHERE NOMBRE_OBJETO = 'PagosPublicacion'
);

INSERT INTO roles_permisos_objetos (ID_ROL, ID_OBJETO, ID_PERMISO)
SELECT
  r.ID_ROL,
  o.ID_OBJETO,
  p.ID_PERMISO
FROM roles r
INNER JOIN objetos o
  ON o.NOMBRE_OBJETO IN (
    'Dashboard',
    'Propiedades',
    'Agentes',
    'TiposPropiedad',
    'Zonas',
    'Imagenes',
    'Contactos',
    'Usuarios',
    'RolesPermisos',
    'Ventas',
    'Comisiones',
    'Planes',
    'Suscripciones',
    'PagosPublicacion'
  )
INNER JOIN permisos p
  ON p.NOMBRE_PERMISO IN ('VER', 'CREAR', 'ELIMINAR')
LEFT JOIN roles_permisos_objetos rpo
  ON rpo.ID_ROL = r.ID_ROL
 AND rpo.ID_OBJETO = o.ID_OBJETO
 AND rpo.ID_PERMISO = p.ID_PERMISO
WHERE r.NOMBRE_ROL = 'Administrador'
  AND rpo.ID_ROL IS NULL;
