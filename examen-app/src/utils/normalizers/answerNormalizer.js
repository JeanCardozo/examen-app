/**
 * @fileoverview Normalizadores de respuestas centralizados
 * Consolida toda la lógica de normalización que antes estaba dispersa
 */

/**
 * Normaliza respuestas correctas según el tipo de pregunta
 * @param {string} type - Tipo de pregunta
 * @param {*} correctAnswers - Respuestas correctas sin normalizar
 * @param {Array} options - Opciones de la pregunta
 * @returns {*} Respuestas normalizadas
 */
export function normalizeCorrectAnswers(type, correctAnswers, options = []) {
  if (correctAnswers === undefined || correctAnswers === null) {
    return type === 'true-false' ? 'Verdadero' : [];
  }

  switch (type) {
    case 'true-false':
      return normalizeTrueFalse(correctAnswers);

    case 'multiple-choice':
    case 'icfes':
    case 'image':
    case 'video':
    case 'math':
      return normalizeMultipleChoice(correctAnswers, options);

    default:
      return Array.isArray(correctAnswers) ? correctAnswers : [correctAnswers];
  }
}

/**
 * Normaliza respuesta verdadero/falso
 * @param {*} answer
 * @returns {string} 'Verdadero' | 'Falso'
 */
export function normalizeTrueFalse(answer) {
  const value = Array.isArray(answer) ? answer[0] : answer;

  // Manejar diferentes formatos de entrada
  if (value === true || value === 'true' || value === 'Verdadero' || value === 0 || value === '0') {
    return 'Verdadero';
  }
  return 'Falso';
}

/**
 * Normaliza respuestas de opción múltiple a índices
 * @param {*} answers - Respuestas (pueden ser índices, letras, o textos)
 * @param {Array} options - Opciones de la pregunta
 * @returns {Array<number>} Índices de opciones correctas
 */
export function normalizeMultipleChoice(answers, options = []) {
  let normalized = Array.isArray(answers) ? answers : [answers];

  return normalized.map((answer) => {
    // Si ya es índice numérico válido
    if (typeof answer === 'number' && answer >= 0 && answer < options.length) {
      return answer;
    }

    // Si es string numérico
    if (typeof answer === 'string' && /^\d+$/.test(answer)) {
      const idx = parseInt(answer, 10);
      if (idx >= 0 && idx < options.length) {
        return idx;
      }
    }

    // Si es letra (A, B, C, D...)
    if (typeof answer === 'string' && answer.length === 1 && /[A-Za-z]/.test(answer)) {
      const idx = answer.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) {
        return idx;
      }
    }

    // Si es texto, buscar por coincidencia
    if (typeof answer === 'string' && options.length > 0) {
      const idx = options.findIndex(opt => {
        const optText = typeof opt === 'string' ? opt : opt?.text || opt?.label || '';
        return optText.toLowerCase() === answer.toLowerCase();
      });
      if (idx !== -1) {
        return idx;
      }
    }

    // Retornar como está si no se puede normalizar
    return answer;
  }).filter(idx => typeof idx === 'number' && idx >= 0);
}

/**
 * Formatea respuesta para mostrar al usuario
 * @param {*} answer - Respuesta
 * @param {string} type - Tipo de pregunta
 * @param {Array} options - Opciones disponibles
 * @returns {string}
 */
export function formatAnswerForDisplay(answer, type, options = []) {
  if (answer === undefined || answer === null || answer === '') {
    return 'Sin respuesta';
  }

  if (type === 'true-false') {
    return normalizeTrueFalse(answer);
  }

  if (Array.isArray(answer)) {
    if (answer.length === 0) return 'Sin respuesta';

    // Convertir índices a letras o textos
    const formatted = answer.map(a => {
      if (typeof a === 'number' && options[a]) {
        const optText = typeof options[a] === 'string' ? options[a] : options[a]?.text;
        return optText || String.fromCharCode(65 + a);
      }
      return a;
    });

    return formatted.join(', ');
  }

  // Si es índice, convertir a letra
  if (typeof answer === 'number' && options[answer]) {
    const optText = typeof options[answer] === 'string' ? options[answer] : options[answer]?.text;
    return optText || String.fromCharCode(65 + answer);
  }

  return String(answer);
}

/**
 * Valida si una respuesta es correcta
 * @param {*} userAnswer - Respuesta del usuario
 * @param {*} correctAnswers - Respuestas correctas
 * @param {string} type - Tipo de pregunta
 * @param {Array} options - Opciones de la pregunta
 * @returns {boolean}
 */
export function validateAnswer(userAnswer, correctAnswers, type, options = []) {
  if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
    return false;
  }

  // Normalizar ambas respuestas
  const normalizedCorrect = normalizeCorrectAnswers(type, correctAnswers, options);

  switch (type) {
    case 'true-false': {
      const normalizedUser = normalizeTrueFalse(userAnswer);
      return normalizedUser === normalizedCorrect;
    }

    case 'icfes': {
      // Para ICFES, todas las respuestas deben coincidir exactamente
      const userAnswers = normalizeMultipleChoice(
        Array.isArray(userAnswer) ? userAnswer : [userAnswer],
        options
      );

      if (userAnswers.length !== normalizedCorrect.length) return false;

      const sortedUser = [...userAnswers].sort();
      const sortedCorrect = [...normalizedCorrect].sort();

      return sortedUser.every((a, i) => a === sortedCorrect[i]);
    }

    case 'multiple-choice':
    case 'image':
    case 'video':
    case 'math':
    default: {
      // Para opción única, normalizar y comparar
      const normalizedUser = normalizeMultipleChoice(
        Array.isArray(userAnswer) ? userAnswer : [userAnswer],
        options
      );

      if (normalizedUser.length === 0) return false;

      // Verificar si alguna respuesta del usuario está en las correctas
      return normalizedUser.some(u => normalizedCorrect.includes(u));
    }
  }
}

/**
 * Obtiene el texto de las opciones correctas
 * @param {*} correctAnswers - Respuestas correctas
 * @param {string} type - Tipo de pregunta
 * @param {Array} options - Opciones de la pregunta
 * @returns {string[]}
 */
export function getCorrectAnswerTexts(correctAnswers, type, options = []) {
  if (type === 'true-false') {
    return [normalizeTrueFalse(correctAnswers)];
  }

  const normalized = normalizeCorrectAnswers(type, correctAnswers, options);

  return normalized.map(idx => {
    if (typeof idx === 'number' && options[idx]) {
      const opt = options[idx];
      return typeof opt === 'string' ? opt : opt?.text || `Opción ${idx + 1}`;
    }
    return String(idx);
  });
}

export default {
  normalizeCorrectAnswers,
  normalizeTrueFalse,
  normalizeMultipleChoice,
  formatAnswerForDisplay,
  validateAnswer,
  getCorrectAnswerTexts,
};
