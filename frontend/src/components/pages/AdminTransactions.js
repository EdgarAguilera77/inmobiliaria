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
const DEFAULT_COMMISSION_RATE = 5;
const DEFAULT_PLATFORM_FEE_RATE = 5;
const clampPercent = (value, fallback) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, numericValue));
};

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

const CommissionSettingsModal = ({
  isOpen,
  formData,
  setFormData,
  onClose,
  onSubmit,
  canCreate,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="section-chip">Comisiones</span>
            <h3>Configurar parametros</h3>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <form className="compact-admin-form" onSubmit={onSubmit}>
          <div className="admin-form-row">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.minimumRate}
              onChange={(event) =>
                setFormData({ ...formData, minimumRate: event.target.value })
              }
              placeholder="% minimo"
              disabled={!canCreate}
            />
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.maximumRate}
              onChange={(event) =>
                setFormData({ ...formData, maximumRate: event.target.value })
              }
              placeholder="% maximo"
              disabled={!canCreate}
            />
          </div>
          <div className="admin-form-row">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.defaultRate}
              onChange={(event) =>
                setFormData({ ...formData, defaultRate: event.target.value })
              }
              placeholder="% por defecto"
              disabled={!canCreate}
            />
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.defaultAgentRate}
              onChange={(event) =>
                setFormData({ ...formData, defaultAgentRate: event.target.value })
              }
              placeholder="% pagina por defecto"
              disabled={!canCreate}
            />
          </div>
          <div className="admin-inline-summary stack">
            <span>Rango permitido para la pagina: {formData.minimumRate}% a {formData.maximumRate}%</span>
            <span>Comision del agente por defecto: {formData.defaultRate}%</span>
            <span>Retencion pagina por defecto: {formData.defaultAgentRate}%</span>
          </div>
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              Guardar configuracion
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

