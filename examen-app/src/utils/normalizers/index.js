/**
 * @fileoverview Barrel export para normalizadores
 * Centraliza todas las funciones de normalización
 */

// Normalizadores de respuestas
export {
  normalizeCorrectAnswers,
  normalizeTrueFalse,
  normalizeMultipleChoice,
  formatAnswerForDisplay,
  validateAnswer,
  getCorrectAnswerTexts,
} from './answerNormalizer';

// Normalizadores de fechas
export {
  normalizeFirestoreDate,
  formatDate,
  formatRelativeTime,
  formatDuration,
  formatDurationLong,
  formatDurationClock,
  isDeadlinePassed,
  getTimeRemaining,
} from './dateNormalizer';

// Re-export defaults para compatibilidad
import answerNormalizer from './answerNormalizer';
import dateNormalizer from './dateNormalizer';

export const normalizers = {
  ...answerNormalizer,
  ...dateNormalizer,
};

export default normalizers;
