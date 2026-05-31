import React, { useContext, useMemo, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import CambiarPassword from './components/pages/CambiarPassword';
import { AuthProvider, AuthContext } from './components/pages/AuthContext';
import TermsAcceptancePage from './components/pages/TermsAcceptancePage';
import {
  AboutPage,
  ContactPage,
  HomePage,
  PropertyDetailPage,
  PropertyListPage,
  PropertyTypePage,
  PublicLayout,
  ServicesPage,
} from './components/pages/PublicSite';
import {
  AdminAgentsPage,
  AdminContactsPage,
  AdminDashboardPage,
  AdminImagesPage,
  AdminPropertiesPage,
  AdminTypesPage,
  AdminZonesPage,
} from './components/pages/AdminPortal';
import { AdminRolesPermissionsPage, AdminUsersPage } from './components/pages/AdminSecurity';
import { AdminCommissionsPage, AdminSalesPage } from './components/pages/AdminTransactions';
import {
  AdminPlansPage,
  AdminPublicationPaymentsPage,
  AdminSubscriptionsPage,
} from './components/pages/AdminSubscriptions';
import { AdminLegalTermsPage } from './components/pages/AdminLegalTermsPage';
import { RealEstateProvider } from './contexts/RealEstateContext';
import './App.css';

const PrivateRoute = ({ children, requiredPermission }) => {
  const { isLoggedIn, hasPermission, requiresTermsAcceptance } = useContext(AuthContext);

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  if (requiresTermsAcceptance) {
    return <Navigate to="/aceptacion-terminos" />;
  }

  if (!requiredPermission || hasPermission(requiredPermission, 'VER')) {
    return children;
  }
  return <Navigate to="/" />;
};

const AppContent = () => {
  const location = useLocation();
  const { isLoggedIn, logout, cambiarPassword, requiresTermsAcceptance } = useContext(AuthContext);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isAdminRoute = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname]);

  if (
    isLoggedIn &&
    cambiarPassword &&
    location.pathname !== '/cambiar-password' &&
    location.pathname !== '/login'
  ) {
    return <Navigate to="/cambiar-password" />;
  }

  if (
    isLoggedIn &&
    !cambiarPassword &&
    requiresTermsAcceptance &&
    location.pathname !== '/aceptacion-terminos' &&
    location.pathname !== '/login'
  ) {
    return <Navigate to="/aceptacion-terminos" />;
  }

  return (
    <div
      className={`app-shell ${
        isAdminRoute && isLoggedIn ? 'app-admin-shell' : 'app-public-shell'
      } ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
    >
      {isLoggedIn && isAdminRoute && (
        <Sidebar
          handleLogout={logout}
          toggleSidebar={() => setIsSidebarCollapsed((current) => !current)}
          isCollapsed={isSidebarCollapsed}
          showSidebar={true}
        />
      )}
      <main
        className={`main-content ${
          isAdminRoute && isLoggedIn ? 'admin-main-content' : 'public-main-content'
        }`}
      >
        <Routes>
          <Route
            path="/"
            element={
              <PublicLayout>
                <HomePage />
              </PublicLayout>
            }
          />
          <Route
            path="/propiedades"
            element={
              <PublicLayout>
                <PropertyListPage />
              </PublicLayout>
            }
          />
          <Route
            path="/propiedades/tipo/:slug"
            element={
              <PublicLayout>
                <PropertyTypePage />
              </PublicLayout>
            }
          />
          <Route
            path="/propiedades/:slug"
            element={
              <PublicLayout>
                <PropertyDetailPage />
              </PublicLayout>
            }
          />
          <Route
            path="/nosotros"
            element={
              <PublicLayout>
                <AboutPage />
              </PublicLayout>
            }
          />
          <Route
            path="/servicios"
            element={
              <PublicLayout>
                <ServicesPage />
              </PublicLayout>
            }
          />
          <Route
            path="/contacto"
            element={
              <PublicLayout>
                <ContactPage />
              </PublicLayout>
            }
          />
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                <Navigate
                  to={
                    cambiarPassword
                      ? '/cambiar-password'
                      : requiresTermsAcceptance
                        ? '/aceptacion-terminos'
                        : '/admin'
                  }
                />
              ) : (
                <Login />
              )
            }
          />
          <Route
            path="/cambiar-password"
            element={isLoggedIn ? <CambiarPassword /> : <Navigate to="/login" />}
          />
          <Route
            path="/aceptacion-terminos"
            element={isLoggedIn ? <TermsAcceptancePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute requiredPermission="Dashboard">
                <AdminDashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/propiedades"
            element={
              <PrivateRoute requiredPermission="Propiedades">
                <AdminPropertiesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/agentes"
            element={
              <PrivateRoute requiredPermission="Agentes">
                <AdminAgentsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/tipos"
            element={
              <PrivateRoute requiredPermission="TiposPropiedad">
                <AdminTypesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/zonas"
            element={
              <PrivateRoute requiredPermission="Zonas">
                <AdminZonesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/imagenes"
            element={
              <PrivateRoute requiredPermission="Imagenes">
                <AdminImagesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/contactos"
            element={
              <PrivateRoute requiredPermission="Contactos">
                <AdminContactsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <PrivateRoute requiredPermission="Usuarios">
                <AdminUsersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/aceptaciones-legales"
            element={
              <PrivateRoute requiredPermission="Usuarios">
                <AdminLegalTermsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/roles-permisos"
            element={
              <PrivateRoute requiredPermission="RolesPermisos">
                <AdminRolesPermissionsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/ventas"
            element={
              <PrivateRoute requiredPermission="Ventas">
                <AdminSalesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/comisiones"
            element={
              <PrivateRoute requiredPermission="Comisiones">
                <AdminCommissionsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/planes"
            element={
              <PrivateRoute requiredPermission="Planes">
                <AdminPlansPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/suscripciones"
            element={
              <PrivateRoute requiredPermission="Suscripciones">
                <AdminSubscriptionsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/pagos-publicacion"
            element={
              <PrivateRoute requiredPermission="PagosPublicacion">
                <AdminPublicationPaymentsPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to={isLoggedIn ? '/admin' : '/'} />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <RealEstateProvider>
        <Router>
          <AppContent />
        </Router>
      </RealEstateProvider>
    </AuthProvider>
  );
}

export default App;
