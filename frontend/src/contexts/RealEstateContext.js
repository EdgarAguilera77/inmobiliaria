import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { companyProfile } from '../constants/realEstateSeed';
import { API_BASE } from '../constants/api';
const DEFAULT_COMMISSION_RATE = 5;

const RealEstateContext = createContext();

const api = axios.create({
  baseURL: API_BASE,
});

const mapType = (type) => ({
  id: type.ID_TIPO_PROPIEDAD,
  name: type.NOMBRE,
  slug: type.SLUG,
  description: type.DESCRIPCION || '',
  active: Number(type.ESTADO) === 1,
});

const mapZone = (zone) => ({
  id: zone.ID_ZONA,
  name: zone.NOMBRE,
  city: zone.CIUDAD,
  slug: zone.SLUG,
  description: zone.DESCRIPCION || '',
  active: Number(zone.ESTADO) === 1,
});

const mapAgent = (agent) => ({
  id: agent.ID_AGENTE,
  userId: agent.ID_USUARIO,
  name: agent.NOMBRE,
  role: agent.CARGO,
  phone: agent.TELEFONO,
  email: agent.CORREO,
  photo: agent.FOTO_URL,
  specialty: agent.ESPECIALIDAD || '',
  status: agent.ESTADO,
});

const mapProperty = (property) => ({
  id: property.ID_PROPIEDAD,
  typeId: property.ID_TIPO_PROPIEDAD,
  zoneId: property.ID_ZONA,
  agentId: property.ID_AGENTE,
  title: property.TITULO,
  slug: property.SLUG,
  operation: property.OPERACION,
  price: Number(property.PRECIO || 0),
  bedrooms: Number(property.HABITACIONES || 0),
  bathrooms: Number(property.BANOS || 0),
  parking: Number(property.ESTACIONAMIENTOS || 0),
  area: Number(property.AREA_M2 || 0),
  address: property.DIRECCION,
  description: property.DESCRIPCION,
  coverImage: property.IMAGEN_PORTADA,
  featured: Number(property.DESTACADA) === 1,
  active: Number(property.ACTIVA) === 1,
  commercialStatus: property.ESTADO_COMERCIAL || (Number(property.ACTIVA) === 1 ? 'Disponible' : 'Inactiva'),
  publicationStatus: property.ESTADO_PUBLICACION || 'Borrador',
  type: property.TIPO
    ? {
        name: property.TIPO.NOMBRE,
        slug: property.TIPO.SLUG,
      }
    : null,
  zone: property.ZONA
    ? {
        name: property.ZONA.NOMBRE,
        city: property.ZONA.CIUDAD,
        slug: property.ZONA.SLUG,
      }
    : null,
  agent: property.AGENTE
    ? {
        name: property.AGENTE.NOMBRE,
        email: property.AGENTE.CORREO,
        phone: property.AGENTE.TELEFONO,
        photo: property.AGENTE.FOTO_URL,
        role: property.AGENTE.CARGO,
      }
    : null,
  images: (property.IMAGENES || []).map((image) => image.URL_IMAGEN),
});

const mapContact = (contact) => ({
  id: contact.ID_SOLICITUD,
  propertyId: contact.ID_PROPIEDAD,
  name: contact.NOMBRE,
  email: contact.CORREO,
  phone: contact.TELEFONO,
  message: contact.MENSAJE,
  status: contact.ESTADO === 'Cerrado' ? 'Cerrada' : 'Abierta',
  createdAt: contact.FECHA_CREACION,
  propertyTitle: contact.PROPIEDAD_TITULO || null,
  propertySlug: contact.PROPIEDAD_SLUG || null,
});

