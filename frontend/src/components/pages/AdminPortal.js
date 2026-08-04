import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { useRealEstate } from '../../contexts/RealEstateContext';
import { AuthContext } from './AuthContext';
import { API_BASE } from '../../constants/api';
import AdminPagination from '../common/AdminPagination';
import {
  createEmptyPropertyDetails,
  inferPropertyCategory,
  normalizePropertyDetails,
  PROPERTY_CATEGORY,
} from '../../constants/propertyCategories';

const emptyProperty = {
  title: '',
  operation: 'Venta',
  typeId: '',
  zoneId: '',
  agentId: '',
  price: '',
  bedrooms: '',
  bathrooms: '',
  parking: '',
  area: '',
  address: '',
  coverImage: '',
  featured: false,
  active: true,
  images: [''],
  details: createEmptyPropertyDetails(),
};

const emptyAgent = {
  name: '',
  role: '',
  phone: '',
  email: '',
  photo: '',
  specialty: '',
  status: 'Activo',
};

const emptyType = {
  name: '',
  description: '',
};

const emptyZone = {
  name: '',
  city: '',
  description: '',
};

const createEmptySaleClosure = (commissionSettings = null) => ({
  propertyId: '',
  agentId: '',
  clientName: '',
  clientIdentity: '',
  clientPhone: '',
  clientEmail: '',
  closingPrice: '',
  businessType: 'Venta',
  commissionRate: String(commissionSettings?.defaultRate ?? 5),
  agentCommissionRate: String(commissionSettings?.defaultAgentRate ?? 5),
  closingDate: new Date().toISOString().slice(0, 10),
  observations: '',
});

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;

const isSelectableAgent = (agent) =>
  Boolean(agent && agent.userId && String(agent.status || '').toLowerCase() === 'activo');

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  });

const uploadApi = axios.create({
  baseURL: API_BASE,
});

const uploadSingleImagePreview = async (file) => {
  if (!file) {
    return '';
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`La imagen ${file.name} supera el limite de 3 MB.`);
  }

  const imageBase64 = await readFileAsDataUrl(file);
  const response = await uploadApi.post('/uploads/preview-base64', {
    fileName: file.name,
    imageBase64,
  });

  return response.data.previewUrl;
};

const formatCurrency = (value, maximumFractionDigits = 0) =>
  Number(value || 0).toLocaleString('es-HN', {
    style: 'currency',
    currency: 'HNL',
    maximumFractionDigits,
  });

const SectionHeader = ({ eyebrow, title, text }) => (
  <div className="admin-header">
    <div>
      {eyebrow ? <span className="section-chip">{eyebrow}</span> : null}
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </div>
  </div>
);

