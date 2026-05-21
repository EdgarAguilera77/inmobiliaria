import React, { useContext, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { API_BASE } from '../../constants/api';
import './CambiarPassword.css';

const PASSWORD_MIN_LENGTH = 4;

const validatePassword = (value) => {
  if (/\s/.test(value)) {
    return 'La contrasena no debe contener espacios.';
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return 'La contrasena debe tener al menos 4 caracteres.';
  }
  return '';
};

const calculatePasswordStrength = (password) => {
  if (!password) return '';
  if (password.length < PASSWORD_MIN_LENGTH) return 'weak';
  if (password.length < 8) return 'medium';
  return 'strong';
};

const CambiarPassword = () => {
  const { user, logout } = useContext(AuthContext);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const navigate = useNavigate();

  const handlePasswordChange = async () => {
    setError('');
    setSuccess('');

    const passwordError = validatePassword(nuevaPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!nuevaPassword || !confirmPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (nuevaPassword !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    try {
      await axios.patch(`${API_BASE}/usuarios/usuarios/${user.CODIGO}/cambiar-password`, {
        nuevaPassword,
      });

      setSuccess('Contrasena actualizada con exito. Por favor inicia sesion de nuevo.');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar la contrasena.');
    }
  };

  const handlePasswordInput = (value) => {
    setNuevaPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
  };

  return (
    <div className="cambiar-password-container">
      <h2>Cambio de Contrasena</h2>
      <p>Por seguridad, debes cambiar tu contrasena antes de continuar.</p>
      {error && <p className="error-mensage">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handlePasswordChange();
        }}
        className="cambiar-password-form"
      >
        <div className="form-group">
          <label htmlFor="nuevaPassword">Nueva contrasena</label>
          <input
            type="password"
            id="nuevaPassword"
            placeholder="Ingresa tu nueva contrasena"
            value={nuevaPassword}
            onChange={(event) => handlePasswordInput(event.target.value)}
          />
          <div className={`password-strength ${passwordStrength}`}>
            {passwordStrength === 'weak' && 'Muy corta'}
            {passwordStrength === 'medium' && 'Lista para usar'}
            {passwordStrength === 'strong' && 'Larga'}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar contrasena</label>
          <input
            type="password"
            id="confirmPassword"
            placeholder="Confirma tu nueva contrasena"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        <button type="submit" className="btn-submit">
          Cambiar contrasena
        </button>
      </form>
    </div>
  );
};

export default CambiarPassword;
