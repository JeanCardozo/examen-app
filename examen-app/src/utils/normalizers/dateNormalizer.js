/**
 * @fileoverview Normalizadores de fechas para Firebase Timestamps
 * Maneja la conversión entre diferentes formatos de fecha
 */

/**
 * Normaliza una fecha de Firestore a objeto Date
 * @param {*} timestamp - Timestamp de Firestore, Date, o string
 * @returns {Date|null}
 */
export function normalizeFirestoreDate(timestamp) {
  if (!timestamp) return null;

  // Si ya es Date
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? null : timestamp;
  }

  // Si es Firestore Timestamp (tiene método toDate)
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // Si es objeto con seconds (Firestore Timestamp serializado)
  if (timestamp && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }

  // Si es string ISO
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  // Si es número (Unix timestamp en milisegundos)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  return null;
}

/**
 * Formatea una fecha para mostrar
 * @param {*} date - Fecha a formatear
 * @param {Object} options - Opciones de formato
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  const {
    includeTime = false,
    includeSeconds = false,
    relative = false,
    locale = 'es-ES'
  } = options;

  const normalizedDate = normalizeFirestoreDate(date);
  if (!normalizedDate) return 'Fecha no disponible';

  if (relative) {
    return formatRelativeTime(normalizedDate);
  }

  const dateOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  if (includeTime) {
    dateOptions.hour = '2-digit';
    dateOptions.minute = '2-digit';
    if (includeSeconds) {
      dateOptions.second = '2-digit';
    }
  }

  return normalizedDate.toLocaleDateString(locale, dateOptions);
}

/**
 * Formatea tiempo relativo (hace X minutos, etc.)
 * @param {Date} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  const normalizedDate = normalizeFirestoreDate(date);
  if (!normalizedDate) return 'Fecha no disponible';

  const now = new Date();
  const diffMs = now - normalizedDate;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  if (diffWeeks < 4) return `Hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
  if (diffMonths < 12) return `Hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;

  return formatDate(normalizedDate);
}

/**
 * Formatea duración en formato legible
 * @param {number} seconds - Duración en segundos
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(' ');
}

/**
 * Formatea duración en formato largo
 * @param {number} seconds - Duración en segundos
 * @returns {string}
 */
export function formatDurationLong(seconds) {
  if (!seconds || seconds < 0) return '0 segundos';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  }
  if (secs > 0 && hours === 0) {
    parts.push(`${secs} ${secs === 1 ? 'segundo' : 'segundos'}`);
  }

  return parts.join(' y ') || '0 segundos';
}

/**
 * Formatea duración en formato mm:ss o hh:mm:ss
 * @param {number} seconds - Duración en segundos
 * @returns {string}
 */
export function formatDurationClock(seconds) {
  if (!seconds || seconds < 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
}

/**
 * Verifica si una fecha ha pasado (deadline)
 * @param {*} deadline
 * @returns {boolean}
 */
export function isDeadlinePassed(deadline) {
  const normalizedDeadline = normalizeFirestoreDate(deadline);
  if (!normalizedDeadline) return false;
  return new Date() > normalizedDeadline;
}

/**
 * Obtiene tiempo restante hasta una fecha
 * @param {*} targetDate
 * @returns {Object} { days, hours, minutes, seconds, totalSeconds, isPast }
 */
export function getTimeRemaining(targetDate) {
  const target = normalizeFirestoreDate(targetDate);
  if (!target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isPast: true };
  }

  const now = new Date();
  const diffMs = target - now;
  const isPast = diffMs < 0;
  const totalSeconds = Math.abs(Math.floor(diffMs / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds, isPast };
}

export default {
  normalizeFirestoreDate,
  formatDate,
  formatRelativeTime,
  formatDuration,
  formatDurationLong,
  formatDurationClock,
  isDeadlinePassed,
  getTimeRemaining,
};