const AdminStatCard = ({ label, value, accent }) => (
  <div className={`admin-stat-card ${accent || ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const PermissionHint = ({ canCreate, canDelete }) => {
  if (canCreate && canDelete) {
    return null;
  }

  let message = 'Modo de solo lectura.';
  if (canCreate && !canDelete) {
    message = 'Puedes crear y editar, pero no eliminar.';
  } else if (!canCreate && canDelete) {
    message = 'Puedes eliminar, pero no crear ni editar.';
  }

  return <div className="permission-hint">{message}</div>;
};

const CrudActions = ({ onEdit, onDelete, canEdit, canDelete, children }) => (
  <div className="table-actions">
    {children}
    {canEdit && (
      <button type="button" className="table-button ghost" onClick={onEdit}>
        Editar
      </button>
    )}
    {canDelete && (
      <button type="button" className="table-button danger" onClick={onDelete}>
        Eliminar
      </button>
    )}
    {!canEdit && !canDelete && <span className="muted-copy">Solo lectura</span>}
  </div>
);

const CloseSaleModal = ({
  isOpen,
  property,
  formData,
  setFormData,
  agents,
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !property) {
    return null;
  }

  const safeAgents = agents.filter(Boolean);
  const linkedAgent = safeAgents.find((agent) => String(agent.id) === String(property.agentId));

  const estimatedCommission =
    (Number(formData.closingPrice || 0) * Number(formData.commissionRate || 0)) / 100;
  const normalizedPlatformFeeRate = Math.min(
    100,
    Math.max(0, Number(formData.agentCommissionRate || 5))
  );
  const agentNetRate = Number((100 - normalizedPlatformFeeRate).toFixed(2));
  const ownerCommissionAmount = (estimatedCommission * normalizedPlatformFeeRate) / 100;
  const agentCommissionAmount = estimatedCommission - ownerCommissionAmount;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal admin-modal-wide" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="section-chip">Cerrar negocio</span>
            <h3>{property.title}</h3>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <form className="compact-admin-form" onSubmit={onSubmit}>
          <div className="admin-inline-summary stack">
            <span>Precio publicado</span>
            <strong>{formatCurrency(property.price, 0)}</strong>
          </div>
          <div className="admin-form-row">
            <input
              value={formData.clientName}
              onChange={(event) => setFormData({ ...formData, clientName: event.target.value })}
              placeholder="Nombre del cliente"
              required
            />
            <input
              value={formData.clientIdentity}
              onChange={(event) =>
                setFormData({ ...formData, clientIdentity: event.target.value })
              }
              placeholder="Identidad"
            />
          </div>
          <div className="admin-form-row">
            <input
              value={formData.clientPhone}
              onChange={(event) => setFormData({ ...formData, clientPhone: event.target.value })}
              placeholder="Telefono"
            />
            <input
              type="email"
              value={formData.clientEmail}
              onChange={(event) => setFormData({ ...formData, clientEmail: event.target.value })}
              placeholder="Correo"
            />
          </div>
          <div className="admin-form-row">
            {linkedAgent && safeAgents.length <= 1 ? (
              <input value={linkedAgent.name} readOnly disabled />
            ) : (
              <select
                value={formData.agentId}
                onChange={(event) => setFormData({ ...formData, agentId: event.target.value })}
                required
              >
                <option value="">Agente</option>
                {safeAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={formData.businessType}
              onChange={(event) => setFormData({ ...formData, businessType: event.target.value })}
            >
              <option value="Venta">Venta</option>
              <option value="Renta">Renta</option>
            </select>
          </div>
          <div className="admin-form-row">
            <input
              value={formData.closingPrice}
              onChange={(event) => setFormData({ ...formData, closingPrice: event.target.value })}
              placeholder="Precio de cierre"
              required
            />
            <input
              value={formData.commissionRate}
              onChange={(event) => setFormData({ ...formData, commissionRate: event.target.value })}
              placeholder="% comision"
              required
            />
            <input
              value={formData.agentCommissionRate}
              onChange={(event) =>
                setFormData({ ...formData, agentCommissionRate: event.target.value })
              }
              placeholder="% pagina"
              required
            />
            <input
              type="date"
              value={formData.closingDate}
              onChange={(event) => setFormData({ ...formData, closingDate: event.target.value })}
              required
            />
          </div>
          <textarea
            rows="4"
            value={formData.observations}
            onChange={(event) => setFormData({ ...formData, observations: event.target.value })}
            placeholder="Observaciones"
          />
          <div className="admin-inline-summary">
            <span>Comision bruta del agente</span>
            <strong>{formatCurrency(estimatedCommission, 2)}</strong>
          </div>
          <div className="admin-inline-summary stack">
            <span>
              Retencion pagina: {normalizedPlatformFeeRate}% - <strong>{formatCurrency(ownerCommissionAmount, 2)}</strong>
            </span>
            <span>
              Agente neto: {agentNetRate}% - <strong>{formatCurrency(agentCommissionAmount, 2)}</strong>
            </span>
          </div>
          <div className="table-actions">
            <button type="submit" className="primary-button">
              Guardar cierre
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PropertyFormModal = ({
  isOpen,
  editingId,
  isAdmin,
  canCreate,
  formData,
  setFormData,
  propertyTypes,
  zones,
  agents,
  loggedAgent,
  handleCoverFileChange,
  handleGalleryFileChange,
  propertyImagePreviews,
  imageError,
  isSaving,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) {
    return null;
  }

  const safeAgents = agents.filter(Boolean);

  const selectedType = propertyTypes.find((type) => String(type.id) === String(formData.typeId));
  const propertyCategory = inferPropertyCategory(selectedType);
  const displayCoverImageValue = formData.coverImage?.startsWith('data:image/')
    ? ''
    : formData.coverImage;
  const addressLabel =
    propertyCategory === PROPERTY_CATEGORY.SERVICIO
      ? 'Cobertura o ubicacion'
      : propertyCategory === PROPERTY_CATEGORY.VEHICULO
        ? 'Ubicacion'
        : 'Direccion';

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal admin-modal-wide" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="section-chip">Publicaciones</span>
            <h3>{editingId ? 'Editar publicacion' : 'Nueva publicacion'}</h3>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {imageError && <div className="feedback-banner error">{imageError}</div>}
        <form className="compact-admin-form" onSubmit={onSubmit}>
          <input
            value={formData.title}
            onChange={(event) => setFormData({ ...formData, title: event.target.value })}
            placeholder="Titulo de la publicacion"
            required
            disabled={!canCreate}
          />
          <div className="admin-form-row">
            <select
              value={formData.typeId}
              onChange={(event) => {
                const nextTypeId = event.target.value;
                const nextType = propertyTypes.find((type) => String(type.id) === String(nextTypeId));
                const nextCategory = inferPropertyCategory(nextType);
                setFormData((current) => ({
                  ...current,
                  typeId: nextTypeId,
                  operation: nextCategory === PROPERTY_CATEGORY.INMUEBLE ? current.operation || 'Venta' : 'Venta',
                  bedrooms: nextCategory === PROPERTY_CATEGORY.INMUEBLE ? current.bedrooms : '',
                  bathrooms: nextCategory === PROPERTY_CATEGORY.INMUEBLE ? current.bathrooms : '',
                  parking: nextCategory === PROPERTY_CATEGORY.INMUEBLE ? current.parking : '',
                  area: nextCategory === PROPERTY_CATEGORY.INMUEBLE ? current.area : '',
                  details:
                    nextCategory === PROPERTY_CATEGORY.INMUEBLE
                      ? createEmptyPropertyDetails()
                      : normalizePropertyDetails(current.details),
                }));
              }}
              required
              disabled={!canCreate}
            >
              <option value="">Tipo</option>
              {propertyTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {propertyCategory === PROPERTY_CATEGORY.INMUEBLE && (
              <select
                value={formData.operation}
                onChange={(event) => setFormData({ ...formData, operation: event.target.value })}
                disabled={!canCreate}
              >
                <option value="Venta">Venta</option>
                <option value="Renta">Renta</option>
              </select>
            )}
            <select
              value={formData.zoneId}
              onChange={(event) => setFormData({ ...formData, zoneId: event.target.value })}
              required
              disabled={!canCreate}
            >
              <option value="">Zona</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form-row">
            {isAdmin || !loggedAgent ? (
              <select
                value={formData.agentId}
                onChange={(event) => setFormData({ ...formData, agentId: event.target.value })}
                required
                disabled={!canCreate || isSaving}
              >
                <option value="">Agente</option>
                {safeAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            ) : (
              <input value={loggedAgent.name} readOnly disabled />
            )}
            <input
              value={formData.price}
              onChange={(event) => setFormData({ ...formData, price: event.target.value })}
              placeholder={propertyCategory === PROPERTY_CATEGORY.SERVICIO ? 'Tarifa' : 'Precio'}
              required
              disabled={!canCreate || isSaving}
            />
            {propertyCategory === PROPERTY_CATEGORY.INMUEBLE && (
              <input
                value={formData.area}
                onChange={(event) => setFormData({ ...formData, area: event.target.value })}
                placeholder="Area m2"
                required
                disabled={!canCreate || isSaving}
              />
            )}
          </div>
          {propertyCategory === PROPERTY_CATEGORY.INMUEBLE && (
            <div className="admin-form-row">
              <input
                value={formData.bedrooms}
                onChange={(event) => setFormData({ ...formData, bedrooms: event.target.value })}
                placeholder="Habitaciones"
                disabled={!canCreate}
              />
              <input
                value={formData.bathrooms}
                onChange={(event) => setFormData({ ...formData, bathrooms: event.target.value })}
                placeholder="Banos"
                disabled={!canCreate}
              />
              <input
                value={formData.parking}
                onChange={(event) => setFormData({ ...formData, parking: event.target.value })}
                placeholder="Estacionamientos"
                disabled={!canCreate}
              />
            </div>
          )}
          {propertyCategory === PROPERTY_CATEGORY.VEHICULO && (
            <>
              <div className="admin-form-row">
                <input
                  value={formData.details.brand}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, brand: event.target.value },
                    })
                  }
                  placeholder="Marca"
                  disabled={!canCreate}
                />
                <input
                  value={formData.details.model}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, model: event.target.value },
                    })
                  }
                  placeholder="Modelo"
                  disabled={!canCreate}
                />
              </div>
              <div className="admin-form-row">
                <input
                  value={formData.details.year}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, year: event.target.value },
                    })
                  }
                  placeholder="Ano"
                  disabled={!canCreate}
                />
                <input
                  value={formData.details.mileage}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, mileage: event.target.value },
                    })
                  }
                  placeholder="Kilometraje"
                  disabled={!canCreate}
                />
              </div>
            </>
          )}
          {propertyCategory === PROPERTY_CATEGORY.SERVICIO && (
            <>
              <div className="admin-form-row">
                <input
                  value={formData.details.modality}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, modality: event.target.value },
                    })
                  }
                  placeholder="Modalidad"
                  disabled={!canCreate}
                />
                <input
                  value={formData.details.coverage}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, coverage: event.target.value },
                    })
                  }
                  placeholder="Cobertura"
                  disabled={!canCreate}
                />
              </div>
              <input
                value={formData.details.schedule}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, schedule: event.target.value },
                  })
                }
                placeholder="Horario"
                disabled={!canCreate}
              />
            </>
          )}
          <input
            value={formData.address}
            onChange={(event) => setFormData({ ...formData, address: event.target.value })}
            placeholder={addressLabel}
            required
            disabled={!canCreate}
          />
          <input
            value={displayCoverImageValue}
            onChange={(event) => setFormData({ ...formData, coverImage: event.target.value })}
            placeholder={
              formData.coverImage?.startsWith('data:image/')
                ? 'Imagen cargada desde el equipo'
                : 'URL imagen portada o dejala vacia para subir archivo'
            }
            disabled={!canCreate}
          />
          <div className="file-upload-group">
            <label className="file-upload-label" htmlFor="property-cover-file">
              Subir portada desde el equipo
            </label>
            <input
              id="property-cover-file"
              type="file"
              accept="image/*"
              onChange={handleCoverFileChange}
              disabled={!canCreate}
            />
          </div>
          {formData.coverImage && (
            <div className="image-upload-preview">
              <img src={formData.coverImage} alt="Portada seleccionada" />
              {canCreate && (
                <button
                  type="button"
                  className="table-button danger"
                  onClick={() => setFormData((current) => ({ ...current, coverImage: '' }))}
                >
                  Quitar portada
                </button>
              )}
            </div>
          )}
          <textarea
            value={formData.images.join('\n')}
            onChange={(event) =>
              setFormData({ ...formData, images: event.target.value.split('\n') })
            }
            rows="4"
            placeholder="Una URL de imagen por linea. Tambien puedes subir imagenes desde tu equipo."
            disabled={!canCreate}
          />
          <div className="file-upload-group">
            <label className="file-upload-label" htmlFor="property-gallery-files">
              Subir galeria desde el equipo
            </label>
            <input
              id="property-gallery-files"
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryFileChange}
              disabled={!canCreate}
            />
          </div>
          {propertyImagePreviews.length > 0 && (
            <div className="image-upload-grid">
              {propertyImagePreviews.map((image, index) => (
                <article className="image-upload-card" key={`${index}-${image.slice(0, 32)}`}>
                  <img src={image} alt={`Galeria ${index + 1}`} />
                  {canCreate && (
                    <button
                      type="button"
                      className="table-button danger"
                      onClick={() =>
                        setFormData((current) => ({
                          ...current,
                          images: current.images.filter((_, imageIndex) => imageIndex !== index),
                        }))
                      }
                    >
                      Quitar
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(event) => setFormData({ ...formData, featured: event.target.checked })}
                disabled={!canCreate}
              />
              Destacada
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(event) => setFormData({ ...formData, active: event.target.checked })}
                disabled={!canCreate}
              />
              Activa
            </label>
          </div>
          <div className="table-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={!canCreate || isSaving || (!editingId && !formData.agentId)}
            >
              {isSaving
                ? editingId
                  ? 'Actualizando...'
                  : 'Guardando...'
                : editingId
                  ? 'Actualizar publicacion'
                  : 'Crear publicacion'}
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AgentFormModal = ({
  isOpen,
  editingId,
  formData,
  setFormData,
  canCreate,
  imageError,
  onPhotoFileChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="section-chip">Agentes</span>
            <h3>{editingId ? 'Editar agente' : 'Nuevo agente'}</h3>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {imageError && <div className="feedback-banner error">{imageError}</div>}
        <form className="compact-admin-form" onSubmit={onSubmit}>
          <input
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            placeholder="Nombre"
            required
            disabled={!canCreate}
          />
          <input
            value={formData.role}
            onChange={(event) => setFormData({ ...formData, role: event.target.value })}
            placeholder="Cargo"
            required
            disabled={!canCreate}
          />
          <input
            value={formData.phone}
            onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
            placeholder="Telefono"
            required
            disabled={!canCreate}
          />
          <input
            type="email"
            value={formData.email}
            onChange={(event) => setFormData({ ...formData, email: event.target.value })}
            placeholder="Correo"
            required
            disabled={!canCreate}
          />
          <div className="file-upload-group">
            <label className="file-upload-label" htmlFor="agent-photo-file">
              Subir foto desde el equipo
            </label>
            <input
              id="agent-photo-file"
              type="file"
              accept="image/*"
              onChange={onPhotoFileChange}
              disabled={!canCreate}
            />
          </div>
          {formData.photo && (
            <div className="image-upload-preview">
              <img src={formData.photo} alt={formData.name || 'Foto del agente'} />
              {canCreate && (
                <button
                  type="button"
                  className="table-button danger"
                  onClick={() => setFormData((current) => ({ ...current, photo: '' }))}
                >
                  Quitar foto
                </button>
              )}
            </div>
          )}
          <input
            value={formData.specialty}
            onChange={(event) => setFormData({ ...formData, specialty: event.target.value })}
            placeholder="Especialidad"
            required
            disabled={!canCreate}
          />
          <select
            value={formData.status}
            onChange={(event) => setFormData({ ...formData, status: event.target.value })}
            disabled={!canCreate}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              {editingId ? 'Actualizar agente' : 'Crear agente'}
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TypeFormModal = ({
  isOpen,
  editingId,
  formData,
  setFormData,
  canCreate,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="section-chip">Tipos</span>
            <h3>{editingId ? 'Editar tipo de propiedad' : 'Nuevo tipo de propiedad'}</h3>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <form className="compact-admin-form" onSubmit={onSubmit}>
          <input
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            placeholder="Nombre del tipo"
            required
            disabled={!canCreate}
          />
          <textarea
            value={formData.description}
            onChange={(event) => setFormData({ ...formData, description: event.target.value })}
            rows="4"
            placeholder="Descripcion"
            required
            disabled={!canCreate}
          />
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              {editingId ? 'Actualizar tipo' : 'Crear tipo'}
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ZoneFormModal = ({
  isOpen,
  editingId,
  formData,
  setFormData,
  canCreate,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="section-chip">Zonas</span>
            <h3>{editingId ? 'Editar ciudad o zona' : 'Nueva ciudad o zona'}</h3>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <form className="compact-admin-form" onSubmit={onSubmit}>
          <input
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            placeholder="Zona"
            required
            disabled={!canCreate}
          />
          <input
            value={formData.city}
            onChange={(event) => setFormData({ ...formData, city: event.target.value })}
            placeholder="Ciudad"
            required
            disabled={!canCreate}
          />
          <textarea
            value={formData.description}
            onChange={(event) => setFormData({ ...formData, description: event.target.value })}
            rows="4"
            placeholder="Descripcion"
            required
            disabled={!canCreate}
          />
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              {editingId ? 'Actualizar zona' : 'Crear zona'}
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AdminDashboardPage = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const {
    properties,
    agents,
    propertyTypes,
    zones,
    contacts,
    sales,
    commissions,
    plans,
    subscriptions,
    publicationPayments,
    isLoading,
  } = useRealEstate();
  const normalizedAgents = useMemo(() => agents.filter(Boolean), [agents]);
  const loggedAgent = useMemo(
    () => normalizedAgents.find((agent) => String(agent.userId) === String(user?.CODIGO)),
    [normalizedAgents, user?.CODIGO]
  );
  const isAgentScopedView = !isAdmin;
  const scopedProperties = useMemo(
    () =>
      isAdmin
        ? properties
        : loggedAgent
          ? properties.filter((property) => String(property.agentId) === String(loggedAgent.id))
          : [],
    [isAdmin, loggedAgent, properties]
  );
  const scopedPropertyIds = useMemo(
    () => new Set(scopedProperties.map((property) => String(property.id))),
    [scopedProperties]
  );
  const scopedContacts = useMemo(
    () =>
      isAdmin
        ? contacts
        : contacts.filter(
            (contact) =>
              contact.propertyId && scopedPropertyIds.has(String(contact.propertyId))
          ),
    [contacts, isAdmin, scopedPropertyIds]
  );
  const scopedSales = useMemo(
    () =>
      isAdmin
        ? sales
        : loggedAgent
          ? sales.filter((sale) => String(sale.agentId) === String(loggedAgent.id))
          : [],
    [isAdmin, loggedAgent, sales]
  );
  const scopedCommissions = useMemo(
    () =>
      isAdmin
        ? commissions
        : loggedAgent
          ? commissions.filter((commission) => String(commission.agentId) === String(loggedAgent.id))
          : [],
    [commissions, isAdmin, loggedAgent]
  );
  const scopedSubscriptions = useMemo(
    () =>
      isAdmin
        ? subscriptions
        : loggedAgent
          ? subscriptions.filter(
              (subscription) => String(subscription.agentId) === String(loggedAgent.id)
            )
          : [],
    [isAdmin, loggedAgent, subscriptions]
  );
  const scopedSubscriptionIds = useMemo(
    () => new Set(scopedSubscriptions.map((subscription) => String(subscription.id))),
    [scopedSubscriptions]
  );
  const scopedPublicationPayments = useMemo(
    () =>
      isAdmin
        ? publicationPayments
        : publicationPayments.filter((payment) =>
            scopedSubscriptionIds.has(String(payment.subscriptionId))
          ),
    [publicationPayments, isAdmin, scopedSubscriptionIds]
  );

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando dashboard...</h2></div>;
  }

  const activeProperties = scopedProperties.filter((property) => property.active).length;
  const featuredProperties = scopedProperties.filter((property) => property.featured).length;
  const newContacts = scopedContacts.filter((contact) => contact.status === 'Abierta').length;
  const monthlySalesTotal = scopedSales
    .filter((sale) => String(sale.closingDate).slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((total, sale) => total + sale.closingPrice, 0);
  const pendingCommissions = scopedCommissions
    .filter((commission) => commission.status === 'Pendiente')
    .reduce((total, commission) => total + commission.amount, 0);
  const publishedProperties = scopedProperties.filter(
    (property) => property.active && property.publicationStatus === 'Publicada'
  ).length;
  const scopedTypeCount = new Set(scopedProperties.map((property) => String(property.typeId))).size;
  const scopedZoneCount = new Set(scopedProperties.map((property) => String(property.zoneId))).size;
  const scopedActivePlansCount = isAdmin
    ? plans.filter((plan) => plan.active).length
    : new Set(
        scopedSubscriptions
          .filter((subscription) => subscription.status === 'Activa')
          .map((subscription) => String(subscription.planId))
      ).size;
  const monthlySubscriptionRevenue = scopedPublicationPayments
    .filter(
      (payment) =>
        payment.status === 'Pagado' &&
        String(payment.paidAt || payment.createdAt).slice(0, 7) ===
          new Date().toISOString().slice(0, 7)
    )
    .reduce((total, payment) => total + payment.amount, 0);

  return (
    <div className="admin-page">
      <SectionHeader
        eyebrow="Administrativo"
        title="Dashboard"
        text={
          isAgentScopedView
            ? 'Resumen personal de tus publicaciones, solicitudes y seguimiento comercial.'
            : 'Resumen general de catalogo, visibilidad comercial y solicitudes entrantes.'
        }
      />
      {isAgentScopedView && loggedAgent && (
        <div className="permission-hint">
          Vista filtrada para el agente <strong>{loggedAgent.name}</strong>.
        </div>
      )}
      {isAgentScopedView && !loggedAgent && (
        <div className="feedback-banner warning">
          Tu usuario aun no esta vinculado a un agente. Por eso el dashboard muestra valores en
          cero hasta completar esa relacion.
        </div>
      )}
      <div className="admin-stat-grid">
        <AdminStatCard label="Publicaciones activas" value={activeProperties} accent="accent-one" />
        <AdminStatCard
          label="Publicaciones destacadas"
          value={featuredProperties}
          accent="accent-two"
        />
        <AdminStatCard label="Solicitudes nuevas" value={newContacts} accent="accent-three" />
        <AdminStatCard
          label="Agentes activos"
          value={
            isAgentScopedView
              ? loggedAgent
                ? normalizedAgents.filter(
                  (agent) =>
                    agent.status === 'Activo' &&
                    String(agent.id) === String(loggedAgent.id)
                  ).length
                : 0
              : normalizedAgents.filter((agent) => agent.status === 'Activo').length
          }
        />
        <AdminStatCard label="Ventas del mes" value={formatCurrency(monthlySalesTotal, 0)} />
        <AdminStatCard
          label="Comisiones pendientes"
          value={formatCurrency(pendingCommissions, 0)}
        />
        <AdminStatCard label="Publicadas" value={publishedProperties} />
        <AdminStatCard
          label="Ingresos por suscripcion"
          value={formatCurrency(monthlySubscriptionRevenue, 0)}
        />
      </div>
      <div className="admin-panel-grid">
        <div className="admin-panel">
          <h3>Estado del inventario</h3>
          <ul className="admin-list">
            <li>Tipos de propiedad: {isAgentScopedView ? scopedTypeCount : propertyTypes.length}</li>
            <li>Zonas o ciudades: {isAgentScopedView ? scopedZoneCount : zones.length}</li>
            <li>Publicaciones publicadas: {publishedProperties}</li>
            <li>Publicaciones ocultas: {scopedProperties.length - activeProperties}</li>
            <li>Planes activos: {scopedActivePlansCount}</li>
          </ul>
        </div>
        <div className="admin-panel">
          <h3>Seguimiento comercial</h3>
          <ul className="admin-list">
            <li>
              <Link
                to={
                  isAgentScopedView && loggedAgent
                    ? `/admin/suscripciones?agentId=${loggedAgent.id}&status=Activa`
                    : '/admin/suscripciones?status=Activa'
                }
              >
                Suscripciones activas: {scopedSubscriptions.filter((item) => item.status === 'Activa').length}
              </Link>
            </li>
            <li>
              Pagos pendientes:{' '}
              {scopedPublicationPayments.filter((item) => item.status === 'Pendiente').length}
            </li>
            {scopedContacts.slice(0, 5).map((contact) => (
              <li key={contact.id}>
                <Link to={`/admin/contactos?client=${encodeURIComponent(contact.name)}`}>
                  <strong>{contact.name}</strong>
                </Link>{' '}
                - {contact.status}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export const AdminPropertiesPage = () => {
  const { hasPermission, user, isAdmin } = useContext(AuthContext);
  const {
    agents,
    commissionSettings,
    createSale,
    properties,
    propertyTypes,
    zones,
    isLoading,
    saveProperty,
    deleteProperty,
    togglePropertyActive,
    togglePropertyPublication,
    togglePropertyFeatured,
  } = useRealEstate();
  const normalizedAgents = useMemo(() => agents.filter(Boolean), [agents]);
  const selectableAgents = useMemo(
    () => normalizedAgents.filter(isSelectableAgent),
    [normalizedAgents]
  );
  const canCreate = hasPermission('Propiedades', 'CREAR');
  const canDelete = hasPermission('Propiedades', 'ELIMINAR');
  const canCreateSales = hasPermission('Ventas', 'CREAR');
  const [formData, setFormData] = useState(emptyProperty);
  const [editingId, setEditingId] = useState(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [imageError, setImageError] = useState('');
  const [saleProperty, setSaleProperty] = useState(null);
  const [saleForm, setSaleForm] = useState(createEmptySaleClosure(commissionSettings));
  const [statusTab, setStatusTab] = useState('Disponibles');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isSavingProperty, setIsSavingProperty] = useState(false);
  const loggedAgent = useMemo(
    () => normalizedAgents.find((agent) => String(agent.userId) === String(user?.CODIGO)),
    [normalizedAgents, user?.CODIGO]
  );
  const scopedProperties = useMemo(
    () =>
      isAdmin
        ? properties
        : loggedAgent
          ? properties.filter((property) => String(property.agentId) === String(loggedAgent.id))
          : [],
    [isAdmin, loggedAgent, properties]
  );

  const propertyImagePreviews = useMemo(
    () => formData.images.filter(Boolean),
    [formData.images]
  );

  const filteredProperties = useMemo(() => {
    if (statusTab === 'Vendidas') {
      return scopedProperties.filter((property) => property.commercialStatus === 'Vendida');
    }

    return scopedProperties.filter((property) => property.commercialStatus === 'Disponible');
  }, [scopedProperties, statusTab]);
  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / itemsPerPage));
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProperties.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredProperties, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, statusTab]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const normalizeFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    const oversized = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);

    if (oversized) {
      throw new Error(`La imagen ${oversized.name} supera el limite de 3 MB.`);
    }

    return Promise.all(
      files.map(async (file) => {
        const imageBase64 = await readFileAsDataUrl(file);
        const response = await uploadApi.post('/uploads/preview-base64', {
          fileName: file.name,
          imageBase64,
        });
        return response.data.previewUrl;
      })
    );
  };

  const handleCoverFileChange = async (event) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles?.length) {
      return;
    }

    try {
      setImageError('');
      const [coverDataUrl] = await normalizeFiles(selectedFiles);
      setFormData((current) => ({ ...current, coverImage: coverDataUrl }));
    } catch (error) {
      setImageError(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const handleGalleryFileChange = async (event) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles?.length) {
      return;
    }

    try {
      setImageError('');
      const galleryImages = await normalizeFiles(selectedFiles);
      setFormData((current) => {
        const nextImages = [...current.images.filter(Boolean), ...galleryImages];
        return {
          ...current,
          coverImage: current.coverImage || galleryImages[0] || '',
          images: nextImages,
        };
      });
    } catch (error) {
      setImageError(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const editProperty = (property) => {
    setEditingId(property.id);
    setImageError('');
    setFormData({
      ...property,
      typeId: String(property.typeId),
      zoneId: String(property.zoneId),
      agentId: String(property.agentId),
      price: String(property.price),
      bedrooms: String(property.bedrooms),
      bathrooms: String(property.bathrooms),
      parking: String(property.parking),
      area: String(property.area),
      images: property.images.length ? property.images : [''],
      details: normalizePropertyDetails(property.details),
    });
    setIsPropertyModalOpen(true);
  };

  const closePropertyModal = () => {
    setIsPropertyModalOpen(false);
    setEditingId(null);
    setImageError('');
    setIsSavingProperty(false);
    setFormData(emptyProperty);
  };

  const openNewPropertyModal = () => {
    setEditingId(null);
    setImageError('');
    setFormData({
      ...emptyProperty,
      agentId: loggedAgent ? String(loggedAgent.id) : '',
    });
    setIsPropertyModalOpen(true);
  };

  const openSaleModal = (property) => {
    setSaleProperty(property);
    setSaleForm({
      ...createEmptySaleClosure(commissionSettings),
      propertyId: String(property.id),
      agentId: String(property.agentId || ''),
      closingPrice: String(property.price || ''),
      businessType: property.operation,
    });
  };

  const closeSaleModal = () => {
    setSaleProperty(null);
    setSaleForm(createEmptySaleClosure(commissionSettings));
  };

  const submitSale = async (event) => {
    event.preventDefault();
    if (!saleProperty) {
      return;
    }

    await createSale({
      ...saleForm,
      propertyId: saleProperty.id,
      userId: user?.CODIGO || null,
    });
    closeSaleModal();
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (!canCreate || isSavingProperty) {
      return;
    }
    setImageError('');
    setIsSavingProperty(true);
    try {
      const fallbackCoverImage = formData.coverImage || formData.images.find(Boolean) || '';
      await saveProperty({
        ...formData,
        id: editingId,
        agentId: editingId ? formData.agentId : loggedAgent?.id || formData.agentId,
        coverImage: fallbackCoverImage,
      });
      closePropertyModal();
    } finally {
      setIsSavingProperty(false);
    }
  };

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando publicaciones...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        title="Publicaciones"
        text="Administra el inventario inmobiliario desde un listado central con acciones rapidas."
      />
      {!isAdmin && loggedAgent && (
        <div className="permission-hint">
          Mostrando solo las publicaciones del agente <strong>{loggedAgent.name}</strong>.
        </div>
      )}
      {!isAdmin && !loggedAgent && (
        <div className="feedback-banner warning">
          Tu usuario aun no esta vinculado a un agente. Por eso no se muestran publicaciones.
        </div>
      )}
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      {imageError && <div className="feedback-banner error">{imageError}</div>}
      <div className="admin-panel-toolbar">
        <div className="admin-inline-summary">
          <span>{statusTab === 'Vendidas' ? 'Publicaciones vendidas' : 'Publicaciones disponibles'}</span>
          <strong>{filteredProperties.length}</strong>
        </div>
        {canCreate && (
          <button type="button" className="primary-button" onClick={openNewPropertyModal}>
            Nueva publicacion
          </button>
        )}
      </div>
      <div className="admin-history-toolbar">
        <div className="table-actions">
          <button
            type="button"
            className={`table-button ${statusTab === 'Disponibles' ? 'active-page' : 'ghost'}`}
            onClick={() => setStatusTab('Disponibles')}
          >
            Disponibles
          </button>
          <button
            type="button"
            className={`table-button ${statusTab === 'Vendidas' ? 'active-page' : 'ghost'}`}
            onClick={() => setStatusTab('Vendidas')}
          >
            Vendidas
          </button>
        </div>
      </div>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Propiedad</th>
              <th>Tipo</th>
              <th>Zona</th>
              <th>Estado comercial</th>
              <th>Publicacion</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProperties.map((property) => (
              <tr key={property.id}>
                <td data-label="Propiedad">{property.title}</td>
                <td data-label="Tipo">{property.type?.name}</td>
                <td data-label="Zona">{property.zone?.name}</td>
                <td data-label="Estado comercial">{property.commercialStatus}</td>
                <td data-label="Publicacion">{property.publicationStatus}</td>
                <td data-label="Estado">{property.active ? 'Activa' : 'Inactiva'}</td>
                <td data-label="Acciones">
                  <CrudActions
                    onEdit={() => editProperty(property)}
                    onDelete={() => deleteProperty(property.id)}
                    canEdit={canCreate}
                    canDelete={canDelete}
                  >
                    {canCreate && (
                      <button
                        type="button"
                        className="table-button"
                        onClick={() => togglePropertyPublication(property.id)}
                      >
                        {property.publicationStatus === 'Publicada'
                          ? 'Pasar a borrador'
                          : 'Publicar'}
                      </button>
                    )}
                    {canCreate && (
                      <button
                        type="button"
                        className="table-button"
                        onClick={() => togglePropertyFeatured(property.id)}
                      >
                        {property.featured ? 'Quitar destacada' : 'Destacar'}
                      </button>
                    )}
                    {canCreate && (
                      <button
                        type="button"
                        className="table-button"
                        onClick={() => togglePropertyActive(property.id)}
                      >
                        {property.active ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                    {canCreateSales && property.commercialStatus === 'Disponible' && (
                      <button
                        type="button"
                        className="table-button"
                        onClick={() => openSaleModal(property)}
                      >
                        {property.operation === 'Renta' ? 'Cerrar renta' : 'Cerrar venta'}
                      </button>
                    )}
                  </CrudActions>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredProperties.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
        <PropertyFormModal
          isOpen={isPropertyModalOpen}
          editingId={editingId}
          isAdmin={isAdmin}
          canCreate={canCreate}
          formData={formData}
          setFormData={setFormData}
          propertyTypes={propertyTypes}
          zones={zones}
          agents={selectableAgents}
          loggedAgent={loggedAgent}
          handleCoverFileChange={handleCoverFileChange}
          handleGalleryFileChange={handleGalleryFileChange}
          propertyImagePreviews={propertyImagePreviews}
          imageError={imageError}
          isSaving={isSavingProperty}
          onClose={closePropertyModal}
          onSubmit={submitForm}
        />
        <CloseSaleModal
          isOpen={Boolean(saleProperty)}
          property={saleProperty}
          formData={saleForm}
          setFormData={setSaleForm}
          agents={isAdmin ? selectableAgents : loggedAgent ? [loggedAgent] : []}
          onClose={closeSaleModal}
          onSubmit={submitSale}
        />
    </div>
  );
};

export const AdminAgentsPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const { agents, saveAgent, deleteAgent, isLoading } = useRealEstate();
  const canCreate = hasPermission('Agentes', 'CREAR');
  const canDelete = hasPermission('Agentes', 'ELIMINAR');
  const [formData, setFormData] = useState(emptyAgent);
  const [editingId, setEditingId] = useState(null);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [imageError, setImageError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const totalPages = Math.max(1, Math.ceil(agents.length / itemsPerPage));
  const paginatedAgents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return agents.slice(startIndex, startIndex + itemsPerPage);
  }, [agents, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const closeAgentModal = () => {
    setFormData(emptyAgent);
    setEditingId(null);
    setImageError('');
    setIsAgentModalOpen(false);
  };

  const openNewAgentModal = () => {
    setFormData(emptyAgent);
    setEditingId(null);
    setImageError('');
    setIsAgentModalOpen(true);
  };

  const handleAgentPhotoFileChange = async (event) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles?.length) {
      return;
    }

    try {
      setImageError('');
      const photoUrl = await uploadSingleImagePreview(selectedFiles[0]);
      setFormData((current) => ({ ...current, photo: photoUrl }));
    } catch (error) {
      setImageError(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }
    await saveAgent({ ...formData, id: editingId });
    closeAgentModal();
  };

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando agentes...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader title="Agentes" />
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      <div className="admin-panel-toolbar">
        <div className="admin-inline-summary">
          <span>Agentes registrados</span>
          <strong>{agents.length}</strong>
        </div>
        {canCreate && (
          <button type="button" className="primary-button" onClick={openNewAgentModal}>
            Nuevo agente
          </button>
        )}
      </div>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Agente</th>
              <th>Especialidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAgents.map((agent) => (
              <tr key={agent.id}>
                <td data-label="Agente">{agent.name}</td>
                <td data-label="Especialidad">{agent.specialty}</td>
                <td data-label="Estado">{agent.status}</td>
                <td data-label="Acciones">
                  <CrudActions
                    onEdit={() => {
                      setEditingId(agent.id);
                      setFormData(agent);
                      setImageError('');
                      setIsAgentModalOpen(true);
                    }}
                    onDelete={() => deleteAgent(agent.id)}
                    canEdit={canCreate}
                    canDelete={canDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={agents.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
      <AgentFormModal
        isOpen={isAgentModalOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        canCreate={canCreate}
        imageError={imageError}
        onPhotoFileChange={handleAgentPhotoFileChange}
        onClose={closeAgentModal}
        onSubmit={submitForm}
      />
    </div>
  );
};

export const AdminTypesPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const { propertyTypes, savePropertyType, deletePropertyType, isLoading } = useRealEstate();
  const canCreate = hasPermission('TiposPropiedad', 'CREAR');
  const canDelete = hasPermission('TiposPropiedad', 'ELIMINAR');
  const [formData, setFormData] = useState(emptyType);
  const [editingId, setEditingId] = useState(null);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const totalPages = Math.max(1, Math.ceil(propertyTypes.length / itemsPerPage));
  const paginatedTypes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return propertyTypes.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, itemsPerPage, propertyTypes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const closeTypeModal = () => {
    setFormData(emptyType);
    setEditingId(null);
    setIsTypeModalOpen(false);
  };

  const openNewTypeModal = () => {
    setFormData(emptyType);
    setEditingId(null);
    setIsTypeModalOpen(true);
  };

  const submitTypeForm = async (event) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }
    await savePropertyType({ ...formData, id: editingId });
    closeTypeModal();
  };

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando tipos...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader title="Tipos de propiedad" />
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      <div className="admin-panel-toolbar">
        <div className="admin-inline-summary">
          <span>Tipos registrados</span>
          <strong>{propertyTypes.length}</strong>
        </div>
        {canCreate && (
          <button type="button" className="primary-button" onClick={openNewTypeModal}>
            Nuevo tipo
          </button>
        )}
      </div>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descripcion</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTypes.map((type) => (
              <tr key={type.id}>
                <td data-label="Tipo">{type.name}</td>
                <td data-label="Descripcion">{type.description}</td>
                <td data-label="Acciones">
                  <CrudActions
                    onEdit={() => {
                      setEditingId(type.id);
                      setFormData(type);
                      setIsTypeModalOpen(true);
                    }}
                    onDelete={() => deletePropertyType(type.id)}
                    canEdit={canCreate}
                    canDelete={canDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={propertyTypes.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
      <TypeFormModal
        isOpen={isTypeModalOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        canCreate={canCreate}
        onClose={closeTypeModal}
        onSubmit={submitTypeForm}
      />
    </div>
  );
};

export const AdminZonesPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const { zones, saveZone, deleteZone, isLoading } = useRealEstate();
  const canCreate = hasPermission('Zonas', 'CREAR');
  const canDelete = hasPermission('Zonas', 'ELIMINAR');
  const [formData, setFormData] = useState(emptyZone);
  const [editingId, setEditingId] = useState(null);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const totalPages = Math.max(1, Math.ceil(zones.length / itemsPerPage));
  const paginatedZones = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return zones.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, itemsPerPage, zones]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const closeZoneModal = () => {
    setFormData(emptyZone);
    setEditingId(null);
    setIsZoneModalOpen(false);
  };

  const openNewZoneModal = () => {
    setFormData(emptyZone);
    setEditingId(null);
    setIsZoneModalOpen(true);
  };

  const submitZoneForm = async (event) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }
    await saveZone({ ...formData, id: editingId });
    closeZoneModal();
  };

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando zonas...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader title="Ciudades o zonas" />
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      <div className="admin-panel-toolbar">
        <div className="admin-inline-summary">
          <span>Zonas registradas</span>
          <strong>{zones.length}</strong>
        </div>
        {canCreate && (
          <button type="button" className="primary-button" onClick={openNewZoneModal}>
            Nueva zona
          </button>
        )}
      </div>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Ciudad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedZones.map((zone) => (
              <tr key={zone.id}>
                <td data-label="Zona">{zone.name}</td>
                <td data-label="Ciudad">{zone.city}</td>
                <td data-label="Acciones">
                  <CrudActions
                    onEdit={() => {
                      setEditingId(zone.id);
                      setFormData(zone);
                      setIsZoneModalOpen(true);
                    }}
                    onDelete={() => deleteZone(zone.id)}
                    canEdit={canCreate}
                    canDelete={canDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={zones.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
      <ZoneFormModal
        isOpen={isZoneModalOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        canCreate={canCreate}
        onClose={closeZoneModal}
        onSubmit={submitZoneForm}
      />
    </div>
  );
};

export const AdminImagesPage = () => {
  const { properties, isLoading } = useRealEstate();
  const imageMetrics = useMemo(
    () =>
      properties.map((property) => ({
        id: property.id,
        title: property.title,
        coverImage: property.coverImage,
        totalImages: property.images.length,
      })),
    [properties]
  );

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando imagenes...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        title="Imagenes"
        text="Cada propiedad administra su portada y galeria desde el formulario principal. Aqui se visualiza rapidamente el estado de su material grafico."
      />
      <div className="image-admin-grid">
        {imageMetrics.map((item) => (
          <article key={item.id} className="image-admin-card">
            <img src={item.coverImage} alt={item.title} />
            <div>
              <h3>{item.title}</h3>
              <p>{item.totalImages} imagenes registradas</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export const AdminContactsPage = () => {
  const { hasPermission, user, isAdmin } = useContext(AuthContext);
  const location = useLocation();
  const { contacts, properties, agents, updateContactStatus, deleteContact, isLoading } =
    useRealEstate();
  const canCreate = hasPermission('Contactos', 'CREAR');
  const canDelete = hasPermission('Contactos', 'ELIMINAR');
  const [statusTab, setStatusTab] = useState('Abiertas');
  const [sortOrder, setSortOrder] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const loggedAgent = useMemo(
    () => agents.find((agent) => String(agent.userId) === String(user?.CODIGO)),
    [agents, user?.CODIGO]
  );
  const scopedProperties = useMemo(
    () =>
      isAdmin
        ? properties
        : loggedAgent
          ? properties.filter((property) => String(property.agentId) === String(loggedAgent.id))
          : [],
    [isAdmin, loggedAgent, properties]
  );
  const scopedPropertyIds = useMemo(
    () => new Set(scopedProperties.map((property) => String(property.id))),
    [scopedProperties]
  );
  const propertyNameById = useMemo(
    () =>
      scopedProperties.reduce((accumulator, property) => {
        accumulator[property.id] = property.title;
        return accumulator;
      }, {}),
    [scopedProperties]
  );
  const clientFilter = useMemo(
    () => new URLSearchParams(location.search).get('client')?.trim().toLowerCase() || '',
    [location.search]
  );

  const filteredContacts = useMemo(() => {
    const normalizedStatus = statusTab === 'Cerradas' ? 'Cerrada' : 'Abierta';
    const scopedBaseContacts = isAdmin
      ? contacts
      : contacts.filter(
          (contact) => contact.propertyId && scopedPropertyIds.has(String(contact.propertyId))
        );
    const matchesStatus = scopedBaseContacts.filter(
      (contact) => contact.status === normalizedStatus
    );
    const clientScopedContacts = clientFilter
      ? matchesStatus.filter((contact) =>
          [contact.name, contact.email, contact.phone]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(clientFilter))
        )
      : matchesStatus;

    return [...clientScopedContacts].sort((left, right) => {
      const leftDate = new Date(left.createdAt || 0).getTime();
      const rightDate = new Date(right.createdAt || 0).getTime();
      return sortOrder === 'recent' ? rightDate - leftDate : leftDate - rightDate;
    });
  }, [clientFilter, contacts, isAdmin, scopedPropertyIds, sortOrder, statusTab]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, sortOrder, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredContacts, itemsPerPage]);

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando solicitudes...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        title="Solicitudes y contactos"
        text="Actualiza el estado de cada lead desde el dashboard administrativo."
      />
      {!isAdmin && loggedAgent && (
        <div className="permission-hint">
          Mostrando solo solicitudes relacionadas con las publicaciones de{' '}
          <strong>{loggedAgent.name}</strong>.
        </div>
      )}
      {!isAdmin && !loggedAgent && (
        <div className="feedback-banner warning">
          Tu usuario aun no esta vinculado a un agente. Por eso no se muestran solicitudes.
        </div>
      )}
      {clientFilter && (
        <div className="permission-hint">
          Filtrando solicitudes por cliente: <strong>{clientFilter}</strong>
        </div>
      )}
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      <div className="admin-history-toolbar">
        <div className="table-actions">
          <button
            type="button"
            className={`table-button ${statusTab === 'Abiertas' ? 'active-page' : 'ghost'}`}
            onClick={() => setStatusTab('Abiertas')}
          >
            Abiertas
          </button>
          <button
            type="button"
            className={`table-button ${statusTab === 'Cerradas' ? 'active-page' : 'ghost'}`}
            onClick={() => setStatusTab('Cerradas')}
          >
            Cerradas
          </button>
        </div>
        <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
          <option value="recent">Mas recientes primero</option>
          <option value="oldest">Mas antiguas primero</option>
        </select>
        <span className="history-counter">
          {filteredContacts.length} {filteredContacts.length === 1 ? 'solicitud' : 'solicitudes'}
        </span>
      </div>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Propiedad</th>
              <th>Mensaje</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedContacts.map((contact) => (
              <tr key={contact.id}>
                <td data-label="Cliente">
                  <strong>{contact.name}</strong>
                  <div>{contact.phone}</div>
                  <div>{contact.email}</div>
                </td>
                <td data-label="Propiedad">
                  {contact.propertyId ? propertyNameById[contact.propertyId] : 'Consulta general'}
                </td>
                <td data-label="Mensaje">{contact.message}</td>
                <td data-label="Fecha">
                  {contact.createdAt ? String(contact.createdAt).slice(0, 10) : 'Sin fecha'}
                </td>
                <td data-label="Estado">
                  <select
                    value={contact.status}
                    onChange={(event) => updateContactStatus(contact.id, event.target.value)}
                    disabled={!canCreate}
                  >
                    <option value="Abierta">Abierta</option>
                    <option value="Cerrada">Cerrada</option>
                  </select>
                </td>
                <td data-label="Acciones">
                  <div className="table-actions">
                    {canDelete ? (
                      <button
                        type="button"
                        className="table-button danger"
                        onClick={() => deleteContact(contact.id)}
                      >
                        Eliminar
                      </button>
                    ) : (
                      <span className="muted-copy">Sin permisos</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredContacts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
};
