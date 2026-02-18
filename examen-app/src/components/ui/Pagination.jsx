import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Componente de paginación accesible
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxVisiblePages = 5,
  className = '',
  size = 'md',
}) {
  if (totalPages <= 1) return null;

  // Calcular rango de páginas visibles
  const getVisiblePages = () => {
    const pages = [];
    let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    // Ajustar si estamos cerca del final
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  const buttonClass = (active = false, disabled = false) => `
    ${sizes[size] || sizes.md}
    rounded-lg font-medium
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-primaryBlue focus:ring-offset-1
    ${active
      ? 'bg-primaryBlue text-white shadow-md'
      : disabled
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
        : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-primaryBlue border border-gray-200 hover:border-primaryBlue/30'
    }
  `;

  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <nav
      className={`flex items-center justify-center gap-1 ${className}`}
      aria-label="Paginación"
    >
      {/* Primera página */}
      {showFirstLast && (
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={buttonClass(false, currentPage === 1)}
          title="Primera página"
          aria-label="Ir a primera página"
        >
          <ChevronsLeft className={iconSize} />
        </button>
      )}

      {/* Anterior */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={buttonClass(false, currentPage === 1)}
        title="Página anterior"
        aria-label="Ir a página anterior"
      >
        <ChevronLeft className={iconSize} />
      </button>

      {/* Elipsis inicial */}
      {visiblePages[0] > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className={buttonClass(false)}
            aria-label="Ir a página 1"
          >
            1
          </button>
          {visiblePages[0] > 2 && (
            <span className="px-2 text-gray-400" aria-hidden="true">...</span>
          )}
        </>
      )}

      {/* Páginas visibles */}
      {visiblePages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={buttonClass(page === currentPage)}
          aria-label={`Ir a página ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      {/* Elipsis final */}
      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span className="px-2 text-gray-400" aria-hidden="true">...</span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            className={buttonClass(false)}
            aria-label={`Ir a página ${totalPages}`}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Siguiente */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={buttonClass(false, currentPage === totalPages)}
        title="Página siguiente"
        aria-label="Ir a página siguiente"
      >
        <ChevronRight className={iconSize} />
      </button>

      {/* Última página */}
      {showFirstLast && (
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={buttonClass(false, currentPage === totalPages)}
          title="Última página"
          aria-label="Ir a última página"
        >
          <ChevronsRight className={iconSize} />
        </button>
      )}
    </nav>
  );
}

/**
 * Información de paginación
 */
export function PaginationInfo({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  className = '',
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <p className={`text-sm text-gray-500 ${className}`}>
      Mostrando <span className="font-medium text-gray-700">{startItem}</span> a{' '}
      <span className="font-medium text-gray-700">{endItem}</span> de{' '}
      <span className="font-medium text-gray-700">{totalItems}</span> resultados
    </p>
  );
}