const mapSale = (sale) => ({
  id: sale.ID_VENTA,
  propertyId: sale.ID_PROPIEDAD,
  agentId: sale.ID_AGENTE,
  propertyTitle: sale.PROPIEDAD_TITULO,
  propertySlug: sale.PROPIEDAD_SLUG,
  propertyCommercialStatus: sale.PROPIEDAD_ESTADO_COMERCIAL,
  agentName: sale.AGENTE_NOMBRE,
  clientName: sale.NOMBRE_CLIENTE,
  clientIdentity: sale.IDENTIDAD_CLIENTE || '',
  clientPhone: sale.TELEFONO_CLIENTE || '',
  clientEmail: sale.CORREO_CLIENTE || '',
  listingPrice: Number(sale.PRECIO_PUBLICADO || 0),
  closingPrice: Number(sale.PRECIO_CIERRE || 0),
  businessType: sale.TIPO_NEGOCIO,
  commissionRate: Number(sale.PORCENTAJE_COMISION || 0),
  commissionAmount: Number(sale.MONTO_COMISION || 0),
  closingDate: sale.FECHA_CIERRE,
  saleStatus: sale.ESTADO_VENTA,
  observations: sale.OBSERVACIONES || '',
  commissionId: sale.ID_COMISION || null,
  commissionStatus: sale.ESTADO_COMISION || 'Pendiente',
  commissionPaymentDate: sale.FECHA_PAGO || null,
});

const mapCommission = (commission) => ({
  id: commission.ID_COMISION,
  saleId: commission.ID_VENTA,
  propertyId: commission.ID_PROPIEDAD,
  agentId: commission.ID_AGENTE,
  propertyTitle: commission.PROPIEDAD_TITULO,
  propertySlug: commission.PROPIEDAD_SLUG,
  agentName: commission.AGENTE_NOMBRE,
  clientName: commission.NOMBRE_CLIENTE,
  closingPrice: Number(commission.PRECIO_CIERRE || 0),
  businessType: commission.TIPO_NEGOCIO,
  closingDate: commission.FECHA_CIERRE,
  commissionRate: Number(commission.PORCENTAJE_COMISION || 0),
  amount: Number(commission.MONTO_COMISION || 0),
  status: commission.ESTADO_COMISION,
  generatedAt: commission.FECHA_GENERACION,
  paidAt: commission.FECHA_PAGO || null,
  paymentNotes: commission.OBSERVACIONES_PAGO || '',
});

const mapPlan = (plan) => ({
  id: plan.ID_PLAN,
  name: plan.NOMBRE,
  slug: plan.SLUG,
  description: plan.DESCRIPCION || '',
  price: Number(plan.PRECIO || 0),
  durationDays: Number(plan.DURACION_DIAS || 0),
  imageLimit: Number(plan.LIMITE_IMAGENES || 0),
  allowsFeatured: Number(plan.ADMITE_DESTACADA) === 1,
  priorityLevel: Number(plan.NIVEL_PRIORIDAD || 1),
  active: Number(plan.ESTADO) === 1,
});

const mapSubscription = (subscription) => ({
  id: subscription.ID_SUSCRIPCION,
  propertyId: subscription.ID_PROPIEDAD,
  planId: subscription.ID_PLAN,
  agentId: subscription.ID_AGENTE,
  propertyTitle: subscription.PROPIEDAD_TITULO,
  propertySlug: subscription.PROPIEDAD_SLUG,
  propertyPublicationStatus: subscription.PROPIEDAD_ESTADO_PUBLICACION,
  planName: subscription.PLAN_NOMBRE,
  agentName: subscription.AGENTE_NOMBRE || '',
  planPrice: Number(subscription.PRECIO_PLAN || 0),
  finalPrice: Number(subscription.PRECIO_FINAL || 0),
  startDate: subscription.FECHA_INICIO,
  endDate: subscription.FECHA_FIN,
  status: subscription.ESTADO_SUSCRIPCION,
  autoRenew: Number(subscription.AUTO_RENOVAR) === 1,
  notes: subscription.OBSERVACIONES || '',
  totalPaid: Number(subscription.TOTAL_PAGADO || 0),
  totalPayments: Number(subscription.TOTAL_PAGOS || 0),
  imageLimit: Number(subscription.LIMITE_IMAGENES || 0),
  allowsFeatured: Number(subscription.ADMITE_DESTACADA) === 1,
  priorityLevel: Number(subscription.NIVEL_PRIORIDAD || 1),
});

