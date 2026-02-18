// src/utils/formatDate.js

/**
 * Formatea un timestamp de Firebase o un objeto Date a una cadena legible en español (Colombia).
 * Soporta tanto objetos con método toDate() como Date nativos y strings ISO.
 * @param {object|Date|string|number} timestamp
 * @returns {string} Fecha y hora formateada o cadena vacía si no es válida.
 */
export default function formatDate(timestamp) {
  let dateObj = null;

  if (!timestamp) return "";

  // Soporta timestamp de Firebase (con toDate)
  if (typeof timestamp === "object" && typeof timestamp.toDate === "function") {
    dateObj = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    dateObj = timestamp;
  } else if (typeof timestamp === "string" || typeof timestamp === "number") {
    // Intenta parsear string ISO o timestamp numérico
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) dateObj = parsed;
  }

  if (!dateObj) return "";

  return dateObj.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
