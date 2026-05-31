import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const TermsAcceptancePage = () => {
  const navigate = useNavigate();
  const { acceptTerms, logout, termsDocument, user } = useContext(AuthContext);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const paragraphs = useMemo(
    () =>
      (termsDocument?.text || '')
        .split('\n')
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    [termsDocument]
  );

  const handleAccept = async () => {
    if (!hasAccepted) {
      setError('Debes confirmar la aceptacion para continuar.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const result = await acceptTerms();

    if (result.success) {
      navigate('/admin');
      return;
    }

    setError(result.message || 'No se pudo registrar la aceptacion de terminos.');
    setIsSubmitting(false);
  };

  return (
    <div className="terms-screen">
      <div className="terms-card">
        <span className="section-chip">Aceptacion obligatoria</span>
        <h1>{termsDocument?.title || 'Terminos y condiciones'}</h1>
        <p className="terms-lead">
          {user?.NOMBRE
            ? `${user.NOMBRE}, antes de ingresar al sistema debes aceptar estas condiciones comerciales y operativas.`
            : 'Antes de ingresar al sistema debes aceptar estas condiciones comerciales y operativas.'}
        </p>

        <div className="terms-meta">
          <span>La aceptacion queda guardada con fecha y hora en el historial del usuario.</span>
        </div>

        <div className="terms-body">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <label className="terms-checkbox">
          <input
            type="checkbox"
            checked={hasAccepted}
            onChange={(event) => setHasAccepted(event.target.checked)}
          />
          <span>
            Acepto las condiciones de uso, publicacion, suscripcion y la comision fija del 5%
            cuando se concrete una operacion bajo gestion de Global.
          </span>
        </label>

        {error && <div className="feedback-banner error">{error}</div>}

        <div className="terms-actions">
          <button type="button" className="primary-button" onClick={handleAccept} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando aceptacion...' : 'Aceptar y continuar'}
          </button>
          <button type="button" className="secondary-button" onClick={logout} disabled={isSubmitting}>
            Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAcceptancePage;
