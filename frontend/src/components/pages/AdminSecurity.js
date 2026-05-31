import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { API_BASE } from '../../constants/api';
import {
  ADMIN_PERMISSION_KEYS,
  MANAGED_PERMISSION_NAMES,
  OBJECT_LABELS,
} from '../../constants/permissions';

const api = axios.create({
  baseURL: API_BASE,
});

const emptyUser = {
  NOMBRE: '',
  IDENTIFICACION: '',
  CORREO: '',
  TELEFONO: '',
  PASSWORD: '',
  ID_ROL: '',
  ID_SERVICIO: '',
  ESTADO: 1,
  REQUIERE_ACEPTACION_TERMINOS: 1,
};

const emptyRole = {
  NOMBRE_ROL: '',
  ESTADO: 1,
};

const SectionHeader = ({ eyebrow, title, text }) => (
  <div className="admin-header">
    <div>
      <span className="section-chip">{eyebrow}</span>
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

const ActionButton = ({ children, onClick, tone = 'default', disabled = false, type = 'button' }) => (
  <button
    type={type}
    className={`table-button${tone === 'ghost' ? ' ghost' : ''}${tone === 'danger' ? ' danger' : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const RoleEditModal = ({
  isOpen,
  mode,
  roleForm,
  setRoleForm,
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
            <span className="section-chip">{mode === 'edit' ? 'Editar rol' : 'Nuevo rol'}</span>
            <h3>{mode === 'edit' ? 'Ajustar configuracion del rol' : 'Crear rol administrativo'}</h3>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <form className="admin-form compact-admin-form" onSubmit={onSubmit}>
          <input
            value={roleForm.NOMBRE_ROL}
            onChange={(event) => setRoleForm({ ...roleForm, NOMBRE_ROL: event.target.value })}
            placeholder="Nombre del rol"
            required
            disabled={!canCreate}
          />
          <select
            value={roleForm.ESTADO}
            onChange={(event) => setRoleForm({ ...roleForm, ESTADO: Number(event.target.value) })}
            disabled={!canCreate}
          >
            <option value={1}>Activo</option>
            <option value={0}>Inactivo</option>
          </select>
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              {mode === 'edit' ? 'Guardar cambios' : 'Crear rol'}
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

const PermissionsModal = ({
  isOpen,
  onClose,
  roleName,
  activeObjects,
  permissionsCatalog,
  roleHasPermission,
  toggleRolePermission,
  selectedRoleId,
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
            <span className="section-chip">Permisos</span>
            <h3>Configurar matrices de prueba</h3>
            <p className="muted-copy">Rol seleccionado: <strong>{roleName || 'Ninguno'}</strong></p>
          </div>
          <button type="button" className="table-button ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="permission-modal-grid">
          {activeObjects.map((object) => (
            <article key={object.ID_OBJETO} className="permission-module-card">
              <div className="permission-module-head">
                <strong>{OBJECT_LABELS[object.NOMBRE_OBJETO] || object.NOMBRE_OBJETO}</strong>
                <span className="muted-copy">Modulo</span>
              </div>
              <div className="permission-toggle-list">
                {permissionsCatalog.map((permission) => (
                  <label
                    key={`${object.ID_OBJETO}-${permission.ID_PERMISO}`}
                    className={`permission-toggle ${
                      roleHasPermission(object.NOMBRE_OBJETO, permission.NOMBRE_PERMISO)
                        ? 'enabled'
                        : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={roleHasPermission(object.NOMBRE_OBJETO, permission.NOMBRE_PERMISO)}
                      onChange={() =>
                        toggleRolePermission(
                          selectedRoleId,
                          object.ID_OBJETO,
                          object.NOMBRE_OBJETO,
                          permission.ID_PERMISO,
                          permission.NOMBRE_PERMISO
                        )
                      }
                      disabled={!selectedRoleId || !canCreate}
                    />
                    <span>{permission.NOMBRE_PERMISO}</span>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

const mapUser = (user) => ({
  CODIGO: user.CODIGO,
  NOMBRE: user.NOMBRE,
  IDENTIFICACION: user.IDENTIFICACION,
  CORREO: user.CORREO,
  TELEFONO: user.TELEFONO,
  ID_ROL: user.ID_ROL,
  ID_SERVICIO: user.ID_SERVICIO,
  ESTADO: Number(user.ESTADO),
  REQUIERE_ACEPTACION_TERMINOS: Number(user.REQUIERE_ACEPTACION_TERMINOS || 0),
  NOMBRE_ROL: user.NOMBRE_ROL,
  NOMBRE_SERVICIO: user.NOMBRE_SERVICIO,
});

const mapRole = (role) => ({
  ID_ROL: role.ID_ROL,
  NOMBRE_ROL: role.NOMBRE_ROL,
  ESTADO: role.ESTADO === 'Activo' || Number(role.ESTADO) === 1 ? 1 : 0,
});

export const AdminUsersPage = () => {
  const { hasPermission, user } = useContext(AuthContext);
  const canCreate = hasPermission('Usuarios', 'CREAR');
  const canDelete = hasPermission('Usuarios', 'ELIMINAR');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState(emptyUser);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadSecurityData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [usersResponse, rolesResponse, servicesResponse] = await Promise.all([
        api.get('/usuarios'),
        api.get('/security/roles'),
        api.get('/usuarios/servicios'),
      ]);

      const availableRoles = rolesResponse.data.map(mapRole);
      const availableServices = servicesResponse.data;

      setUsers(usersResponse.data.map(mapUser));
      setRoles(availableRoles);
      setServices(availableServices);
      setFormData((current) => ({
        ...current,
        ID_ROL: current.ID_ROL || String(availableRoles[0]?.ID_ROL || ''),
        ID_SERVICIO: current.ID_SERVICIO || String(availableServices[0]?.ID_SERVICIO || ''),
      }));
    } catch (requestError) {
      console.error('Error al cargar seguridad:', requestError);
      setError('No se pudo cargar la gestion de usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const resetForm = () => {
    setFormData({
      ...emptyUser,
      ID_ROL: String(roles[0]?.ID_ROL || ''),
      ID_SERVICIO: String(services[0]?.ID_SERVICIO || ''),
    });
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }

    setError('');
    setFeedback('');

    const payload = {
      ...formData,
      ID_ROL: Number(formData.ID_ROL),
      ID_SERVICIO: Number(formData.ID_SERVICIO),
      ESTADO: Number(formData.ESTADO),
      REQUIERE_ACEPTACION_TERMINOS: Number(formData.REQUIERE_ACEPTACION_TERMINOS),
    };

    if (!editingId && !payload.PASSWORD) {
      setError('La contrasena es obligatoria para crear un usuario.');
      return;
    }

    if (editingId && !payload.PASSWORD) {
      delete payload.PASSWORD;
    }

    try {
      if (editingId) {
        await api.put(`/usuarios/${editingId}`, payload);
        setFeedback('Usuario actualizado correctamente.');
      } else {
        await api.post('/usuarios', payload);
        setFeedback('Usuario creado correctamente.');
      }

      await loadSecurityData();
      resetForm();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo guardar el usuario.');
    }
  };

  const editUser = (selectedUser) => {
    if (!canCreate) {
      return;
    }

    setEditingId(selectedUser.CODIGO);
    setFormData({
      NOMBRE: selectedUser.NOMBRE,
      IDENTIFICACION: selectedUser.IDENTIFICACION,
      CORREO: selectedUser.CORREO,
      TELEFONO: selectedUser.TELEFONO,
      PASSWORD: '',
      ID_ROL: String(selectedUser.ID_ROL),
      ID_SERVICIO: String(selectedUser.ID_SERVICIO),
      ESTADO: Number(selectedUser.ESTADO),
      REQUIERE_ACEPTACION_TERMINOS: Number(selectedUser.REQUIERE_ACEPTACION_TERMINOS || 0),
    });
  };

  const removeUser = async (codigo) => {
    if (!canDelete) {
      return;
    }

    setError('');
    setFeedback('');

    try {
      await api.delete(`/usuarios/${codigo}`);
      setFeedback('Usuario eliminado correctamente.');
      await loadSecurityData();
      if (editingId === codigo) {
        resetForm();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo eliminar el usuario.');
    }
  };

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando usuarios...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        eyebrow="Seguridad"
        title="Usuarios, roles y asignacion"
        text="Crea usuarios, asignales un rol y controla si pueden entrar al panel administrativo."
      />
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      {error && <div className="feedback-banner error">{error}</div>}
      {feedback && <div className="feedback-banner success">{feedback}</div>}
      <div className="admin-workspace">
        <form className="admin-form" onSubmit={handleSubmit}>
          <input
            value={formData.NOMBRE}
            onChange={(event) => setFormData({ ...formData, NOMBRE: event.target.value })}
            placeholder="Nombre completo"
            required
            disabled={!canCreate}
          />
          <input
            value={formData.IDENTIFICACION}
            onChange={(event) => setFormData({ ...formData, IDENTIFICACION: event.target.value })}
            placeholder="Identificacion"
            required
            disabled={!canCreate}
          />
          <input
            type="email"
            value={formData.CORREO}
            onChange={(event) => setFormData({ ...formData, CORREO: event.target.value })}
            placeholder="Correo"
            required
            disabled={!canCreate}
          />
          <input
            value={formData.TELEFONO}
            onChange={(event) => setFormData({ ...formData, TELEFONO: event.target.value })}
            placeholder="Telefono"
            required
            disabled={!canCreate}
          />
          <input
            type="password"
            value={formData.PASSWORD}
            onChange={(event) => setFormData({ ...formData, PASSWORD: event.target.value })}
            placeholder={editingId ? 'Nueva contrasena opcional' : 'Contrasena temporal'}
            disabled={!canCreate}
          />
          <div className="admin-form-row">
            <select
              value={formData.ID_ROL}
              onChange={(event) => setFormData({ ...formData, ID_ROL: event.target.value })}
              required
              disabled={!canCreate}
            >
              <option value="">Rol</option>
              {roles.map((role) => (
                <option key={role.ID_ROL} value={role.ID_ROL}>
                  {role.NOMBRE_ROL}
                </option>
              ))}
            </select>
            <select
              value={formData.ID_SERVICIO}
              onChange={(event) => setFormData({ ...formData, ID_SERVICIO: event.target.value })}
              required
              disabled={!canCreate}
            >
              <option value="">Servicio</option>
              {services.map((service) => (
                <option key={service.ID_SERVICIO} value={service.ID_SERVICIO}>
                  {service.NOMBRE_SERVICIO}
                </option>
              ))}
            </select>
          </div>
          <select
            value={formData.ESTADO}
            onChange={(event) => setFormData({ ...formData, ESTADO: Number(event.target.value) })}
            disabled={!canCreate}
          >
            <option value={1}>Activo</option>
            <option value={0}>Inactivo</option>
          </select>
          <label className="checkbox-row single-checkbox-row">
            <input
              type="checkbox"
              checked={Number(formData.REQUIERE_ACEPTACION_TERMINOS) === 1}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  REQUIERE_ACEPTACION_TERMINOS: event.target.checked ? 1 : 0,
                })
              }
              disabled={!canCreate}
            />
            <span>Solicitar aceptacion de terminos en el primer ingreso</span>
          </label>
          <div className="table-actions">
            <button type="submit" className="primary-button" disabled={!canCreate}>
              {editingId ? 'Actualizar usuario' : 'Crear usuario'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
              disabled={!canCreate}
            >
              Limpiar
            </button>
          </div>
        </form>

        <div className="admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Servicio</th>
                <th>Estado</th>
                <th>Primer ingreso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((listedUser) => (
                <tr key={listedUser.CODIGO}>
                  <td>
                    <strong>{listedUser.NOMBRE}</strong>
                    <div>{listedUser.CORREO}</div>
                    <div>{listedUser.TELEFONO}</div>
                  </td>
                  <td>{listedUser.NOMBRE_ROL}</td>
                  <td>{listedUser.NOMBRE_SERVICIO}</td>
                  <td>{Number(listedUser.ESTADO) === 1 ? 'Activo' : 'Inactivo'}</td>
                  <td>
                    {Number(listedUser.REQUIERE_ACEPTACION_TERMINOS) === 1
                      ? 'Pendiente de aceptar'
                      : 'Aceptado o no requerido'}
                  </td>
                  <td>
                    <div className="table-actions">
                      {canCreate && (
                        <ActionButton onClick={() => editUser(listedUser)} tone="ghost">
                          Editar
                        </ActionButton>
                      )}
                      {canDelete && listedUser.CODIGO !== user?.CODIGO && (
                        <ActionButton
                          onClick={() => removeUser(listedUser.CODIGO)}
                          tone="danger"
                        >
                          Eliminar
                        </ActionButton>
                      )}
                      {!canCreate && !canDelete && <span className="muted-copy">Solo lectura</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AdminRolesPermissionsPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const canCreate = hasPermission('RolesPermisos', 'CREAR');
  const canDelete = hasPermission('RolesPermisos', 'ELIMINAR');
  const [roles, setRoles] = useState([]);
  const [objects, setObjects] = useState([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [rolePermissions, setRolePermissions] = useState([]);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState('create');
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const activeObjects = useMemo(
    () =>
      objects.filter((object) => ADMIN_PERMISSION_KEYS.includes(object.NOMBRE_OBJETO)),
    [objects]
  );

  const loadCatalog = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [rolesResponse, objectsResponse, permissionsResponse] = await Promise.all([
        api.get('/security/roles'),
        api.get('/objetos'),
        api.get('/permisos'),
      ]);

      const normalizedRoles = rolesResponse.data.map(mapRole);
      setRoles(normalizedRoles);
      setObjects(objectsResponse.data);
      setPermissionsCatalog(
        permissionsResponse.data.filter((permission) =>
          MANAGED_PERMISSION_NAMES.includes(permission.NOMBRE_PERMISO)
        )
      );
      setSelectedRoleId((current) =>
        normalizedRoles.some((role) => String(role.ID_ROL) === String(current))
          ? current
          : String(normalizedRoles[0]?.ID_ROL || '')
      );
      setRoleForm((current) => ({
        ...current,
        ESTADO: Number(current.ESTADO),
      }));
    } catch (requestError) {
      console.error('Error al cargar roles y permisos:', requestError);
      setError('No se pudo cargar la configuracion de roles y permisos.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissionsForRole = async (roleId) => {
    if (!roleId) {
      setRolePermissions([]);
      return;
    }

    try {
      const response = await api.get(`/rolesPermisos/rol/${roleId}`);
      setRolePermissions(response.data);
    } catch (requestError) {
      console.error('Error al cargar permisos del rol:', requestError);
      setError('No se pudieron cargar los permisos del rol seleccionado.');
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    loadPermissionsForRole(selectedRoleId);
  }, [selectedRoleId]);

  const resetRoleForm = () => {
    setRoleForm(emptyRole);
    setEditingRoleId(null);
    setIsRoleModalOpen(false);
    setRoleModalMode('create');
  };

  const handleRoleSubmit = async (event) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }

    setError('');
    setFeedback('');

    try {
      if (editingRoleId) {
        await api.put(`/security/roles/${editingRoleId}`, {
          ...roleForm,
          ESTADO: Number(roleForm.ESTADO),
        });
        setFeedback('Rol actualizado correctamente.');
      } else {
        const response = await api.post('/security/roles', {
          ...roleForm,
          ESTADO: Number(roleForm.ESTADO),
        });
        setSelectedRoleId(String(response.data.rol.ID_ROL));
        setFeedback('Rol creado correctamente.');
      }

      await loadCatalog();
      resetRoleForm();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo guardar el rol.');
    }
  };

  const editRole = (role) => {
    if (!canCreate) {
      return;
    }

    setRoleModalMode('edit');
    setEditingRoleId(role.ID_ROL);
    setRoleForm({
      NOMBRE_ROL: role.NOMBRE_ROL,
      ESTADO: Number(role.ESTADO),
    });
    setIsRoleModalOpen(true);
  };

  const removeRole = async (roleId) => {
    if (!canDelete) {
      return;
    }

    setError('');
    setFeedback('');

    try {
      await api.delete(`/security/roles/${roleId}`);
      setFeedback('Rol eliminado correctamente.');
      setSelectedRoleId((current) => (String(roleId) === String(current) ? '' : current));
      await loadCatalog();
      if (roleId === editingRoleId) {
        resetRoleForm();
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          'No se pudo eliminar el rol. Revisa si tiene usuarios asociados.'
      );
    }
  };

  const roleHasPermission = (objectName, permissionName) =>
    rolePermissions.some(
      (permission) =>
        permission.NOMBRE_OBJETO === objectName && permission.NOMBRE_PERMISO === permissionName
    );

  const toggleRolePermission = async (roleId, objectId, objectName, permissionId, permissionName) => {
    if (!canCreate) {
      return;
    }

    setError('');
    setFeedback('');

    try {
      if (roleHasPermission(objectName, permissionName)) {
        await api.delete('/rolesPermisos/revocar', {
          data: {
            ID_ROL: Number(roleId),
            ID_OBJETO: objectId,
            ID_PERMISO: permissionId,
          },
        });
      } else {
        await api.post('/rolesPermisos/asignar', {
          ID_ROL: Number(roleId),
          ID_OBJETO: objectId,
          ID_PERMISO: permissionId,
        });
      }

      await loadPermissionsForRole(roleId);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo actualizar el permiso.');
    }
  };

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando roles y permisos...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        eyebrow="Seguridad"
        title="Roles y permisos por accion"
        text="Define que puede ver, crear o eliminar cada rol dentro del panel inmobiliario."
      />
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      {error && <div className="feedback-banner error">{error}</div>}
      {feedback && <div className="feedback-banner success">{feedback}</div>}

      <div className="admin-panel">
        <div className="admin-panel-toolbar">
          <div>
            <h3>Roles disponibles</h3>
            <p className="muted-copy">
              La configuracion se maneja desde modales para una edicion mas clara.
            </p>
          </div>
          <div className="table-actions">
            {canCreate && (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setRoleModalMode('create');
                  setEditingRoleId(null);
                  setRoleForm(emptyRole);
                  setIsRoleModalOpen(true);
                }}
              >
                Nuevo rol
              </button>
            )}
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsPermissionsModalOpen(true)}
              disabled={!selectedRoleId}
            >
              Abrir permisos
            </button>
          </div>
        </div>
        <table className="admin-table roles-clean-table">
          <thead>
            <tr>
              <th>Rol</th>
              <th>Estado</th>
              <th>Modulos de prueba</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const isSelected = String(role.ID_ROL) === String(selectedRoleId);
              const assignedModules = activeObjects.filter((object) =>
                rolePermissions.some(
                  (permission) =>
                    String(role.ID_ROL) === String(selectedRoleId) &&
                    permission.NOMBRE_OBJETO === object.NOMBRE_OBJETO &&
                    permission.NOMBRE_PERMISO === 'VER'
                )
              ).length;

              return (
                <tr
                  key={role.ID_ROL}
                  className={isSelected ? 'role-row-selected' : ''}
                  onClick={() => setSelectedRoleId(String(role.ID_ROL))}
                >
                  <td>
                    <strong>{role.NOMBRE_ROL}</strong>
                  </td>
                  <td>
                    <span className={`role-status ${role.ESTADO === 1 ? 'active' : 'inactive'}`}>
                      {role.ESTADO === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{isSelected ? `${assignedModules} modulos con acceso VER` : 'Selecciona el rol'}</td>
                  <td>
                    <div className="table-actions">
                      <ActionButton
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedRoleId(String(role.ID_ROL));
                          setIsPermissionsModalOpen(true);
                        }}
                      >
                        Permisos
                      </ActionButton>
                      {canCreate && (
                        <ActionButton
                          onClick={(event) => {
                            event.stopPropagation();
                            editRole(role);
                          }}
                          tone="ghost"
                        >
                          Editar
                        </ActionButton>
                      )}
                      {canDelete && role.ID_ROL !== 1 && (
                        <ActionButton
                          onClick={(event) => {
                            event.stopPropagation();
                            removeRole(role.ID_ROL);
                          }}
                          tone="danger"
                        >
                          Eliminar
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RoleEditModal
        isOpen={isRoleModalOpen}
        mode={roleModalMode}
        roleForm={roleForm}
        setRoleForm={setRoleForm}
        onClose={resetRoleForm}
        onSubmit={handleRoleSubmit}
        canCreate={canCreate}
      />
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        roleName={roles.find((role) => String(role.ID_ROL) === String(selectedRoleId))?.NOMBRE_ROL}
        activeObjects={activeObjects}
        permissionsCatalog={permissionsCatalog}
        roleHasPermission={roleHasPermission}
        toggleRolePermission={toggleRolePermission}
        selectedRoleId={selectedRoleId}
        canCreate={canCreate}
      />
    </div>
  );
};
