import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logoSIAC from "../assets/JM.jpeg";
import { AuthContext } from "./pages/AuthContext";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const Login = () => {
  const { login } = useContext(AuthContext);
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [errorCorreo, setErrorCorreo] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleCorreoChange = (event) => {
    const input = event.target.value.trim();
    let cleanedInput = input.replace(/\s/g, "");

    const atCount = (cleanedInput.match(/@/g) || []).length;
    if (atCount > 1) {
      const firstAtIndex = cleanedInput.indexOf("@");
      cleanedInput =
        cleanedInput.slice(0, firstAtIndex + 1) +
        cleanedInput.slice(firstAtIndex + 1).replace(/@/g, "");
    }

    cleanedInput = cleanedInput.toLowerCase();

    const atIndex = cleanedInput.indexOf("@");
    if (atIndex !== -1) {
      const domainPart = cleanedInput.slice(atIndex + 1);
      const dotCount = (domainPart.match(/\./g) || []).length;
      if (dotCount > 1) {
        cleanedInput =
          cleanedInput.slice(0, atIndex + 1) +
          domainPart.split(".").slice(0, 2).join(".");
      }
    }

    setCorreo(cleanedInput);

    const correoRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
    const specialCharRegex = /[#$"/&]/;

    if (!correoRegex.test(cleanedInput)) {
      setErrorCorreo("El correo electronico no tiene un formato valido.");
    } else if (atIndex !== -1 && specialCharRegex.test(cleanedInput.slice(atIndex + 1))) {
      setErrorCorreo("El dominio no puede contener caracteres especiales.");
    } else {
      setErrorCorreo("");
    }
  };

  const validatePassword = (value) => {
    if (/\s/.test(value)) {
      return "";
    }
    if (value.length < PASSWORD_MIN_LENGTH) {
      return "";
    }
    if (!PASSWORD_REGEX.test(value)) {
      return "";
    }
    return "";
  };

  const handlePasswordChange = (event) => {
    const value = event.target.value;
    setPassword(value);
    setPasswordError(validatePassword(value));
  };

  const handleKeyDown = (event) => {
    if (event.key === " ") {
      event.preventDefault();
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    if (!correo || !password) {
      setLocalError("Por favor, ingrese correo y contrasena.");
      return;
    }
    if (errorCorreo || passwordError) {
      setLocalError("Corrija los errores antes de continuar.");
      return;
    }

    try {
      const result = await login(correo, password);
      if (result.success) {
        navigate("/admin");
      } else {
        setLocalError(result.message || "Error al iniciar sesion");
      }
    } catch (error) {
      setLocalError("Ocurrio un error. Intentelo de nuevo mas tarde.");
    }
  };

  return (
    <div className="login-container">
      <img src={logoSIAC} alt="Global" className="login-logo" />
      <div className="login-brand-copy">
        <strong>Global</strong>
        <span>Consultores inmobiliarios y servicios integrales</span>
        <small>Tu aliado integral en propiedad, leyes y tecnologia</small>
      </div>
      <form onSubmit={handleLoginSubmit} className="login-form">
        <input
          type="email"
          value={correo}
          onChange={handleCorreoChange}
          placeholder="Correo electronico"
          className="login-input"
          required
        />
        {errorCorreo && <p className="error-message">{errorCorreo}</p>}

        <div className="input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={handlePasswordChange}
            onKeyDown={handleKeyDown}
            placeholder="Contrasena"
            className="login-input"
            required
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              className="eye-icon"
            >
              {showPassword ? (
                <path d="M13.875 10.125L12 12m0 0L10.125 13.875M12 12L10.125 10.125m1.875 1.875L13.875 13.875M12 12L13.875 10.125M12 12L10.125 10.125" />
              ) : (
                <path d="M1 12c2.073 4 5.673 7 11 7s8.927-3 11-7c-2.073-4-5.673-7-11-7S3.073 8 1 12Zm11 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              )}
            </svg>
          </button>
        </div>
        {passwordError && <p className="error-message">{passwordError}</p>}

        <button type="submit" className="login-button">
          Iniciar sesion
        </button>
      </form>
      {localError && <p className="error-message">{localError}</p>}
    </div>
  );
};

export default Login;
