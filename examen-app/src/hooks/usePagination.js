import { useState, useMemo, useCallback } from 'react';

/**
 * Hook para manejar paginación de datos
 *
 * @param {Array} items - Array de elementos a paginar
 * @param {Object} options - Opciones de configuración
 * @returns {Object} - Estado y funciones de paginación
 */
export function usePagination(items = [], options = {}) {
  const {
    itemsPerPage = 10,
    initialPage = 1
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);

  // Calcular total de páginas
  const totalPages = useMemo(() =>
    Math.ceil(items.length / itemsPerPage) || 1,
    [items.length, itemsPerPage]
  );

  // Obtener elementos de la página actual
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return items.slice(start, end);
  }, [items, currentPage, itemsPerPage]);

  // Ir a una página específica
  const goToPage = useCallback((page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  // Página siguiente
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  // Página anterior
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  // Primera página
  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Última página
  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  // Resetear a página inicial
  const reset = useCallback(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  // Índices de inicio y fin
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, items.length);

  return {
    // Items paginados
    items: paginatedItems,

    // Estado de paginación
    currentPage,
    totalPages,
    totalItems: items.length,
    itemsPerPage,

    // Índices para mostrar "1-10 de 100"
    startIndex: items.length > 0 ? startIndex : 0,
    endIndex,

    // Estados booleanos
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,

    // Funciones de navegación
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    reset,

    // Función setter directo (para casos especiales)
    setPage: setCurrentPage,
  };
}

/**
 * Hook para paginación con estado de URL (query params)
 */
export function usePaginationWithUrl(items = [], options = {}) {
  const {
    itemsPerPage = 10,
    paramName = 'page'
  } = options;

  // Obtener página inicial de URL
  const getPageFromUrl = () => {
    if (typeof window === 'undefined') return 1;
    const params = new URLSearchParams(window.location.search);
    const page = parseInt(params.get(paramName) || '1', 10);
    return isNaN(page) || page < 1 ? 1 : page;
  };

  const pagination = usePagination(items, {
    itemsPerPage,
    initialPage: getPageFromUrl()
  });

  // Sincronizar con URL
  const goToPageWithUrl = useCallback((page) => {
    pagination.goToPage(page);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (page === 1) {
        url.searchParams.delete(paramName);
      } else {
        url.searchParams.set(paramName, page.toString());
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [pagination, paramName]);

  return {
    ...pagination,
    goToPage: goToPageWithUrl,
  };
}

export default usePagination;
