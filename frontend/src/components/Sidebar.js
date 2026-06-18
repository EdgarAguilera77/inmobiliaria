import React, { useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRightFromSquare,
  faBars,
  faBuilding,
  faChevronDown,
  faChevronRight,
  faFolderTree,
  faSignOutAlt,
  faShieldHalved,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from './pages/AuthContext';
import { ADMIN_MENU_GROUPS, ADMIN_MENU_ITEMS } from '../constants/permissions';
import jmLogo from '../assets/JM.jpeg';

const Sidebar = ({
  handleLogout,
  toggleSidebar,
  isCollapsed,
  isMobileOpen,
  onMobileClose,
  showSidebar,
}) => {
  const { permissions, isAdmin, user } = useContext(AuthContext);
  const location = useLocation();
  const isCompact = isCollapsed && !isMobileOpen;

  const [openGroup, setOpenGroup] = useState('operacion');

  const filteredMenuItems = useMemo(
    () =>
      ADMIN_MENU_ITEMS.filter((item) => {
        if (isAdmin) {
          return true;
        }

        return permissions.some(
          (permission) =>
            permission.NOMBRE_OBJETO === item.permission && permission.NOMBRE_PERMISO === 'VER'
        );
      }),
    [isAdmin, permissions]
  );

  const dashboardItem = filteredMenuItems.find((item) => item.name === 'Dashboard');

  const menuGroups = useMemo(
    () =>
      ADMIN_MENU_GROUPS.map((group) => ({
        ...group,
        items: group.items
          .map((itemName) => filteredMenuItems.find((item) => item.name === itemName))
          .filter(Boolean),
      })).filter((group) => group.items.length > 0),
    [filteredMenuItems]
  );

  useEffect(() => {
    if (isCompact) {
      return;
    }

    const activeGroup = menuGroups.find((group) =>
      group.items.some((item) =>
        item.path === '/admin'
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path)
      )
    );

    if (activeGroup) {
      setOpenGroup(activeGroup.key);
    }
  }, [isCompact, location.pathname, menuGroups]);

  const getGroupIcon = (groupKey) => {
    if (groupKey === 'seguridad') {
      return faShieldHalved;
    }

    if (groupKey === 'catalogos') {
      return faFolderTree;
    }

    return menuGroups.find((group) => group.key === groupKey)?.items[0]?.icon || faBuilding;
  };

  if (!showSidebar) return null;

  return (
    <nav className={`sidebar ${isCompact ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo">
        <button
          type="button"
          className="sidebar-icon-button desktop-sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Colapsar menu lateral"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
        <button
          type="button"
          className="sidebar-icon-button mobile-sidebar-close"
          onClick={onMobileClose}
          aria-label="Cerrar menu lateral"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
        {!isCompact && (
          <>
            <img src={jmLogo} alt="Global" className="sidebar-brand-image" />
            <span className="sidebar-brand-copy">
              <strong>Global</strong>
              <small>Consultores inmobiliarios</small>
            </span>
          </>
        )}
      </div>
      <div className="sidebar-user">
        <div className="sidebar-user-icon">
          <FontAwesomeIcon icon={faBuilding} />
        </div>
        {!isCompact && (
          <div>
            <strong>{user?.NOMBRE || 'Panel administrativo'}</strong>
            <p>{isAdmin ? 'Administrador' : 'Usuario con permisos'}</p>
          </div>
        )}
      </div>
      <div className="sidebar-menu-scroll">
        <ul className="nav-group">
          {dashboardItem && (
            <li className="nav-item nav-item-standalone" key={dashboardItem.name}>
              <NavLink
                to={dashboardItem.path}
                className={({ isActive }) => (isActive ? 'active' : '')}
                end={dashboardItem.path === '/admin'}
                onClick={onMobileClose}
              >
                <FontAwesomeIcon icon={dashboardItem.icon} />
                {!isCompact && dashboardItem.name}
              </NavLink>
            </li>
          )}
          {menuGroups.map((group) => {
            const isGroupOpen = !isCompact && openGroup === group.key;
            const hasActiveRoute = group.items.some((item) => location.pathname.startsWith(item.path));

            return (
              <li
                className={`nav-accordion ${isGroupOpen ? 'open' : ''} ${
                  hasActiveRoute ? 'active-group' : ''
                }`}
                key={group.key}
              >
                <button
                  type="button"
                  className="nav-accordion-trigger"
                  onClick={() => {
                    if (isCompact) {
                      toggleSidebar();
                      return;
                    }

                    setOpenGroup((current) => (current === group.key ? '' : group.key));
                  }}
                >
                  <span className="nav-accordion-title">
                    <FontAwesomeIcon icon={getGroupIcon(group.key)} />
                    {!isCompact && group.name}
                  </span>
                  {!isCompact && (
                    <FontAwesomeIcon icon={isGroupOpen ? faChevronDown : faChevronRight} />
                  )}
                </button>
                {!isCompact && (
                  <div className={`nav-accordion-panel ${isGroupOpen ? 'expanded' : ''}`}>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                          `nav-subitem ${isActive ? 'active' : ''}`.trim()
                        }
                        end={item.path === '/admin'}
                        onClick={onMobileClose}
                      >
                        <FontAwesomeIcon icon={item.icon} />
                        <span>{item.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
          <li className="nav-item">
            <NavLink to="/" end onClick={onMobileClose}>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              {!isCompact && 'Ver sitio publico'}
            </NavLink>
          </li>
          <li
            className="nav-item logout"
            onClick={() => {
              onMobileClose?.();
              handleLogout();
            }}
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            {!isCompact && 'Cerrar sesion'}
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;
