/**
 * @fileoverview Sistema de logging centralizado
 * Proporciona logging consistente con niveles y formato unificado
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const getLogLevel = () => {
  const envLevel = import.meta.env.VITE_LOG_LEVEL;
  return LOG_LEVELS[envLevel] ?? LOG_LEVELS.info;
};

const currentLevel = getLogLevel();
const isProduction = import.meta.env.VITE_APP_ENV === 'production';

/**
 * Obtiene el prefijo visual para cada nivel de log
 */
function getPrefix(level) {
  const prefixes = {
    debug: '🔧 DEBUG',
    info: '📘 INFO',
    warn: '⚠️ WARN',
    error: '❌ ERROR',
  };
  return prefixes[level] || '📝 LOG';
}

/**
 * Formatea el timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Función principal de logging
 */
function log(level, message, data = {}) {
  if (LOG_LEVELS[level] < currentLevel) return;

  const timestamp = getTimestamp();
  const prefix = getPrefix(level);

  // En producción, solo mostrar warnings y errores
  if (isProduction && LOG_LEVELS[level] < LOG_LEVELS.warn) {
    return;
  }

  const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';

  if (Object.keys(data).length > 0) {
    console[consoleMethod](`${prefix} [${timestamp}] ${message}`, data);
  } else {
    console[consoleMethod](`${prefix} [${timestamp}] ${message}`);
  }

  // En producción con errores, podría enviarse a un servicio externo
  if (isProduction && level === 'error') {
    // TODO: Integrar con Sentry, LogRocket, etc.
    // sendToRemoteLogging({ level, message, data, timestamp });
  }
}

/**
 * Logger exportado con métodos para cada nivel
 */
export const logger = {
  debug: (message, data) => log('debug', message, data),
  info: (message, data) => log('info', message, data),
  warn: (message, data) => log('warn', message, data),
  error: (message, data) => log('error', message, data),

  // Método para logging de grupos (útil para debugging)
  group: (label, fn) => {
    if (currentLevel > LOG_LEVELS.debug) return;
    console.group(label);
    fn();
    console.groupEnd();
  },

  // Método para medir tiempo de ejecución
  time: (label) => {
    if (currentLevel > LOG_LEVELS.debug) return;
    console.time(label);
  },

  timeEnd: (label) => {
    if (currentLevel > LOG_LEVELS.debug) return;
    console.timeEnd(label);
  },
};

export default logger;
