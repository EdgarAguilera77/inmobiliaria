export const PROPERTY_CATEGORY = {
  INMUEBLE: 'inmueble',
  VEHICULO: 'vehiculo',
  SERVICIO: 'servicio',
};

const VEHICLE_TOKENS = ['vehiculo', 'vehiculos', 'carro', 'carros', 'auto', 'autos'];
const SERVICE_TOKENS = ['servicio', 'servicios', 'legal', 'contable', 'informat'];

const normalizeText = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const inferPropertyCategory = (type) => {
  const candidates = [type?.category, type?.slug, type?.name].map(normalizeText).filter(Boolean);

  if (candidates.some((candidate) => VEHICLE_TOKENS.some((token) => candidate.includes(token)))) {
    return PROPERTY_CATEGORY.VEHICULO;
  }

  if (candidates.some((candidate) => SERVICE_TOKENS.some((token) => candidate.includes(token)))) {
    return PROPERTY_CATEGORY.SERVICIO;
  }

  return PROPERTY_CATEGORY.INMUEBLE;
};

export const createEmptyPropertyDetails = () => ({
  brand: '',
  model: '',
  year: '',
  mileage: '',
  modality: '',
  coverage: '',
  schedule: '',
});

export const normalizePropertyDetails = (details = {}) => ({
  ...createEmptyPropertyDetails(),
  ...details,
});

