import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { AuthContext } from './AuthContext';
import { API_BASE } from '../../constants/api';

const api = axios.create({
  baseURL: API_BASE,
});

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

const mapAcceptance = (acceptance) => ({
  ID_ACEPTACION: acceptance.ID_ACEPTACION,
  CODIGO_USUARIO: acceptance.CODIGO_USUARIO,
  NOMBRE: acceptance.NOMBRE,
  CORREO: acceptance.CORREO,
  VERSION_TERMINOS: acceptance.VERSION_TERMINOS,
  TITULO_TERMINOS: acceptance.TITULO_TERMINOS,
  TEXTO_ACEPTADO: acceptance.TEXTO_ACEPTADO,
  TIPO_ACEPTACION: acceptance.TIPO_ACEPTACION,
  FECHA_ACEPTACION: acceptance.FECHA_ACEPTACION,
});

const DEFAULT_COMMISSION_RATE = 5;

const printAcceptance = (acceptance) => {
  const printWindow = window.open('', '_blank', 'width=920,height=760');

  if (!printWindow) {
    return;
  }

  const paragraphs = (acceptance.TEXTO_ACEPTADO || '')
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>${acceptance.TITULO_TERMINOS}</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 40px;
            color: #1b2420;
          }
          h1 {
            margin-bottom: 10px;
            font-size: 28px;
          }
          .meta {
            margin-bottom: 24px;
            color: #4b5b54;
            line-height: 1.6;
          }
          .chips {
            margin-bottom: 24px;
          }
          .chip {
            display: inline-block;
            margin-right: 8px;
            margin-bottom: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            background: #eef2ea;
            font-size: 12px;
            font-weight: 700;
          }
          .content p {
            line-height: 1.7;
            margin: 0 0 14px;
          }
        </style>
      </head>
      <body>
        <h1>${acceptance.TITULO_TERMINOS}</h1>
        <div class="meta">
          <div><strong>Usuario:</strong> ${acceptance.NOMBRE}</div>
          <div><strong>Correo:</strong> ${acceptance.CORREO}</div>
          <div><strong>Codigo:</strong> ${acceptance.CODIGO_USUARIO}</div>
          <div><strong>Fecha de aceptacion:</strong> ${new Date(acceptance.FECHA_ACEPTACION).toLocaleString('es-HN')}</div>
        </div>
        <div class="chips">
          <span class="chip">Comision fija ${DEFAULT_COMMISSION_RATE}%</span>
        </div>
        <div class="content">${paragraphs}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const exportAcceptancePdf = (acceptance) => {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let currentY = margin;

  const ensureSpace = (required = 24) => {
    if (currentY + required > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }
  };

  const addWrappedText = (text, fontSize = 11, color = [27, 36, 32], lineHeight = 18) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);

    lines.forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, margin, currentY);
      currentY += lineHeight;
    });
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(32, 79, 70);
  doc.text(acceptance.TITULO_TERMINOS, margin, currentY);
  currentY += 30;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(75, 91, 84);
  [
    `Usuario: ${acceptance.NOMBRE}`,
    `Correo: ${acceptance.CORREO}`,
    `Codigo de usuario: ${acceptance.CODIGO_USUARIO}`,
    `Fecha de aceptacion: ${new Date(acceptance.FECHA_ACEPTACION).toLocaleString('es-HN')}`,
  ].forEach((line) => {
    ensureSpace(16);
    doc.text(line, margin, currentY);
    currentY += 16;
  });

  currentY += 10;

  const chips = [`Comision fija ${DEFAULT_COMMISSION_RATE}%`];

  chips.forEach((chip, index) => {
    const x = margin + index * 140;
    doc.setFillColor(240, 225, 199);
    doc.roundedRect(x, currentY - 11, 120, 24, 12, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(27, 36, 32);
    doc.text(chip, x + 10, currentY + 4);
  });

  currentY += 34;

  (acceptance.TEXTO_ACEPTADO || '')
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .forEach((paragraph) => {
      addWrappedText(paragraph, 11, [27, 36, 32], 17);
      currentY += 8;
    });

  const sanitizedName = `${acceptance.NOMBRE || 'usuario'}-${acceptance.VERSION_TERMINOS || 'v1'}`.replace(
    /[^a-z0-9-_]+/gi,
    '-'
  );
  doc.save(`aceptacion-${sanitizedName}.pdf`);
};

