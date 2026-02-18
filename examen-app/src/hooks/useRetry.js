import { useState, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

/**
 * Hook para manejar reintentos automáticos en operaciones async
 *
 * @param {Function} asyncFn - Función asíncrona a ejecutar
 * @param {Object} options - Opciones de configuración
 * @returns {Object} - { execute, loading, error, retryCount, abort, reset }
 */
export function useRetry(asyncFn, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    onError,
    onRetry,
    onSuccess,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortRef = useRef(false);
  const isMountedRef = useRef(true);

  // Cleanup al desmontar
  useState(() => {
    return () => {
      isMountedRef.current = false;
    };
  });

  const execute = useCallback(async (...args) => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);
    abortRef.current = false;

    let lastError;
    let currentRetry = 0;

    while (currentRetry <= maxRetries && !abortRef.current) {
      try {
        const result = await asyncFn(...args);

        if (!isMountedRef.current) return;

        setLoading(false);
        setRetryCount(0);

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        lastError = err;
        currentRetry++;

        if (!isMountedRef.current) return;

        setRetryCount(currentRetry);

        logger.warn(`Intento ${currentRetry} fallido`, {
          error: err.message,
          maxRetries
        });

        if (onRetry && currentRetry <= maxRetries) {
          onRetry(currentRetry, err);
        }

        if (currentRetry <= maxRetries && !abortRef.current) {
          const delay = retryDelay * Math.pow(backoffMultiplier, currentRetry - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!isMountedRef.current) return;

    setLoading(false);
    setError(lastError);

    if (onError) {
      onError(lastError);
    }

    throw lastError;
  }, [asyncFn, maxRetries, retryDelay, backoffMultiplier, onError, onRetry, onSuccess]);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setLoading(false);
    abortRef.current = false;
  }, []);

  return {
    execute,
    loading,
    error,
    retryCount,
    isRetrying: retryCount > 0 && loading,
    abort,
    reset,
  };
}

/**
 * Hook simplificado para una sola ejecución con retry
 */
export function useAsyncWithRetry() {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null,
  });

  const execute = useCallback(async (asyncFn, options = {}) => {
    const { maxRetries = 3, retryDelay = 1000 } = options;

    setState(prev => ({ ...prev, loading: true, error: null }));

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncFn();
        setState({ loading: false, error: null, data: result });
        return result;
      } catch (err) {
        lastError = err;

        if (attempt < maxRetries) {
          await new Promise(resolve =>
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    setState({ loading: false, error: lastError, data: null });
    throw lastError;
  }, []);

  return { ...state, execute };
}

export default useRetry;