const mapPublicationPayment = (payment) => ({
  id: payment.ID_PAGO,
  subscriptionId: payment.ID_SUSCRIPCION,
  propertyId: payment.ID_PROPIEDAD,
  planId: payment.ID_PLAN,
  propertyTitle: payment.PROPIEDAD_TITULO,
  planName: payment.PLAN_NOMBRE,
  subscriptionStatus: payment.ESTADO_SUSCRIPCION,
  amount: Number(payment.MONTO || 0),
  paymentMethod: payment.METODO_PAGO,
  reference: payment.REFERENCIA_PAGO || '',
  status: payment.ESTADO_PAGO,
  paidAt: payment.FECHA_PAGO || null,
  notes: payment.OBSERVACIONES || '',
  createdAt: payment.FECHA_CREACION,
});

const uniqueImages = (images = [], coverImage = '') => {
  const normalized = [coverImage, ...images]
    .map((item) => (item || '').trim())
    .filter(Boolean);
  return [...new Set(normalized)];
};

export const RealEstateProvider = ({ children }) => {
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [zones, setZones] = useState([]);
  const [agents, setAgents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [sales, setSales] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [publicationPayments, setPublicationPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshPropertyTypes = async () => {
    const response = await api.get('/tipos-propiedad');
    setPropertyTypes(response.data.map(mapType));
  };

  const refreshZones = async () => {
    const response = await api.get('/zonas');
    setZones(response.data.map(mapZone));
  };

  const refreshAgents = async () => {
    const response = await api.get('/agentes');
    setAgents(response.data.map(mapAgent));
  };

  const refreshContacts = async () => {
    const response = await api.get('/solicitudes-contacto');
    setContacts(response.data.map(mapContact));
  };

  const refreshProperties = async () => {
    const response = await api.get('/propiedades');
    const baseProperties = response.data.map(mapProperty);
    const propertiesWithImages = await Promise.all(
      baseProperties.map(async (property) => {
        try {
          const imagesResponse = await api.get(`/propiedad-imagenes/propiedad/${property.id}`);
          return {
            ...property,
            images: imagesResponse.data.map((image) => image.URL_IMAGEN),
          };
        } catch (fetchError) {
          return property;
        }
      })
    );
    setProperties(propertiesWithImages);
  };

  const refreshSales = async () => {
    const response = await api.get('/ventas');
    setSales(response.data.map(mapSale));
  };

  const refreshCommissions = async () => {
    const response = await api.get('/comisiones');
    setCommissions(response.data.map(mapCommission));
  };

  const refreshPlans = async () => {
    const response = await api.get('/planes');
    setPlans(response.data.map(mapPlan));
  };

  const refreshSubscriptions = async () => {
    const response = await api.get('/suscripciones');
    setSubscriptions(response.data.map(mapSubscription));
  };

  const refreshPublicationPayments = async () => {
    const response = await api.get('/pagos-publicacion');
    setPublicationPayments(response.data.map(mapPublicationPayment));
  };

  const refreshAll = async () => {
    setIsLoading(true);
    setError('');
    try {
      await Promise.all([
        refreshPropertyTypes(),
        refreshZones(),
        refreshAgents(),
        refreshProperties(),
        refreshContacts(),
        refreshSales(),
        refreshCommissions(),
        refreshPlans(),
        refreshSubscriptions(),
        refreshPublicationPayments(),
      ]);
    } catch (fetchError) {
      console.error('Error al cargar datos inmobiliarios:', fetchError);
      setError('No se pudo cargar la informacion inmobiliaria desde el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // Ejecutamos la carga inicial una sola vez al montar el provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncPropertyImages = async (propertyId, coverImage, images) => {
    const finalImages = uniqueImages(images, coverImage);
    const currentResponse = await api.get(`/propiedad-imagenes/propiedad/${propertyId}`);
    await Promise.all(
      currentResponse.data.map((image) => api.delete(`/propiedad-imagenes/${image.ID_IMAGEN}`))
    );

    await Promise.all(
      finalImages.map((imageUrl, index) =>
        api.post('/propiedad-imagenes', {
          ID_PROPIEDAD: propertyId,
          URL_IMAGEN: imageUrl,
          TEXTO_ALTERNATIVO: `Imagen ${index + 1}`,
          ORDEN_VISUAL: index + 1,
          ES_PORTADA: index === 0 ? 1 : 0,
        })
      )
    );
  };

  const saveProperty = async (property) => {
    const payload = {
      ID_TIPO_PROPIEDAD: Number(property.typeId),
      ID_ZONA: Number(property.zoneId),
      ID_AGENTE: Number(property.agentId),
      TITULO: property.title,
      OPERACION: property.operation,
      PRECIO: Number(property.price) || 0,
      HABITACIONES: Number(property.bedrooms) || 0,
      BANOS: Number(property.bathrooms) || 0,
      ESTACIONAMIENTOS: Number(property.parking) || 0,
      AREA_M2: Number(property.area) || 0,
      DIRECCION: property.address,
      DESCRIPCION: property.description || '',
      IMAGEN_PORTADA: property.coverImage,
      DESTACADA: property.featured ? 1 : 0,
      ACTIVA: property.active ? 1 : 0,
      ESTADO_PUBLICACION: property.publicationStatus || 'Borrador',
    };

    if (property.id) {
      await api.put(`/propiedades/${property.id}`, payload);
      await syncPropertyImages(property.id, property.coverImage, property.images || []);
    } else {
      const response = await api.post('/propiedades', payload);
      await syncPropertyImages(response.data.id, property.coverImage, property.images || []);
    }

    await refreshProperties();
  };

  const deleteProperty = async (propertyId) => {
    await api.delete(`/propiedades/${propertyId}`);
    await Promise.all([refreshProperties(), refreshContacts(), refreshSales(), refreshCommissions()]);
  };

  const togglePropertyFeatured = async (propertyId) => {
    await api.patch(`/propiedades/${propertyId}/toggle-destacada`);
    await refreshProperties();
  };

  const togglePropertyActive = async (propertyId) => {
    await api.patch(`/propiedades/${propertyId}/toggle-activa`);
    await refreshProperties();
  };

  const saveAgent = async (agent) => {
    const payload = {
      ID_USUARIO: agent.userId || null,
      NOMBRE: agent.name,
      CARGO: agent.role,
      TELEFONO: agent.phone,
      CORREO: agent.email,
      FOTO_URL: agent.photo,
      ESPECIALIDAD: agent.specialty,
      ESTADO: agent.status,
    };

    if (agent.id) {
      await api.put(`/agentes/${agent.id}`, payload);
    } else {
      await api.post('/agentes', payload);
    }

    await refreshAgents();
  };

  const deleteAgent = async (agentId) => {
    await api.delete(`/agentes/${agentId}`);
    await Promise.all([refreshAgents(), refreshProperties(), refreshSales(), refreshCommissions()]);
  };

  const savePropertyType = async (propertyType) => {
    const payload = {
      NOMBRE: propertyType.name,
      DESCRIPCION: propertyType.description,
      ESTADO: propertyType.active === false ? 0 : 1,
    };

    if (propertyType.id) {
      await api.put(`/tipos-propiedad/${propertyType.id}`, payload);
    } else {
      await api.post('/tipos-propiedad', payload);
    }

    await refreshPropertyTypes();
  };

  const deletePropertyType = async (typeId) => {
    await api.delete(`/tipos-propiedad/${typeId}`);
    await Promise.all([refreshPropertyTypes(), refreshProperties(), refreshSales(), refreshCommissions()]);
  };

  const saveZone = async (zone) => {
    const payload = {
      NOMBRE: zone.name,
      CIUDAD: zone.city,
      DESCRIPCION: zone.description,
      ESTADO: zone.active === false ? 0 : 1,
    };

    if (zone.id) {
      await api.put(`/zonas/${zone.id}`, payload);
    } else {
      await api.post('/zonas', payload);
    }

    await refreshZones();
  };

  const deleteZone = async (zoneId) => {
    await api.delete(`/zonas/${zoneId}`);
    await Promise.all([refreshZones(), refreshProperties(), refreshSales(), refreshCommissions()]);
  };

  const savePlan = async (plan) => {
    const payload = {
      NOMBRE: plan.name,
      DESCRIPCION: plan.description,
      PRECIO: Number(plan.price) || 0,
      DURACION_DIAS: Number(plan.durationDays) || 30,
      LIMITE_IMAGENES: Number(plan.imageLimit) || 10,
      ADMITE_DESTACADA: plan.allowsFeatured ? 1 : 0,
      NIVEL_PRIORIDAD: Number(plan.priorityLevel) || 1,
      ESTADO: plan.active === false ? 0 : 1,
    };

    if (plan.id) {
      await api.put(`/planes/${plan.id}`, payload);
    } else {
      await api.post('/planes', payload);
    }

    await refreshPlans();
  };

  const deletePlan = async (planId) => {
    await api.delete(`/planes/${planId}`);
    await Promise.all([refreshPlans(), refreshSubscriptions()]);
  };

  const saveSubscription = async (subscription) => {
    const payload = {
      ID_PROPIEDAD: Number(subscription.propertyId),
      ID_PLAN: Number(subscription.planId),
      ID_AGENTE: subscription.agentId ? Number(subscription.agentId) : null,
      PRECIO_FINAL:
        subscription.finalPrice === '' || subscription.finalPrice === null || subscription.finalPrice === undefined
          ? null
          : Number(subscription.finalPrice) || 0,
      FECHA_INICIO: subscription.startDate,
      FECHA_FIN: subscription.endDate,
      ESTADO_SUSCRIPCION: subscription.status,
      AUTO_RENOVAR: subscription.autoRenew ? 1 : 0,
      OBSERVACIONES: subscription.notes || null,
    };

    if (subscription.id) {
      await api.put(`/suscripciones/${subscription.id}`, payload);
    } else {
      await api.post('/suscripciones', payload);
    }

    await Promise.all([refreshProperties(), refreshSubscriptions(), refreshPublicationPayments()]);
  };

  const deleteSubscription = async (subscriptionId) => {
    await api.delete(`/suscripciones/${subscriptionId}`);
    await Promise.all([refreshProperties(), refreshSubscriptions(), refreshPublicationPayments()]);
  };

  const savePublicationPayment = async (payment) => {
    const payload = {
      ID_SUSCRIPCION: Number(payment.subscriptionId),
      MONTO: Number(payment.amount) || 0,
      METODO_PAGO: payment.paymentMethod,
      REFERENCIA_PAGO: payment.reference || null,
      ESTADO_PAGO: payment.status,
      FECHA_PAGO: payment.paidAt || null,
      OBSERVACIONES: payment.notes || null,
    };

    if (payment.id) {
      await api.put(`/pagos-publicacion/${payment.id}`, payload);
    } else {
      await api.post('/pagos-publicacion', payload);
    }

    await Promise.all([refreshProperties(), refreshSubscriptions(), refreshPublicationPayments()]);
  };

  const deletePublicationPayment = async (paymentId) => {
    await api.delete(`/pagos-publicacion/${paymentId}`);
    await Promise.all([refreshProperties(), refreshSubscriptions(), refreshPublicationPayments()]);
  };

  const saveContact = async (contact) => {
    const response = await api.post('/solicitudes-contacto', {
      ID_PROPIEDAD: contact.propertyId ? Number(contact.propertyId) : null,
      NOMBRE: contact.name,
      CORREO: contact.email,
      TELEFONO: contact.phone,
      MENSAJE: contact.message,
      ESTADO: 'Abierta',
    });

    await refreshContacts();
    return response.data;
  };

  const updateContactStatus = async (contactId, status) => {
    await api.patch(`/solicitudes-contacto/${contactId}/estado`, {
      ESTADO: status,
    });
    await refreshContacts();
  };

  const deleteContact = async (contactId) => {
    await api.delete(`/solicitudes-contacto/${contactId}`);
    await refreshContacts();
  };

  const createSale = async (sale) => {
    await api.post('/ventas', {
      ID_PROPIEDAD: Number(sale.propertyId),
      ID_AGENTE: Number(sale.agentId),
      NOMBRE_CLIENTE: sale.clientName,
      IDENTIDAD_CLIENTE: sale.clientIdentity || null,
      TELEFONO_CLIENTE: sale.clientPhone || null,
      CORREO_CLIENTE: sale.clientEmail || null,
      PRECIO_CIERRE: Number(sale.closingPrice) || 0,
      TIPO_NEGOCIO: sale.businessType,
      PORCENTAJE_COMISION: Number(sale.commissionRate) || DEFAULT_COMMISSION_RATE,
      FECHA_CIERRE: sale.closingDate,
      OBSERVACIONES: sale.observations || null,
      USUARIO_CREACION: sale.userId || null,
    });

    await Promise.all([refreshProperties(), refreshSales(), refreshCommissions()]);
  };

  const updateSale = async (saleId, sale) => {
    await api.put(`/ventas/${saleId}`, {
      ID_AGENTE: Number(sale.agentId),
      NOMBRE_CLIENTE: sale.clientName,
      IDENTIDAD_CLIENTE: sale.clientIdentity || null,
      TELEFONO_CLIENTE: sale.clientPhone || null,
      CORREO_CLIENTE: sale.clientEmail || null,
      PRECIO_CIERRE: Number(sale.closingPrice) || 0,
      TIPO_NEGOCIO: sale.businessType,
      PORCENTAJE_COMISION: Number(sale.commissionRate) || DEFAULT_COMMISSION_RATE,
      FECHA_CIERRE: sale.closingDate,
      ESTADO_VENTA: sale.saleStatus || 'Cerrada',
      OBSERVACIONES: sale.observations || null,
    });

    await Promise.all([refreshProperties(), refreshSales(), refreshCommissions()]);
  };

  const deleteSale = async (saleId) => {
    await api.delete(`/ventas/${saleId}`);
    await Promise.all([refreshProperties(), refreshSales(), refreshCommissions()]);
  };

  const updateCommissionStatus = async (commissionId, status, payload = {}) => {
    await api.patch(`/comisiones/${commissionId}/estado`, {
      ESTADO_COMISION: status,
      FECHA_PAGO: payload.paymentDate || null,
      OBSERVACIONES_PAGO: payload.paymentNotes || null,
    });

    await Promise.all([refreshSales(), refreshCommissions()]);
  };

  const resetRealEstateData = async () => {
    await refreshAll();
  };

  const value = {
    companyProfile,
    propertyTypes,
    zones,
    agents,
    properties,
    contacts,
    sales,
    commissions,
    plans,
    subscriptions,
    publicationPayments,
    isLoading,
    error,
    saveProperty,
    deleteProperty,
    togglePropertyFeatured,
    togglePropertyActive,
    saveAgent,
    deleteAgent,
    savePropertyType,
    deletePropertyType,
    saveZone,
    deleteZone,
    savePlan,
    deletePlan,
    saveContact,
    updateContactStatus,
    deleteContact,
    createSale,
    updateSale,
    deleteSale,
    updateCommissionStatus,
    saveSubscription,
    deleteSubscription,
    savePublicationPayment,
    deletePublicationPayment,
    resetRealEstateData,
    refreshAll,
  };

  return <RealEstateContext.Provider value={value}>{children}</RealEstateContext.Provider>;
};

export const useRealEstate = () => useContext(RealEstateContext);