const AcceptanceDetailModal = ({ acceptance, onClose }) => {
  if (!acceptance) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal admin-modal-wide" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="section-chip">Aceptacion registrada</span>
            <h3>{acceptance.TITULO_TERMINOS}</h3>
            <p className="muted-copy">
              {acceptance.NOMBRE} - {acceptance.CORREO} - {new Date(acceptance.FECHA_ACEPTACION).toLocaleString('es-HN')}
            </p>
          </div>
          <div className="table-actions">
            <ActionButton onClick={() => printAcceptance(acceptance)}>Imprimir texto</ActionButton>
            <ActionButton onClick={() => exportAcceptancePdf(acceptance)}>Descargar PDF</ActionButton>
            <ActionButton onClick={onClose} tone="ghost">
              Cerrar
            </ActionButton>
          </div>
        </div>
        <div className="acceptance-detail-meta">
          <span>Codigo usuario: {acceptance.CODIGO_USUARIO}</span>
          <span>Comision fija: {DEFAULT_COMMISSION_RATE}%</span>
        </div>
        <div className="acceptance-detail-body">
          {(acceptance.TEXTO_ACEPTADO || '')
            .split('\n')
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
        </div>
      </div>
    </div>
  );
};

export const AdminLegalTermsPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const canCreate = hasPermission('Usuarios', 'CREAR');
  const canDelete = hasPermission('Usuarios', 'ELIMINAR');
  const [acceptances, setAcceptances] = useState([]);
  const [selectedAcceptance, setSelectedAcceptance] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAcceptances = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.get('/legal-terms/history');
      setAcceptances(response.data.map(mapAcceptance));
    } catch (requestError) {
      console.error('Error al cargar aceptaciones:', requestError);
      setError('No se pudo cargar el historial de aceptaciones.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAcceptances();
  }, []);

  const userOptions = useMemo(() => {
    const seen = new Map();

    acceptances.forEach((acceptance) => {
      if (!seen.has(acceptance.CODIGO_USUARIO)) {
        seen.set(acceptance.CODIGO_USUARIO, {
          codigo: acceptance.CODIGO_USUARIO,
          nombre: acceptance.NOMBRE,
          correo: acceptance.CORREO,
        });
      }
    });

    return Array.from(seen.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [acceptances]);

  const filteredAcceptances = useMemo(() => {
    const query = search.trim().toLowerCase();

    return acceptances.filter((acceptance) => {
      const matchesUser =
        !selectedUser || String(acceptance.CODIGO_USUARIO) === String(selectedUser);

      const matchesQuery =
        !query ||
        acceptance.NOMBRE?.toLowerCase().includes(query) ||
        acceptance.CORREO?.toLowerCase().includes(query) ||
        String(acceptance.CODIGO_USUARIO).includes(query);

      return matchesUser && matchesQuery;
    });
  }, [acceptances, search, selectedUser]);

  if (isLoading) {
    return <div className="admin-page"><h2>Cargando aceptaciones...</h2></div>;
  }

  return (
    <div className="admin-page">
      <SectionHeader
        eyebrow="Seguridad"
        title="Aceptaciones legales"
        text="Consulta el historial de terminos aceptados, filtra por usuario y conserva un respaldo imprimible del documento."
      />
      <PermissionHint canCreate={canCreate} canDelete={canDelete} />
      {error && <div className="feedback-banner error">{error}</div>}

      <div className="admin-panel">
        <div className="admin-panel-toolbar">
          <div>
            <h3>Historial de aceptacion de terminos</h3>
            <p className="muted-copy">
              Este historial se guarda en la tabla <strong>aceptaciones_terminos</strong> de MySQL.
            </p>
          </div>
          <div className="admin-history-toolbar">
            <select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}>
              <option value="">Todos los usuarios</option>
              {userOptions.map((option) => (
                <option key={option.codigo} value={option.codigo}>
                  {option.nombre} - {option.correo}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por usuario, correo o codigo"
            />
            <span className="history-counter">
              {filteredAcceptances.length} registro{filteredAcceptances.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Fecha</th>
              <th>Documento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredAcceptances.length > 0 ? (
              filteredAcceptances.map((acceptance) => (
                <tr key={acceptance.ID_ACEPTACION}>
                  <td data-label="Usuario">
                    <strong>{acceptance.NOMBRE}</strong>
                    <div>{acceptance.CORREO}</div>
                    <div>Codigo usuario: {acceptance.CODIGO_USUARIO}</div>
                  </td>
                  <td data-label="Fecha">{new Date(acceptance.FECHA_ACEPTACION).toLocaleString('es-HN')}</td>
                  <td data-label="Documento">{acceptance.TITULO_TERMINOS}</td>
                  <td data-label="Acciones">
                    <div className="table-actions">
                      <ActionButton onClick={() => setSelectedAcceptance(acceptance)} tone="ghost">
                        Ver texto
                      </ActionButton>
                      <ActionButton onClick={() => printAcceptance(acceptance)}>
                        Imprimir
                      </ActionButton>
                      <ActionButton onClick={() => exportAcceptancePdf(acceptance)}>
                        PDF
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>
                  <span className="muted-copy">No hay registros con ese filtro.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AcceptanceDetailModal
        acceptance={selectedAcceptance}
        onClose={() => setSelectedAcceptance(null)}
      />
    </div>
  );
};
