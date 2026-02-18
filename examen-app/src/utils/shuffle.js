/**
 * @fileoverview Utilidades de shuffling (mezcla aleatoria)
 * Implementa el algoritmo Fisher-Yates para distribución uniforme
 */

/**
 * Implementación del algoritmo Fisher-Yates (Knuth) shuffle
 * Produce una permutación aleatoria uniforme
 *
 * @param {Array} array - Array a mezclar
 * @returns {Array} - Nuevo array mezclado (no muta el original)
 */
export function shuffleArray(array) {
  if (!array || array.length <= 1) return [...array];

  // Crear copia para no mutar el original
  const shuffled = [...array];

  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generar índice aleatorio entre 0 e i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));

    // Intercambiar elementos
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Mezcla array con seed para reproducibilidad (útil para testing)
 * Usa algoritmo mulberry32 PRNG
 *
 * @param {Array} array - Array a mezclar
 * @param {number} seed - Semilla para el generador
 * @returns {Array} - Nuevo array mezclado
 */
export function seededShuffle(array, seed) {
  if (!array || array.length <= 1) return [...array];

  // Mulberry32 PRNG
  const mulberry32 = (a) => {
    return () => {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  const random = mulberry32(seed);
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Mezcla opciones de una pregunta manteniendo referencia a respuesta correcta
 *
 * @param {Array} options - Array de opciones
 * @param {number|number[]} correctAnswer - Índice(s) de respuesta(s) correcta(s)
 * @returns {Object} - { shuffledOptions, newCorrectIndices, indexMap }
 */
export function shuffleOptionsWithAnswer(options, correctAnswer) {
  if (!options || options.length === 0) {
    return {
      shuffledOptions: options,
      newCorrectIndices: [],
      indexMap: []
    };
  }

  // Crear array con índices originales
  const indexed = options.map((opt, i) => ({ opt, originalIndex: i }));

  // Mezclar
  const shuffled = shuffleArray(indexed);

  // Normalizar correctAnswer a array
  const correctIndices = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

  // Encontrar nuevos índices de respuestas correctas
  const newCorrectIndices = correctIndices
    .map(originalIdx => shuffled.findIndex(item => item.originalIndex === originalIdx))
    .filter(idx => idx !== -1);

  return {
    shuffledOptions: shuffled.map(item => item.opt),
    newCorrectIndices,
    // Mapa de índices: indexMap[nuevoIndice] = indiceOriginal
    indexMap: shuffled.map(item => item.originalIndex)
  };
}

/**
 * Selecciona N elementos aleatorios de un array
 *
 * @param {Array} array - Array fuente
 * @param {number} n - Número de elementos a seleccionar
 * @returns {Array} - Array con N elementos aleatorios
 */
export function selectRandom(array, n) {
  if (!array || array.length === 0) return [];
  if (n >= array.length) return shuffleArray(array);

  const shuffled = shuffleArray(array);
  return shuffled.slice(0, n);
}

export default {
  shuffleArray,
  seededShuffle,
  shuffleOptionsWithAnswer,
  selectRandom
};
