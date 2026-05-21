import React, { useContext, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import { useRealEstate } from '../../contexts/RealEstateContext';

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
            <span>Comision estimada</span>
            <strong>
              {formatMoney(
                (Number(formData.closingPrice || 0) * Number(formData.commissionRate || 0)) / 100
              )}
            </strong>
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
          <strong>{formatMoney(commission.amount)}</strong>
        </div>
        <form className="compact-admin-form" onSubmit={onSubmit}>
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
  commissionRate: '',
  closingDate: new Date().toISOString().slice(0, 10),
  saleStatus: 'Cerrada',
  observations: '',
};

export const AdminSalesPage = () => {
  const { hasPermission, user } = useContext(AuthContext);
  const { sales, agents, updateSale, deleteSale, isLoading } = useRealEstate();
  const canCreate = hasPermission('Ventas', 'CREAR');
  const canDelete = hasPermission('Ventas', 'ELIMINAR');
  const [editingSale, setEditingSale] = useState(null);
  const [formData, setFormData] = useState(defaultSaleForm);

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
      commissionRate: String(sale.commissionRate),
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
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
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
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>
                  <strong>{sale.propertyTitle}</strong>
                  <div>{sale.businessType}</div>
                </td>
                <td>
                  <strong>{sale.clientName}</strong>
                  <div>{sale.clientPhone}</div>
                </td>
                <td>{sale.agentName}</td>
                <td>
                  <strong>{formatMoney(sale.closingPrice)}</strong>
                  <div>{String(sale.closingDate).slice(0, 10)}</div>
                </td>
                <td>
                  <strong>{formatMoney(sale.commissionAmount)}</strong>
                  <div>{sale.commissionRate}%</div>
                </td>
                <td>{sale.saleStatus}</td>
                <td>
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
      </div>
      <SaleModal
        isOpen={Boolean(editingSale)}
        title="Editar venta cerrada"
        formData={formData}
        setFormData={setFormData}
        agents={agents}
        onClose={resetModal}
        onSubmit={handleSubmit}
        canCreate={canCreate}
      />
    </div>
  );
};

export const AdminCommissionsPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const { commissions, updateCommissionStatus, isLoading } = useRealEstate();
  const canCreate = hasPermission('Comisiones', 'CREAR');
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [formData, setFormData] = useState({
    status: 'Pendiente',
    paymentDate: '',
    paymentNotes: '',
  });

  const openCommissionModal = (commission) => {
    setSelectedCommission(commission);
    setFormData({
      status: commission.status,
      paymentDate: commission.paidAt ? String(commission.paidAt).slice(0, 10) : '',
      paymentNotes: commission.paymentNotes || '',
    });
  };

  const resetCommissionModal = () => {
    setSelectedCommission(null);
    setFormData({
      status: 'Pendiente',
      paymentDate: '',
      paymentNotes: '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCommission) {
      return;
    }

    await updateCommissionStatus(selectedCommission.id, formData.status, {
      paymentDate: formData.paymentDate,
      paymentNotes: formData.paymentNotes,
    });
    resetCommissionModal();
  };

  const summary = useMemo(
    () => ({
      pending: commissions
        .filter((commission) => commission.status === 'Pendiente')
        .reduce((total, commission) => total + commission.amount, 0),
      paid: commissions
        .filter((commission) => commission.status === 'Pagada')
        .reduce((total, commission) => total + commission.amount, 0),
    }),
    [commissions]
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
            {commissions.map((commission) => (
              <tr key={commission.id}>
                <td>
                  <strong>{commission.propertyTitle}</strong>
                  <div>{commission.clientName}</div>
                </td>
                <td>{commission.agentName}</td>
                <td>
                  <strong>{formatMoney(commission.amount)}</strong>
                  <div>{commission.commissionRate}%</div>
                </td>
                <td>{commission.status}</td>
                <td>
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
    </div>
  );
};
