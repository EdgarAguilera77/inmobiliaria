import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import { useRealEstate } from '../../contexts/RealEstateContext';
import AdminPagination from '../common/AdminPagination';

const currencyFormatter = new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
  maximumFractionDigits: 0,
});

const formatMoney = (value) => currencyFormatter.format(Number(value || 0));

const SectionHeader = ({ title, text }) => (
  <div className="admin-header">
    <div>
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </div>
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

const basePlanForm = {
  name: '',
  description: '',
  price: '',
  durationDays: '30',
  imageLimit: '10',
  allowsFeatured: false,
  priorityLevel: '1',
  active: true,
};

const baseSubscriptionForm = {
  propertyId: '',
  planId: '',
  agentId: '',
  finalPrice: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  status: 'Pendiente de pago',
  autoRenew: false,
  notes: '',
};

const basePaymentForm = {
  subscriptionId: '',
  amount: '',
  paymentMethod: 'Transferencia',
  reference: '',
  status: 'Pendiente',
  paidAt: new Date().toISOString().slice(0, 10),
  notes: '',
};

const AdminModalShell = ({ chip, title, isOpen, onClose, children, wide = false }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        className={`admin-modal ${wide ? 'admin-modal-wide' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="section-chip">{chip}</span>
            <h3>{title}</h3>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const useAdminPagination = (items, initialPageSize = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, items, itemsPerPage]);

  const updateItemsPerPage = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedItems,
    setCurrentPage,
    setItemsPerPage: updateItemsPerPage,
  };
};

export const AdminPlansPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const { plans, savePlan, deletePlan, isLoading } = useRealEstate();
  const canCreate = hasPermission('Planes', 'CREAR');
  const canDelete = hasPermission('Planes', 'ELIMINAR');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState(basePlanForm);
  const pagination = useAdminPagination(plans);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setFormData(basePlanForm);
  };

  const openNewModal = () => {
    setIsModalOpen(true);
    setEditingPlan(null);
    setFormData(basePlanForm);
  };

  const openEditModal = (plan) => {
    setIsModalOpen(true);
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: String(plan.price),
      durationDays: String(plan.durationDays),
      imageLimit: String(plan.imageLimit),
      allowsFeatured: plan.allowsFeatured,
      priorityLevel: String(plan.priorityLevel),
      active: plan.active,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }

    await savePlan({ ...formData, id: editingPlan?.id || null });
    closeModal();
  };

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando planes...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        title="Planes"
        text="Define los paquetes de publicacion que controlan precio, duracion, cupo de imagenes y visibilidad comercial."
      />
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      <div className="admin-panel-toolbar">
        <div className="admin-inline-summary">
          <span>Planes activos</span>
          <strong>{plans.filter((plan) => plan.active).length}</strong>
        </div>
        {canCreate && (
          <button type="button" className="primary-button" onClick={openNewModal}>
            Nuevo plan
          </button>
        )}
      </div>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Precio</th>
              <th>Duracion</th>
              <th>Imagenes</th>
              <th>Prioridad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.map((plan) => (
                <tr key={plan.id}>
                <td data-label="Plan">
                  <strong>{plan.name}</strong>
                  <div>{plan.description}</div>
                </td>
                <td data-label="Precio">{formatMoney(plan.price)}</td>
                <td data-label="Duracion">{plan.durationDays} dias</td>
                <td data-label="Imagenes">
                  {plan.imageLimit}
                  {plan.allowsFeatured ? ' + destacada' : ''}
                </td>
                <td data-label="Prioridad">{plan.priorityLevel}</td>
                <td data-label="Acciones">
                  <div className="table-actions">
                    {canCreate && (
                      <button
                        type="button"
                        className="table-button ghost"
                        onClick={() => openEditModal(plan)}
                      >
                        Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="table-button danger"
                        onClick={() => deletePlan(plan.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={plans.length}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.setCurrentPage}
          onItemsPerPageChange={pagination.setItemsPerPage}
        />
      </div>
      <AdminModalShell
        chip="Planes"
        title={editingPlan ? 'Editar plan' : 'Nuevo plan'}
        isOpen={isModalOpen}
        onClose={closeModal}
      >
        <form className="compact-admin-form" onSubmit={handleSubmit}>
          <input
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            placeholder="Nombre del plan"
            required
            disabled={!canCreate}
          />
          <textarea
            rows="4"
            value={formData.description}
            onChange={(event) => setFormData({ ...formData, description: event.target.value })}
            placeholder="Descripcion del plan"
            required
            disabled={!canCreate}
          />
          <div className="admin-form-row">
            <input
              value={formData.price}
              onChange={(event) => setFormData({ ...formData, price: event.target.value })}
              placeholder="Precio"
              required
              disabled={!canCreate}
            />
            <input
              value={formData.durationDays}
              onChange={(event) => setFormData({ ...formData, durationDays: event.target.value })}
              placeholder="Duracion en dias"
              required
              disabled={!canCreate}
            />
          </div>
          <div className="admin-form-row">
            <input
              value={formData.imageLimit}
              onChange={(event) => setFormData({ ...formData, imageLimit: event.target.value })}
              placeholder="Limite de imagenes"
              required
              disabled={!canCreate}
            />
            <input
              value={formData.priorityLevel}
              onChange={(event) => setFormData({ ...formData, priorityLevel: event.target.value })}
              placeholder="Nivel de prioridad"
              required
              disabled={!canCreate}
            />
          </div>
          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={formData.allowsFeatured}
                onChange={(event) =>
                  setFormData({ ...formData, allowsFeatured: event.target.checked })
                }
                disabled={!canCreate}
              />
              Permite propiedad destacada
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(event) => setFormData({ ...formData, active: event.target.checked })}
                disabled={!canCreate}
              />
              Activo
            </label>
          </div>
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              Guardar plan
            </button>
            <button type="button" className="secondary-button" onClick={closeModal}>
              Cancelar
            </button>
          </div>
        </form>
      </AdminModalShell>
    </div>
  );
};

export const AdminSubscriptionsPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const { subscriptions, properties, plans, agents, saveSubscription, deleteSubscription, isLoading } =
    useRealEstate();
  const canCreate = hasPermission('Suscripciones', 'CREAR');
  const canDelete = hasPermission('Suscripciones', 'ELIMINAR');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [formData, setFormData] = useState(baseSubscriptionForm);
  const pagination = useAdminPagination(subscriptions);

  const visibleProperties = useMemo(
    () => properties.filter((property) => property.commercialStatus === 'Disponible'),
    [properties]
  );

  const summary = useMemo(
    () => ({
      active: subscriptions.filter((subscription) => subscription.status === 'Activa').length,
      pending: subscriptions.filter((subscription) => subscription.status === 'Pendiente de pago')
        .length,
      expiring: subscriptions.filter((subscription) => {
        if (subscription.status !== 'Activa') {
          return false;
        }

        const endDate = new Date(subscription.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      }).length,
    }),
    [subscriptions]
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubscription(null);
    setFormData(baseSubscriptionForm);
  };

  const openNewModal = () => {
    setEditingSubscription(null);
    setFormData(baseSubscriptionForm);
    setIsModalOpen(true);
  };

  const openEditModal = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      propertyId: String(subscription.propertyId),
      planId: String(subscription.planId),
      agentId: subscription.agentId ? String(subscription.agentId) : '',
      finalPrice: String(subscription.finalPrice),
      startDate: subscription.startDate ? String(subscription.startDate).slice(0, 10) : '',
      endDate: subscription.endDate ? String(subscription.endDate).slice(0, 10) : '',
      status: subscription.status,
      autoRenew: subscription.autoRenew,
      notes: subscription.notes,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }

    await saveSubscription({ ...formData, id: editingSubscription?.id || null });
    closeModal();
  };

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando suscripciones...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        title="Suscripciones"
        text="Controla que propiedad esta publicada, cuanto dura su exposicion y si ya cumplio el requisito de pago."
      />
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      <div className="admin-stat-grid admin-stat-grid-compact">
        <div className="admin-stat-card">
          <span>Activas</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Pendientes de pago</span>
          <strong>{summary.pending}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Por vencer</span>
          <strong>{summary.expiring}</strong>
        </div>
      </div>
      <div className="admin-panel-toolbar">
        <div className="admin-inline-summary">
          <span>Suscripciones registradas</span>
          <strong>{subscriptions.length}</strong>
        </div>
        {canCreate && (
          <button type="button" className="primary-button" onClick={openNewModal}>
            Nueva suscripcion
          </button>
        )}
      </div>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Propiedad</th>
              <th>Plan</th>
              <th>Vigencia</th>
              <th>Estado</th>
              <th>Pagado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.map((subscription) => (
                <tr key={subscription.id}>
                <td data-label="Propiedad">
                  <strong>{subscription.propertyTitle}</strong>
                  <div>{subscription.propertyPublicationStatus}</div>
                </td>
                <td data-label="Plan">
                  <strong>{subscription.planName}</strong>
                  <div>{formatMoney(subscription.finalPrice)}</div>
                </td>
                <td data-label="Vigencia">
                  <strong>{String(subscription.startDate).slice(0, 10)}</strong>
                  <div>Hasta {String(subscription.endDate).slice(0, 10)}</div>
                </td>
                <td data-label="Estado">{subscription.status}</td>
                <td data-label="Pagado">
                  <strong>{formatMoney(subscription.totalPaid)}</strong>
                  <div>{subscription.totalPayments} pagos</div>
                </td>
                <td data-label="Acciones">
                  <div className="table-actions">
                    {canCreate && (
                      <button
                        type="button"
                        className="table-button ghost"
                        onClick={() => openEditModal(subscription)}
                      >
                        Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="table-button danger"
                        onClick={() => deleteSubscription(subscription.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={subscriptions.length}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.setCurrentPage}
          onItemsPerPageChange={pagination.setItemsPerPage}
        />
      </div>
      <AdminModalShell
        chip="Suscripciones"
        title={editingSubscription ? 'Editar suscripcion' : 'Nueva suscripcion'}
        isOpen={isModalOpen}
        onClose={closeModal}
        wide
      >
        <form className="compact-admin-form" onSubmit={handleSubmit}>
          <div className="admin-form-row">
            <select
              value={formData.propertyId}
              onChange={(event) => setFormData({ ...formData, propertyId: event.target.value })}
              required
              disabled={!canCreate || Boolean(editingSubscription)}
            >
              <option value="">Propiedad</option>
              {visibleProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </select>
            <select
              value={formData.planId}
              onChange={(event) => setFormData({ ...formData, planId: event.target.value })}
              required
              disabled={!canCreate}
            >
              <option value="">Plan</option>
              {plans
                .filter((plan) => plan.active)
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="admin-form-row">
            <select
              value={formData.agentId}
              onChange={(event) => setFormData({ ...formData, agentId: event.target.value })}
              disabled={!canCreate}
            >
              <option value="">Agente responsable</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <input
              value={formData.finalPrice}
              onChange={(event) => setFormData({ ...formData, finalPrice: event.target.value })}
              placeholder="Precio final"
              disabled={!canCreate}
            />
          </div>
          <div className="admin-form-row">
            <input
              type="date"
              value={formData.startDate}
              onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
              required
              disabled={!canCreate}
            />
            <input
              type="date"
              value={formData.endDate}
              onChange={(event) => setFormData({ ...formData, endDate: event.target.value })}
              required
              disabled={!canCreate}
            />
          </div>
          <div className="admin-form-row">
            <select
              value={formData.status}
              onChange={(event) => setFormData({ ...formData, status: event.target.value })}
              disabled={!canCreate}
            >
              <option value="Pendiente de pago">Pendiente de pago</option>
              <option value="Activa">Activa</option>
              <option value="Cancelada">Cancelada</option>
              <option value="Vencida">Vencida</option>
            </select>
          </div>
          <textarea
            rows="4"
            value={formData.notes}
            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
            placeholder="Observaciones"
            disabled={!canCreate}
          />
          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={formData.autoRenew}
                onChange={(event) =>
                  setFormData({ ...formData, autoRenew: event.target.checked })
                }
                disabled={!canCreate}
              />
              Auto renovar
            </label>
          </div>
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              Guardar suscripcion
            </button>
            <button type="button" className="secondary-button" onClick={closeModal}>
              Cancelar
            </button>
          </div>
        </form>
      </AdminModalShell>
    </div>
  );
};

export const AdminPublicationPaymentsPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const {
    publicationPayments,
    subscriptions,
    savePublicationPayment,
    deletePublicationPayment,
    isLoading,
  } = useRealEstate();
  const canCreate = hasPermission('PagosPublicacion', 'CREAR');
  const canDelete = hasPermission('PagosPublicacion', 'ELIMINAR');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState(basePaymentForm);
  const pagination = useAdminPagination(publicationPayments);

  const summary = useMemo(
    () => ({
      paid: publicationPayments
        .filter((payment) => payment.status === 'Pagado')
        .reduce((total, payment) => total + payment.amount, 0),
      pending: publicationPayments
        .filter((payment) => payment.status === 'Pendiente')
        .reduce((total, payment) => total + payment.amount, 0),
    }),
    [publicationPayments]
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setFormData(basePaymentForm);
  };

  const openNewModal = () => {
    setEditingPayment(null);
    setFormData(basePaymentForm);
    setIsModalOpen(true);
  };

  const openEditModal = (payment) => {
    setEditingPayment(payment);
    setFormData({
      subscriptionId: String(payment.subscriptionId),
      amount: String(payment.amount),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      status: payment.status,
      paidAt: payment.paidAt ? String(payment.paidAt).slice(0, 10) : '',
      notes: payment.notes,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }

    await savePublicationPayment({ ...formData, id: editingPayment?.id || null });
    closeModal();
  };

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando pagos...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        title="Pagos de publicacion"
        text="Registra cobros, referencias y estado de pago para que la suscripcion controle la visibilidad publica."
      />
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      <div className="admin-stat-grid admin-stat-grid-compact">
        <div className="admin-stat-card">
          <span>Cobrado</span>
          <strong>{formatMoney(summary.paid)}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Pendiente</span>
          <strong>{formatMoney(summary.pending)}</strong>
        </div>
      </div>
      <div className="admin-panel-toolbar">
        <div className="admin-inline-summary">
          <span>Pagos registrados</span>
          <strong>{publicationPayments.length}</strong>
        </div>
        {canCreate && (
          <button type="button" className="primary-button" onClick={openNewModal}>
            Nuevo pago
          </button>
        )}
      </div>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Propiedad</th>
              <th>Plan</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Referencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.map((payment) => (
                <tr key={payment.id}>
                <td data-label="Propiedad">
                  <strong>{payment.propertyTitle}</strong>
                  <div>{payment.subscriptionStatus}</div>
                </td>
                <td data-label="Plan">{payment.planName}</td>
                <td data-label="Monto">{formatMoney(payment.amount)}</td>
                <td data-label="Estado">{payment.status}</td>
                <td data-label="Referencia">{payment.reference || 'Sin referencia'}</td>
                <td data-label="Acciones">
                  <div className="table-actions">
                    {canCreate && (
                      <button
                        type="button"
                        className="table-button ghost"
                        onClick={() => openEditModal(payment)}
                      >
                        Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="table-button danger"
                        onClick={() => deletePublicationPayment(payment.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={publicationPayments.length}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.setCurrentPage}
          onItemsPerPageChange={pagination.setItemsPerPage}
        />
      </div>
      <AdminModalShell
        chip="Pagos"
        title={editingPayment ? 'Editar pago' : 'Nuevo pago'}
        isOpen={isModalOpen}
        onClose={closeModal}
      >
        <form className="compact-admin-form" onSubmit={handleSubmit}>
          <select
            value={formData.subscriptionId}
            onChange={(event) => setFormData({ ...formData, subscriptionId: event.target.value })}
            required
            disabled={!canCreate || Boolean(editingPayment)}
          >
            <option value="">Suscripcion</option>
            {subscriptions.map((subscription) => (
              <option key={subscription.id} value={subscription.id}>
                {subscription.propertyTitle} - {subscription.planName}
              </option>
            ))}
          </select>
          <div className="admin-form-row">
            <input
              value={formData.amount}
              onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
              placeholder="Monto"
              required
              disabled={!canCreate}
            />
            <select
              value={formData.paymentMethod}
              onChange={(event) => setFormData({ ...formData, paymentMethod: event.target.value })}
              disabled={!canCreate}
            >
              <option value="Transferencia">Transferencia</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Deposito">Deposito</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="admin-form-row">
            <input
              value={formData.reference}
              onChange={(event) => setFormData({ ...formData, reference: event.target.value })}
              placeholder="Referencia"
              disabled={!canCreate}
            />
            <input
              type="date"
              value={formData.paidAt}
              onChange={(event) => setFormData({ ...formData, paidAt: event.target.value })}
              disabled={!canCreate}
            />
          </div>
          <select
            value={formData.status}
            onChange={(event) => setFormData({ ...formData, status: event.target.value })}
            disabled={!canCreate}
          >
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
            <option value="Rechazado">Rechazado</option>
          </select>
          <textarea
            rows="4"
            value={formData.notes}
            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
            placeholder="Observaciones"
            disabled={!canCreate}
          />
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              Guardar pago
            </button>
            <button type="button" className="secondary-button" onClick={closeModal}>
              Cancelar
            </button>
          </div>
        </form>
      </AdminModalShell>
    </div>
  );
};
