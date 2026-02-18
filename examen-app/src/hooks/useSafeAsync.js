import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * Hook para ejecutar operaciones async de forma segura
 * Previene actualizaciones de estado en componentes desmontados
 *
 * @returns {Object} - { isMounted, safeSetState, safeAsync }
 */
export function useSafeAsync() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Verifica si el componente está montado
   */
  const isMounted = useCallback(() => isMountedRef.current, []);

  /**
   * Wrapper para setState que solo actualiza si está montado
   */
  const safeSetState = useCallback((setState) => {
    return (value) => {
      if (isMountedRef.current) {
        setState(value);
      }
    };
  }, []);

  /**
   * Ejecuta una función async solo si el componente sigue montado
   */
  const safeAsync = useCallback(async (asyncFn) => {
    const result = await asyncFn();
    if (!isMountedRef.current) {
      throw new Error('Component unmounted');
    }
    return result;
  }, []);

  return {
    isMounted,
    safeSetState,
    safeAsync,
  };
}

/**
 * Hook para manejar AbortController en operaciones async
 * Cancela automáticamente las operaciones al desmontar
 *
 * @returns {Object} - { getSignal, abort, isAborted }
 */
export function useAbortController() {
  const abortControllerRef = useRef(null);

  /**
   * Obtiene un nuevo AbortController (cancela el anterior si existe)
   */
  const getAbortController = useCallback(() => {
    // Abortar controller previo si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Crear nuevo controller
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, []);

  /**
   * Obtiene solo el signal del controller actual
   */
  const getSignal = useCallback(() => {
    return getAbortController().signal;
  }, [getAbortController]);

  /**
   * Aborta el controller actual
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Verifica si está abortado
   */
  const isAborted = useCallback(() => {
    return abortControllerRef.current?.signal?.aborted ?? false;
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return {
    getAbortController,
    getSignal,
    abort,
    isAborted,
  };
}

/**
 * Hook combinado para operaciones async seguras con estado
 */
export function useAsyncState(initialValue = null) {
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { isMounted } = useSafeAsync();
  const { getSignal, abort } = useAbortController();

  const execute = useCallback(async (asyncFn) => {
    setLoading(true);
    setError(null);

    const signal = getSignal();

    try {
      const result = await asyncFn(signal);

      if (isMounted() && !signal.aborted) {
        setData(result);
        setLoading(false);
      }

      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        // Ignorar errores de abort
        return;
      }

      if (isMounted()) {
        setError(err);
        setLoading(false);
      }

      throw err;
    }
  }, [isMounted, getSignal]);

  const reset = useCallback(() => {
    abort();
    setData(initialValue);
    setLoading(false);
    setError(null);
  }, [abort, initialValue]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData,
    abort,
  };
}

export default useSafeAsync;
