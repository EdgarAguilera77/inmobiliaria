import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../constants/api';
import {
  ADMIN_PERMISSION_KEYS,
  MANAGED_PERMISSION_NAMES,
  getFirstAccessibleAdminPath,
} from '../../constants/permissions';

export const AuthContext = createContext();

const AUTH_STORAGE_KEY = 'globaljm_auth_state';

const readStoredAuthState = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
};

const buildAdminPermissions = () =>
  ADMIN_PERMISSION_KEYS.flatMap((permission) =>
    MANAGED_PERMISSION_NAMES.map((permissionName) => ({
      NOMBRE_OBJETO: permission,
      NOMBRE_PERMISO: permissionName,
    }))
  );

export const AuthProvider = ({ children }) => {
  const storedAuthState = readStoredAuthState();
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(storedAuthState?.isLoggedIn));
  const [user, setUser] = useState(storedAuthState?.user || null);
  const [permissions, setPermissions] = useState(storedAuthState?.permissions || []);
  const [isAdmin, setIsAdmin] = useState(Boolean(storedAuthState?.isAdmin));
  const [error, setError] = useState('');
  const [cambiarPassword, setCambiarPassword] = useState(
    Boolean(storedAuthState?.cambiarPassword)
  );
  const [requiresTermsAcceptance, setRequiresTermsAcceptance] = useState(
    Boolean(storedAuthState?.requiresTermsAcceptance)
  );
  const [termsDocument, setTermsDocument] = useState(storedAuthState?.termsDocument || null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isLoggedIn || !user) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        isLoggedIn,
        user,
        permissions,
        isAdmin,
        cambiarPassword,
        requiresTermsAcceptance,
        termsDocument,
      })
    );
  }, [
    cambiarPassword,
    isAdmin,
    isLoggedIn,
    permissions,
    requiresTermsAcceptance,
    termsDocument,
    user,
  ]);

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
          'Debes aceptar las condiciones comerciales de publicacion, suscripcion y la retencion comercial que Global puede aplicar entre el 5% y el 15% sobre la comision generada por el agente antes de utilizar el sistema.',
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
      const normalizedRoleId = Number(loggedUser.ID_ROL);

      setUser(loggedUser);
      setIsLoggedIn(true);
      setCambiarPassword(requiresPasswordChange || false);
      await loadTermsStatus(
        loggedUser.CODIGO,
        Boolean(loggedUser.REQUIERE_ACEPTACION_TERMINOS)
      );

      if (normalizedRoleId === 1) {
        const adminPermissions = buildAdminPermissions();
        setPermissions(adminPermissions);
        setIsAdmin(true);
        return {
          success: true,
          cambiarPassword: requiresPasswordChange,
          redirectTo: getFirstAccessibleAdminPath(true, adminPermissions),
        };
      } else {
        const permisosResponse = await axios.get(`${API_BASE}/rolesPermisos/rol/${loggedUser.ID_ROL}`);
        const formattedPermissions = permisosResponse.data.map((permission) => ({
          NOMBRE_OBJETO: permission.NOMBRE_OBJETO,
          NOMBRE_PERMISO: permission.NOMBRE_PERMISO,
        }));
        setPermissions(formattedPermissions);
        setIsAdmin(false);
        return {
          success: true,
          cambiarPassword: requiresPasswordChange,
          redirectTo: getFirstAccessibleAdminPath(false, formattedPermissions),
        };
      }
    } catch (err) {
      const message =
        err.response?.data?.message || 'Error al iniciar sesion. Verifique las credenciales.';
      setError(message);
      return { success: false, message };
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
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error al cambiar la contrasena.';
      setError(message);
      return { success: false, message };
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
