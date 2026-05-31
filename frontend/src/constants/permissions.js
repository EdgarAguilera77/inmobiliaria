import {
  faChartLine,
  faBuilding,
  faUserTie,
  faLayerGroup,
  faMapMarkedAlt,
  faImages,
  faEnvelopeOpenText,
  faUsers,
  faShieldHalved,
  faHandshake,
  faWallet,
  faClipboardList,
  faCreditCard,
} from '@fortawesome/free-solid-svg-icons';

export const MANAGED_PERMISSION_NAMES = ['VER', 'CREAR', 'ELIMINAR'];

export const ADMIN_PERMISSION_KEYS = [
  'Dashboard',
  'Propiedades',
  'Agentes',
  'TiposPropiedad',
  'Zonas',
  'Imagenes',
  'Contactos',
  'Usuarios',
  'AceptacionesLegales',
  'RolesPermisos',
  'Ventas',
  'Comisiones',
  'Planes',
  'Suscripciones',
  'PagosPublicacion',
];

export const OBJECT_LABELS = {
  Dashboard: 'Dashboard',
  Propiedades: 'Propiedades',
  Agentes: 'Agentes',
  TiposPropiedad: 'Tipos',
  Zonas: 'Zonas',
  Imagenes: 'Imagenes',
  Contactos: 'Solicitudes',
  Usuarios: 'Usuarios',
  AceptacionesLegales: 'Aceptaciones legales',
  RolesPermisos: 'Roles y permisos',
  Ventas: 'Ventas',
  Comisiones: 'Comisiones',
  Planes: 'Planes',
  Suscripciones: 'Suscripciones',
  PagosPublicacion: 'Pagos de publicacion',
};

export const ADMIN_MENU_ITEMS = [
  {
    name: 'Dashboard',
    path: '/admin',
    icon: faChartLine,
    permission: 'Dashboard',
  },
  {
    name: 'Propiedades',
    path: '/admin/propiedades',
    icon: faBuilding,
    permission: 'Propiedades',
  },
  {
    name: 'Agentes',
    path: '/admin/agentes',
    icon: faUserTie,
    permission: 'Agentes',
  },
  {
    name: 'Tipos',
    path: '/admin/tipos',
    icon: faLayerGroup,
    permission: 'TiposPropiedad',
  },
  {
    name: 'Zonas',
    path: '/admin/zonas',
    icon: faMapMarkedAlt,
    permission: 'Zonas',
  },
  {
    name: 'Imagenes',
    path: '/admin/imagenes',
    icon: faImages,
    permission: 'Imagenes',
  },
  {
    name: 'Solicitudes',
    path: '/admin/contactos',
    icon: faEnvelopeOpenText,
    permission: 'Contactos',
  },
  {
    name: 'Usuarios',
    path: '/admin/usuarios',
    icon: faUsers,
    permission: 'Usuarios',
  },
  {
    name: 'Aceptaciones legales',
    path: '/admin/aceptaciones-legales',
    icon: faClipboardList,
    permission: 'Usuarios',
  },
  {
    name: 'Roles y permisos',
    path: '/admin/roles-permisos',
    icon: faShieldHalved,
    permission: 'RolesPermisos',
  },
  {
    name: 'Ventas',
    path: '/admin/ventas',
    icon: faHandshake,
    permission: 'Ventas',
  },
  {
    name: 'Comisiones',
    path: '/admin/comisiones',
    icon: faWallet,
    permission: 'Comisiones',
  },
  {
    name: 'Planes',
    path: '/admin/planes',
    icon: faLayerGroup,
    permission: 'Planes',
  },
  {
    name: 'Suscripciones',
    path: '/admin/suscripciones',
    icon: faClipboardList,
    permission: 'Suscripciones',
  },
  {
    name: 'Pagos de publicacion',
    path: '/admin/pagos-publicacion',
    icon: faCreditCard,
    permission: 'PagosPublicacion',
  },
];

export const ADMIN_MENU_GROUPS = [
  {
    key: 'operacion',
    name: 'Operacion comercial',
    items: ['Propiedades', 'Ventas', 'Comisiones', 'Suscripciones', 'Pagos de publicacion', 'Solicitudes'],
  },
  {
    key: 'catalogos',
    name: 'Catalogos',
    items: ['Agentes', 'Tipos', 'Zonas', 'Imagenes', 'Planes'],
  },
  {
    key: 'seguridad',
    name: 'Seguridad',
    items: ['Usuarios', 'Aceptaciones legales', 'Roles y permisos'],
  },
];
