/**
 * @fileoverview Servicio de operaciones batch para resolver el problema N+1
 * Proporciona funciones para cargar múltiples documentos en paralelo
 */

import { db } from './firebase';
import {
  collection,
  getDocs,
  query,
  where,
  documentId
} from 'firebase/firestore';
import { logger } from '../utils/logger';

/**
 * Obtiene múltiples documentos por IDs en batches de 10 (límite Firestore)
 * @param {string} collectionName - Nombre de la colección
 * @param {string[]} ids - Array de IDs a obtener
 * @returns {Promise<Map>} - Map de ID -> documento
 */
export async function getDocsByIds(collectionName, ids) {
  if (!ids || ids.length === 0) return new Map();

  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const results = new Map();

  // Firestore permite máximo 10 elementos en 'in' query
  const batches = [];
  for (let i = 0; i < uniqueIds.length; i += 10) {
    batches.push(uniqueIds.slice(i, i + 10));
  }

  logger.debug(`Batch loading ${uniqueIds.length} documentos de ${collectionName}`);

  await Promise.all(batches.map(async (batchIds) => {
    try {
      const q = query(
        collection(db, collectionName),
        where(documentId(), 'in', batchIds)
      );

      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        results.set(doc.id, { id: doc.id, ...doc.data() });
      });
    } catch (error) {
      logger.error(`Error en batch de ${collectionName}`, { error: error.message, batchIds });
    }
  }));

  return results;
}

/**
 * Pre-carga datos relacionados para una lista de intentos
 * Resuelve el problema N+1 cargando todo en paralelo
 * @param {Array} attempts - Lista de intentos
 * @param {Object} options - Opciones de carga
 * @returns {Promise<Object>} - Datos relacionados organizados
 */
export async function preloadRelatedData(attempts, options = {}) {
  const {
    loadExams = true,
    loadSubjects = true,
    loadQuestions = false
  } = options;

  const results = {
    exams: new Map(),
    subjects: new Map(),
    questions: new Map()
  };

  // Recopilar todos los IDs necesarios
  const examIds = new Set();
  const subjectIds = new Set();
  const questionIds = new Set();

  attempts.forEach(attempt => {
    if (attempt.examId) examIds.add(attempt.examId);

    if (attempt.scoreBySubject) {
      Object.keys(attempt.scoreBySubject).forEach(id => subjectIds.add(id));
    }

    if (loadQuestions && attempt.detailPerQuestion) {
      attempt.detailPerQuestion.forEach(detail => {
        if (detail.questionId) questionIds.add(detail.questionId);
        if (detail.subject) subjectIds.add(detail.subject);
      });
    }
  });

  logger.info('Pre-cargando datos relacionados', {
    exams: examIds.size,
    subjects: subjectIds.size,
    questions: questionIds.size
  });

  // Cargar en paralelo
  const promises = [];

  if (loadExams && examIds.size > 0) {
    promises.push(
      getDocsByIds('exams', [...examIds])
        .then(map => { results.exams = map; })
    );
  }

  if (loadSubjects && subjectIds.size > 0) {
    promises.push(
      getDocsByIds('subjects', [...subjectIds])
        .then(map => { results.subjects = map; })
    );
  }

  if (loadQuestions && questionIds.size > 0) {
    promises.push(
      getDocsByIds('questions', [...questionIds])
        .then(map => { results.questions = map; })
    );
  }

  await Promise.all(promises);

  return results;
}

/**
 * Enriquece intentos con datos relacionados ya cargados
 * @param {Array} attempts - Lista de intentos
 * @param {Object} relatedData - Datos de preloadRelatedData
 * @returns {Array} - Intentos enriquecidos
 */
export function enrichAttempts(attempts, relatedData) {
  const { exams, subjects } = relatedData;

  return attempts.map(attempt => {
    const enriched = { ...attempt };

    // Agregar título del examen
    if (attempt.examId && exams.has(attempt.examId)) {
      enriched.examTitle = exams.get(attempt.examId).title;
      enriched.examData = exams.get(attempt.examId);
    }

    // Agregar nombres de materias a scoreBySubject
    if (attempt.scoreBySubject) {
      const enrichedScores = {};

      Object.entries(attempt.scoreBySubject).forEach(([subjectId, score]) => {
        const subjectData = subjects.get(subjectId);
        enrichedScores[subjectId] = {
          ...score,
          subjectName: subjectData?.name || score.subjectName || `Materia ${subjectId.slice(0, 6)}`
        };
      });

      enriched.scoreBySubject = enrichedScores;
    }

    // Calcular porcentaje si no existe
    if (enriched.percentage === undefined && enriched.scoreBySubject) {
      const totals = Object.values(enriched.scoreBySubject);
      const totalCorrect = totals.reduce((sum, s) => sum + (s.correct || 0), 0);
      const totalQuestions = totals.reduce((sum, s) => sum + (s.total || 0), 0);
      enriched.percentage = totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;
    }

    return enriched;
  });
}

/**
 * Obtiene todos los intentos de un usuario con datos relacionados
 * @param {string} userId - ID del usuario
 * @param {string} examId - ID del examen (opcional)
 * @returns {Promise<Array>} - Intentos enriquecidos
 */
export async function getEnrichedAttempts(userId, examId = null) {
  let q;

  if (examId) {
    q = query(
      collection(db, 'attempts'),
      where('userId', '==', userId),
      where('examId', '==', examId)
    );
  } else {
    q = query(
      collection(db, 'attempts'),
      where('userId', '==', userId)
    );
  }

  const snapshot = await getDocs(q);
  const attempts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  if (attempts.length === 0) return [];

  // Pre-cargar datos relacionados
  const relatedData = await preloadRelatedData(attempts);

  // Enriquecer y retornar
  return enrichAttempts(attempts, relatedData);
}
