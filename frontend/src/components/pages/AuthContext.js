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
  const [requiresTermsAcceptance, setRequiresTermsAcceptance] = useState(false);
  const [termsDocument, setTermsDocument] = useState(null);

  const loadTermsStatus = async (codigoUsuario, fallbackRequired = false) => {
    try {
      const response = await axios.get(`${API_BASE}/legal-terms/status/${codigoUsuario}`);
      setRequiresTermsAcceptance(Boolean(response.data.required));
      setTermsDocument(response.data.document || null);
      return response.data;
    } catch (requestError) {
      const documentFallback = {
        version: 'v1.0',
        title: 'Terminos y condiciones de primer ingreso',
        text:
          'Debes aceptar las condiciones comerciales de publicacion, suscripcion y la comision fija del 5% antes de utilizar el sistema.',
      };
      setRequiresTermsAcceptance(Boolean(fallbackRequired));
      setTermsDocument(documentFallback);
      return {
        required: fallbackRequired,
        accepted: !fallbackRequired,
        document: documentFallback,
      };
    }
  };

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
      await loadTermsStatus(
        loggedUser.CODIGO,
        Boolean(loggedUser.REQUIERE_ACEPTACION_TERMINOS)
      );

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
    setRequiresTermsAcceptance(false);
    setTermsDocument(null);
    setError('');
  };

  const acceptTerms = async () => {
    if (!user?.CODIGO) {
      return { success: false, message: 'No hay un usuario activo para registrar la aceptacion.' };
    }

    try {
      await axios.post(`${API_BASE}/legal-terms/accept`, {
        codigoUsuario: user.CODIGO,
        acceptedByName: user.NOMBRE,
      });
      setRequiresTermsAcceptance(false);
      await loadTermsStatus(user.CODIGO, false);
      return { success: true };
    } catch (requestError) {
      return {
        success: false,
        message:
          requestError.response?.data?.error ||
          'No se pudo registrar la aceptacion de terminos.',
      };
    }
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
        requiresTermsAcceptance,
        termsDocument,
        acceptTerms,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
