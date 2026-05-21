const express = require('express');
const cors = require('cors'); // Importa cors
const bodyParser = require('body-parser');

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
const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS
app.use(cors({
  origin: 'http://localhost:3000'  // Permite solicitudes desde localhost:3000
}));

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
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = { app, server };
