// src/utils/validators.js

/**
 * Verifica si es un email válido.
 * Permite letras, números, puntos, guiones y subrayados antes del @,
 * y dominios válidos después del @.
 * @param {string} email
 * @returns {boolean}
 */
export function isEmail(email) {
  if (typeof email !== "string") return false;
  // Expresión regular mejorada para emails comunes
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

/**
 * Verifica si la cadena no está vacía.
 * @param {string} str
 * @returns {boolean}
 */
export function isNotEmpty(str) {
  return typeof str === "string" && str.trim().length > 0;
}

/**
 * Verifica si la contraseña cumple con requisitos mínimos.
 * - Al menos 6 caracteres
 * - Puede agregar más reglas si el cliente lo solicita
 * @param {string} password
 * @returns {boolean}
 */
export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 6;
}
