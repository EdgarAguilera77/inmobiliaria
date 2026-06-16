import React from 'react';

const getVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
};

const AdminPagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  if (totalItems <= itemsPerPage && totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="admin-pagination">
      <div className="admin-pagination-info">
        <span>
          Mostrando {startItem}-{endItem} de {totalItems} registros
        </span>
        <select
          value={itemsPerPage}
          onChange={(event) => onItemsPerPageChange(Number(event.target.value))}
        >
          <option value={10}>10 por pagina</option>
          <option value={20}>20 por pagina</option>
          <option value={50}>50 por pagina</option>
        </select>
      </div>
      <div className="admin-pagination-controls">
        <button
          type="button"
          className="table-button ghost"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          Inicio
        </button>
        <button
          type="button"
          className="table-button ghost"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Anterior
        </button>
        {visiblePages.map((page) => (
          <button
            key={page}
            type="button"
            className={`table-button ${page === currentPage ? 'active-page' : 'ghost'}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          className="table-button ghost"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Siguiente
        </button>
        <button
          type="button"
          className="table-button ghost"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          Fin
        </button>
      </div>
    </div>
  );
};

export default AdminPagination;