const useAdminPagination = (items, initialPageSize = 5) => {
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

const SaleModal = ({
  isOpen,
  title,
  formData,
  setFormData,
  agents,
  onClose,
  onSubmit,
  canCreate,
}) => {
  if (!isOpen) {
    return null;
  }

  const normalizedCommissionRate = clampPercent(formData.commissionRate, DEFAULT_COMMISSION_RATE);
  const normalizedPlatformFeeRate = clampPercent(
    formData.agentCommissionRate,
    DEFAULT_PLATFORM_FEE_RATE
  );
  const normalizedAgentNetRate = Number((100 - normalizedPlatformFeeRate).toFixed(2));
  const totalCommission = (
    (Number(formData.closingPrice || 0) * normalizedCommissionRate) /
    100
  );
  const ownerCommissionAmount = (totalCommission * normalizedPlatformFeeRate) / 100;
  const agentCommissionAmount = totalCommission - ownerCommissionAmount;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal admin-modal-wide" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="section-chip">Ventas</span>
            <h3>{title}</h3>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <form className="compact-admin-form" onSubmit={onSubmit}>
          <div className="admin-form-row">
            <input
              value={formData.clientName}
              onChange={(event) => setFormData({ ...formData, clientName: event.target.value })}
              placeholder="Nombre del cliente"
              required
              disabled={!canCreate}
            />
            <input
              value={formData.clientIdentity}
              onChange={(event) =>
                setFormData({ ...formData, clientIdentity: event.target.value })
              }
              placeholder="Identidad"
              disabled={!canCreate}
            />
          </div>
          <div className="admin-form-row">
            <input
              value={formData.clientPhone}
              onChange={(event) => setFormData({ ...formData, clientPhone: event.target.value })}
              placeholder="Telefono"
              disabled={!canCreate}
            />
            <input
              type="email"
              value={formData.clientEmail}
              onChange={(event) => setFormData({ ...formData, clientEmail: event.target.value })}
              placeholder="Correo"
              disabled={!canCreate}
            />
          </div>
          <div className="admin-form-row">
            <select
              value={formData.agentId}
              onChange={(event) => setFormData({ ...formData, agentId: event.target.value })}
              required
              disabled={!canCreate}
            >
              <option value="">Agente</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <select
              value={formData.businessType}
              onChange={(event) => setFormData({ ...formData, businessType: event.target.value })}
              required
              disabled={!canCreate}
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
              disabled={!canCreate}
            />
            <input
              value={formData.commissionRate}
              onChange={(event) =>
                setFormData({ ...formData, commissionRate: event.target.value })
              }
              placeholder="% comision"
              required
              disabled={!canCreate}
            />
            <input
              value={formData.agentCommissionRate}
              onChange={(event) =>
                setFormData({ ...formData, agentCommissionRate: event.target.value })
              }
              placeholder="% pagina"
              required
              disabled={!canCreate}
            />
            <input
              type="date"
              value={formData.closingDate}
              onChange={(event) => setFormData({ ...formData, closingDate: event.target.value })}
              required
              disabled={!canCreate}
            />
          </div>
          <select
            value={formData.saleStatus}
            onChange={(event) => setFormData({ ...formData, saleStatus: event.target.value })}
            disabled={!canCreate}
          >
            <option value="Cerrada">Cerrada</option>
            <option value="Anulada">Anulada</option>
          </select>
          <textarea
            rows="4"
            value={formData.observations}
            onChange={(event) => setFormData({ ...formData, observations: event.target.value })}
            placeholder="Observaciones"
            disabled={!canCreate}
          />
          <div className="admin-inline-summary">
            <span>Comision bruta del agente</span>
            <strong>{formatMoney(totalCommission)}</strong>
          </div>
          <div className="admin-inline-summary stack">
            <span>
              Retencion pagina: {normalizedPlatformFeeRate}% - <strong>{formatMoney(ownerCommissionAmount)}</strong>
            </span>
            <span>
              Agente neto: {normalizedAgentNetRate}% - <strong>{formatMoney(agentCommissionAmount)}</strong>
            </span>
          </div>
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              Guardar venta
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

const CommissionModal = ({
  isOpen,
  commission,
  formData,
  setFormData,
  onClose,
  onSubmit,
  canCreate,
}) => {
  if (!isOpen || !commission) {
    return null;
  }

  const normalizedPlatformFeeRate = clampPercent(
    formData.platformRate,
    commission.agentCommissionRate || DEFAULT_PLATFORM_FEE_RATE
  );
  const normalizedAgentNetRate = Number((100 - normalizedPlatformFeeRate).toFixed(2));
  const grossCommissionAmount = Number(commission.amount || 0);
  const platformAmount = (grossCommissionAmount * normalizedPlatformFeeRate) / 100;
  const agentNetAmount = grossCommissionAmount - platformAmount;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="section-chip">Comisiones</span>
            <h3>Actualizar estado de comision</h3>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="admin-inline-summary stack">
          <span>{commission.propertyTitle}</span>
          <strong>{formatMoney(grossCommissionAmount)}</strong>
          <span>
            Retencion pagina: {normalizedPlatformFeeRate}% - {formatMoney(platformAmount)}
          </span>
          <span>
            Agente neto: {normalizedAgentNetRate}% - {formatMoney(agentNetAmount)}
          </span>
        </div>
        <form className="compact-admin-form" onSubmit={onSubmit}>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.platformRate}
            onChange={(event) => setFormData({ ...formData, platformRate: event.target.value })}
            placeholder="% pagina"
            disabled={!canCreate}
          />
          <select
            value={formData.status}
            onChange={(event) => setFormData({ ...formData, status: event.target.value })}
            disabled={!canCreate}
          >
            <option value="Pendiente">Pendiente</option>
            <option value="Parcial">Parcial</option>
            <option value="Pagada">Pagada</option>
          </select>
          <input
            type="date"
            value={formData.paymentDate}
            onChange={(event) => setFormData({ ...formData, paymentDate: event.target.value })}
            disabled={!canCreate}
          />
          <textarea
            rows="4"
            value={formData.paymentNotes}
            onChange={(event) => setFormData({ ...formData, paymentNotes: event.target.value })}
            placeholder="Observaciones de pago"
            disabled={!canCreate}
          />
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              Guardar estado
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

const defaultSaleForm = {
  propertyId: '',
  agentId: '',
  clientName: '',
  clientIdentity: '',
  clientPhone: '',
  clientEmail: '',
  closingPrice: '',
  businessType: 'Venta',
  commissionRate: String(DEFAULT_COMMISSION_RATE),
  agentCommissionRate: String(DEFAULT_PLATFORM_FEE_RATE),
  closingDate: new Date().toISOString().slice(0, 10),
  saleStatus: 'Cerrada',
  observations: '',
};

export const AdminSalesPage = () => {
  const { hasPermission, user, isAdmin } = useContext(AuthContext);
  const { sales, agents, commissionSettings, updateSale, deleteSale, isLoading } = useRealEstate();
  const canCreate = hasPermission('Ventas', 'CREAR');
  const canDelete = hasPermission('Ventas', 'ELIMINAR');
  const [editingSale, setEditingSale] = useState(null);
  const [formData, setFormData] = useState(defaultSaleForm);
  const loggedAgent = useMemo(
    () => agents.find((agent) => String(agent.userId) === String(user?.CODIGO)),
    [agents, user?.CODIGO]
  );
  const filteredSales = useMemo(
    () =>
      isAdmin
        ? sales
        : loggedAgent
          ? sales.filter((sale) => String(sale.agentId) === String(loggedAgent.id))
          : [],
    [isAdmin, loggedAgent, sales]
  );
  const modalAgents = useMemo(
    () => (isAdmin ? agents : loggedAgent ? [loggedAgent] : []),
    [agents, isAdmin, loggedAgent]
  );
  const pagination = useAdminPagination(filteredSales);
  const monthlySalesTotal = useMemo(
    () =>
      filteredSales.reduce((total, sale) => {
        const saleDate = sale.closingDate ? new Date(sale.closingDate) : null;
        const now = new Date();
        if (
          !saleDate ||
          saleDate.getMonth() !== now.getMonth() ||
          saleDate.getFullYear() !== now.getFullYear()
        ) {
          return total;
        }
        return total + Number(sale.closingPrice || 0);
      }, 0),
    [filteredSales]
  );

  const openEditModal = (sale) => {
    setEditingSale(sale);
    setFormData({
      propertyId: String(sale.propertyId),
      agentId: String(sale.agentId),
      clientName: sale.clientName,
      clientIdentity: sale.clientIdentity,
      clientPhone: sale.clientPhone,
      clientEmail: sale.clientEmail,
      closingPrice: String(sale.closingPrice),
      businessType: sale.businessType,
      commissionRate: String(sale.commissionRate ?? commissionSettings.defaultRate),
      agentCommissionRate: String(
        sale.agentCommissionRate ?? commissionSettings.defaultAgentRate
      ),
      closingDate: sale.closingDate ? String(sale.closingDate).slice(0, 10) : '',
      saleStatus: sale.saleStatus,
      observations: sale.observations,
      userId: user?.CODIGO || null,
    });
  };

  const resetModal = () => {
    setEditingSale(null);
    setFormData(defaultSaleForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingSale) {
      return;
    }

    await updateSale(editingSale.id, formData);
    resetModal();
  };

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando ventas...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        title="Ventas"
        text="Consulta cierres de negocio, edita ventas registradas y revierte operaciones si es necesario."
      />
      {!isAdmin && loggedAgent && (
        <div className="permission-hint">
          Mostrando solo las ventas del agente <strong>{loggedAgent.name}</strong>.
        </div>
      )}
      {!isAdmin && !loggedAgent && (
        <div className="feedback-banner warning">
          Tu usuario aun no esta vinculado a un agente. Por eso no se muestran ventas.
        </div>
      )}
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      <div className="admin-panel-toolbar">
        <div className="admin-inline-summary">
          <span>Ventas registradas</span>
          <strong>{filteredSales.length}</strong>
        </div>
        <div className="admin-inline-summary">
          <span>Total del mes</span>
          <strong>{formatMoney(monthlySalesTotal)}</strong>
        </div>
      </div>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Propiedad</th>
              <th>Cliente</th>
              <th>Agente</th>
              <th>Cierre</th>
              <th>Comision</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.map((sale) => (
                <tr key={sale.id}>
                <td data-label="Propiedad">
                  <strong>{sale.propertyTitle}</strong>
                  <div>{sale.businessType}</div>
                </td>
                <td data-label="Cliente">
                  <strong>{sale.clientName}</strong>
                  <div>{sale.clientPhone}</div>
                </td>
                <td data-label="Agente">{sale.agentName}</td>
                <td data-label="Cierre">
                  <strong>{formatMoney(sale.closingPrice)}</strong>
                  <div>{String(sale.closingDate).slice(0, 10)}</div>
                </td>
                <td data-label="Comision">
                  <strong>{formatMoney(sale.commissionAmount)}</strong>
                  <div>{sale.commissionRate}% total</div>
                  <div>
                    Pagina {sale.agentCommissionRate}% | Agente neto {sale.ownerCommissionRate}%
                  </div>
                </td>
                <td data-label="Estado">{sale.saleStatus}</td>
                <td data-label="Acciones">
                  <div className="table-actions">
                    {canCreate && (
                      <button
                        type="button"
                        className="table-button ghost"
                        onClick={() => openEditModal(sale)}
                      >
                        Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="table-button danger"
                        onClick={() => deleteSale(sale.id)}
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
          totalItems={filteredSales.length}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.setCurrentPage}
          onItemsPerPageChange={pagination.setItemsPerPage}
        />
      </div>
      <SaleModal
        isOpen={Boolean(editingSale)}
        title="Editar venta cerrada"
        formData={formData}
        setFormData={setFormData}
        agents={modalAgents}
        onClose={resetModal}
        onSubmit={handleSubmit}
        canCreate={canCreate}
      />
    </div>
  );
};

export const AdminCommissionsPage = () => {
  const { hasPermission, user, isAdmin } = useContext(AuthContext);
  const { commissions, commissionSettings, saveCommissionSettings, updateCommissionStatus, isLoading, agents } = useRealEstate();
  const canCreate = hasPermission('Comisiones', 'CREAR');
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    status: 'Pendiente',
    paymentDate: '',
    paymentNotes: '',
    platformRate: '',
  });
  const loggedAgent = useMemo(
    () => agents.find((agent) => String(agent.userId) === String(user?.CODIGO)),
    [agents, user?.CODIGO]
  );
  const filteredCommissions = useMemo(
    () =>
      isAdmin
        ? commissions
        : loggedAgent
          ? commissions.filter((commission) => String(commission.agentId) === String(loggedAgent.id))
          : [],
    [commissions, isAdmin, loggedAgent]
  );
  const [settingsForm, setSettingsForm] = useState({
    minimumRate: String(commissionSettings.minimumRate),
    maximumRate: String(commissionSettings.maximumRate),
    defaultRate: String(commissionSettings.defaultRate),
    defaultAgentRate: String(commissionSettings.defaultAgentRate),
  });
  const pagination = useAdminPagination(filteredCommissions);

  useEffect(() => {
    setSettingsForm({
      minimumRate: String(commissionSettings.minimumRate),
      maximumRate: String(commissionSettings.maximumRate),
      defaultRate: String(commissionSettings.defaultRate),
      defaultAgentRate: String(commissionSettings.defaultAgentRate),
    });
  }, [commissionSettings]);

  const openCommissionModal = (commission) => {
    setSelectedCommission(commission);
    setFormData({
      status: commission.status,
      paymentDate: commission.paidAt ? String(commission.paidAt).slice(0, 10) : '',
      paymentNotes: commission.paymentNotes || '',
      platformRate: String(commission.agentCommissionRate ?? commissionSettings.defaultAgentRate),
    });
  };

  const resetCommissionModal = () => {
    setSelectedCommission(null);
    setFormData({
      status: 'Pendiente',
      paymentDate: '',
      paymentNotes: '',
      platformRate: '',
    });
  };

  const openSettingsModal = () => {
    setSettingsForm({
      minimumRate: String(commissionSettings.minimumRate),
      maximumRate: String(commissionSettings.maximumRate),
      defaultRate: String(commissionSettings.defaultRate),
      defaultAgentRate: String(commissionSettings.defaultAgentRate),
    });
    setIsSettingsModalOpen(true);
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCommission) {
      return;
    }

    await updateCommissionStatus(selectedCommission.id, formData.status, {
      paymentDate: formData.paymentDate,
      paymentNotes: formData.paymentNotes,
      platformRate: formData.platformRate,
    });
    resetCommissionModal();
  };

  const handleSettingsSubmit = async (event) => {
    event.preventDefault();
    await saveCommissionSettings(settingsForm);
    closeSettingsModal();
  };

  const summary = useMemo(
    () => ({
      pending: filteredCommissions
        .filter((commission) => commission.status === 'Pendiente')
        .reduce((total, commission) => total + commission.amount, 0),
      paid: filteredCommissions
        .filter((commission) => commission.status === 'Pagada')
        .reduce((total, commission) => total + commission.amount, 0),
    }),
    [filteredCommissions]
  );

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando comisiones...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        title="Comisiones"
        text="Controla cuanto se debe pagar, que ya fue liquidado y el estado administrativo de cada comision."
      />
      {!isAdmin && loggedAgent && (
        <div className="permission-hint">
          Mostrando solo las comisiones del agente <strong>{loggedAgent.name}</strong>.
        </div>
      )}
      {!isAdmin && !loggedAgent && (
        <div className="feedback-banner warning">
          Tu usuario aun no esta vinculado a un agente. Por eso no se muestran comisiones.
        </div>
      )}
      <PermissionHint canCreate={canCreate} canDelete={false} />
      <div className="admin-stat-grid admin-stat-grid-compact">
        <div className="admin-stat-card">
          <span>Pendiente</span>
          <strong>{formatMoney(summary.pending)}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Pagada</span>
          <strong>{formatMoney(summary.paid)}</strong>
        </div>
      </div>
      <div className="admin-panel-toolbar">
        <div className="admin-inline-summary">
          <span>Comisiones registradas</span>
          <strong>{filteredCommissions.length}</strong>
        </div>
        {canCreate && (
          <button type="button" className="primary-button" onClick={openSettingsModal}>
            Parametrizar comisiones
          </button>
        )}
      </div>
      <div className="admin-inline-summary stack">
        <span>Rango de retencion pagina: {commissionSettings.minimumRate}% - {commissionSettings.maximumRate}%</span>
        <span>Comision agente por defecto: {commissionSettings.defaultRate}% | Pagina por defecto: {commissionSettings.defaultAgentRate}%</span>
      </div>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Propiedad</th>
              <th>Agente</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Pago</th>
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.map((commission) => (
                <tr key={commission.id}>
                <td data-label="Propiedad">
                  <strong>{commission.propertyTitle}</strong>
                  <div>{commission.clientName}</div>
                </td>
                <td data-label="Agente">{commission.agentName}</td>
                <td data-label="Monto">
                  <strong>{formatMoney(commission.amount)}</strong>
                  <div>{commission.commissionRate}% total</div>
                  <div>Agente neto: {formatMoney(commission.agentCommissionAmount)}</div>
                  <div>Retencion pagina: {formatMoney(commission.ownerCommissionAmount)}</div>
                </td>
                <td data-label="Estado">{commission.status}</td>
                <td data-label="Pago">
                  <div className="table-actions">
                    <button
                      type="button"
                      className="table-button ghost"
                      onClick={() => openCommissionModal(commission)}
                    >
                      Gestionar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={filteredCommissions.length}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.setCurrentPage}
          onItemsPerPageChange={pagination.setItemsPerPage}
        />
      </div>
      <CommissionModal
        isOpen={Boolean(selectedCommission)}
        commission={selectedCommission}
        formData={formData}
        setFormData={setFormData}
        onClose={resetCommissionModal}
        onSubmit={handleSubmit}
        canCreate={canCreate}
      />
      <CommissionSettingsModal
        isOpen={isSettingsModalOpen}
        formData={settingsForm}
        setFormData={setSettingsForm}
        onClose={closeSettingsModal}
        onSubmit={handleSettingsSubmit}
        canCreate={canCreate}
      />
    </div>
  );
};
