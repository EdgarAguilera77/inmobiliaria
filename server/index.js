require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const usuarioRoutes = require('./routes/usuarios');
const securityRoutes = require('./routes/security');
const objetosRoutes= require('./routes/objetos');
const permisosRoutes = require('./routes/permisos');
const rolesPermisosRoutes = require('./routes/rolesPermisos');
const tiposPropiedadRoutes = require('./routes/tiposPropiedad');
const zonasRoutes = require('./routes/zonas');
const agentesRoutes = require('./routes/agentes');
const propiedadesRoutes = require('./routes/propiedades');
const propiedadImagenesRoutes = require('./routes/propiedadImagenes');
const solicitudesContactoRoutes = require('./routes/solicitudesContacto');
const uploadRoutes = require('./routes/uploads');
const ventasRoutes = require('./routes/ventas');
const comisionesRoutes = require('./routes/comisiones');
const planesRoutes = require('./routes/planes');
const suscripcionesRoutes = require('./routes/suscripciones');
const pagosPublicacionRoutes = require('./routes/pagosPublicacion');
const legalTermsRoutes = require('./routes/legalTerms');
const ensureLegalTermsSchema = require('./utils/ensureLegalTermsSchema');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
const allowedOrigins = [
  'http://localhost:3000',
  'https://globaljm.cloud',
  'https://www.globaljm.cloud',
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(bodyParser.json({ limit: '15mb' }));

app.use('/usuarios', usuarioRoutes);
app.use('/security', securityRoutes);
app.use('/objetos', objetosRoutes);
app.use('/permisos', permisosRoutes);
app.use('/rolesPermisos', rolesPermisosRoutes);
app.use('/tipos-propiedad', tiposPropiedadRoutes);
app.use('/zonas', zonasRoutes);
app.use('/agentes', agentesRoutes);
app.use('/propiedades', propiedadesRoutes);
app.use('/propiedad-imagenes', propiedadImagenesRoutes);
app.use('/solicitudes-contacto', solicitudesContactoRoutes);
app.use('/uploads', uploadRoutes);
app.use('/ventas', ventasRoutes);
app.use('/comisiones', comisionesRoutes);
app.use('/planes', planesRoutes);
app.use('/suscripciones', suscripcionesRoutes);
app.use('/pagos-publicacion', pagosPublicacionRoutes);
app.use('/legal-terms', legalTermsRoutes);

let server;

const startServer = async () => {
  try {
    await ensureLegalTermsSchema();
    server = app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, server };
