import React, { createContext, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../constants/api';
import { ADMIN_PERMISSION_KEYS, MANAGED_PERMISSION_NAMES } from '../../constants/permissions';

export const AuthContext = createContext();

const buildAdminPermissions = () =>
  ADMIN_PERMISSION_KEYS.flatMap((permission) =>
    MANAGED_PERMISSION_NAMES.map((permissionName) => ({
      NOMBRE_OBJETO: permission,
      NOMBRE_PERMISO: permissionName,
    }))
  );

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [cambiarPassword, setCambiarPassword] = useState(false);

  const login = async (correo, password) => {
    try {
      const response = await axios.post(`${API_BASE}/usuarios/login`, {
        CORREO: correo,
        PASSWORD: password,
      });

      const { user: loggedUser, cambiarPassword: requiresPasswordChange } = response.data;

      setUser(loggedUser);
      setIsLoggedIn(true);
      setCambiarPassword(requiresPasswordChange || false);

      if (loggedUser.ID_ROL === 1) {
        setPermissions(buildAdminPermissions());
        setIsAdmin(true);
      } else {
        const permisosResponse = await axios.get(`${API_BASE}/rolesPermisos/rol/${loggedUser.ID_ROL}`);
        const formattedPermissions = permisosResponse.data.map((permission) => ({
          NOMBRE_OBJETO: permission.NOMBRE_OBJETO,
          NOMBRE_PERMISO: permission.NOMBRE_PERMISO,
        }));
        setPermissions(formattedPermissions);
        setIsAdmin(false);
      }

      return { success: true, cambiarPassword: requiresPasswordChange };
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesion. Verifique las credenciales.');
      return { success: false, message: 'Credenciales invalidas o error al obtener permisos.' };
    }
  };

  const changePassword = async (codigo, nuevaPassword) => {
    try {
      await axios.patch(`${API_BASE}/usuarios/usuarios/${codigo}/cambiar-password`, {
        nuevaPassword,
      });

      setCambiarPassword(false);
      setError('');
      return {
        success: true,
        message: 'Contrasena actualizada con exito. Por favor, inicie sesion nuevamente.',
      };
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar la contrasena.');
      return { success: false, message: 'Error al cambiar la contrasena.' };
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setPermissions([]);
    setIsAdmin(false);
    setCambiarPassword(false);
    setError('');
  };

  const hasPermission = (objectName, permissionName = 'VER') => {
    if (isAdmin) {
      return true;
    }

    return permissions.some(
      (permission) =>
        permission.NOMBRE_OBJETO === objectName && permission.NOMBRE_PERMISO === permissionName
    );
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        permissions,
        isAdmin,
        login,
        logout,
        changePassword,
        hasPermission,
        error,
        cambiarPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
