import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { collection, getDocs, doc, getDoc, query, where, documentId } from 'firebase/firestore';
import { db } from '../services/firebase';
import { logger } from '../utils/logger';

const CacheContext = createContext(null);

// Tiempo de expiración del caché (5 minutos)
const CACHE_TTL = 5 * 60 * 1000;

export function CacheProvider({ children }) {
  const [subjectsCache, setSubjectsCache] = useState(null);
  const [examsCache, setExamsCache] = useState(new Map());
  const lastFetchTime = useRef({
    subjects: 0,
    exams: new Map()
  });

  /**
   * Obtiene todas las materias (con caché)
   */
  const getSubjects = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    if (!forceRefresh &&
        subjectsCache &&
        (now - lastFetchTime.current.subjects) < CACHE_TTL) {
      logger.debug('Usando caché de materias');
      return subjectsCache;
    }

    logger.info('Cargando materias desde Firestore');
    const snapshot = await getDocs(collection(db, 'subjects'));
    const subjectsMap = new Map(
      snapshot.docs.map(docSnap => [docSnap.id, { id: docSnap.id, ...docSnap.data() }])
    );

    setSubjectsCache(subjectsMap);
    lastFetchTime.current.subjects = now;

    return subjectsMap;
  }, [subjectsCache]);

  /**
   * Obtiene un examen por ID (con caché)
   */
  const getExamById = useCallback(async (examId, forceRefresh = false) => {
    const now = Date.now();
    const cachedExam = examsCache.get(examId);
    const lastFetch = lastFetchTime.current.exams.get(examId) || 0;

    if (!forceRefresh && cachedExam && (now - lastFetch) < CACHE_TTL) {
      logger.debug('Usando caché de examen', { examId });
      return cachedExam;
    }

    logger.info('Cargando examen desde Firestore', { examId });
    const examDoc = await getDoc(doc(db, 'exams', examId));
    if (!examDoc.exists()) return null;

    const examData = { id: examDoc.id, ...examDoc.data() };

    setExamsCache(prev => new Map(prev).set(examId, examData));
    lastFetchTime.current.exams.set(examId, now);

    return examData;
  }, [examsCache]);

  /**
   * Obtiene múltiples exámenes por IDs (batch loading - resuelve N+1)
   */
  const getExamsByIds = useCallback(async (examIds, forceRefresh = false) => {
    if (!examIds || examIds.length === 0) return new Map();

    const now = Date.now();
    const results = new Map();
    const toFetch = [];
    const uniqueIds = [...new Set(examIds)].filter(Boolean);

    // Verificar caché primero
    for (const examId of uniqueIds) {
      const cachedExam = examsCache.get(examId);
      const lastFetch = lastFetchTime.current.exams.get(examId) || 0;

      if (!forceRefresh && cachedExam && (now - lastFetch) < CACHE_TTL) {
        results.set(examId, cachedExam);
      } else {
        toFetch.push(examId);
      }
    }

    // Fetch en batch los que faltan (máximo 10 por batch - límite Firestore)
    if (toFetch.length > 0) {
      logger.info('Batch loading exámenes', { count: toFetch.length });

      const batches = [];
      for (let i = 0; i < toFetch.length; i += 10) {
        batches.push(toFetch.slice(i, i + 10));
      }

      await Promise.all(batches.map(async (batch) => {
        try {
          const q = query(
            collection(db, 'exams'),
            where(documentId(), 'in', batch)
          );
          const snapshot = await getDocs(q);

          snapshot.docs.forEach((examDoc) => {
            const examData = { id: examDoc.id, ...examDoc.data() };
            results.set(examDoc.id, examData);

            setExamsCache(prev => new Map(prev).set(examDoc.id, examData));
            lastFetchTime.current.exams.set(examDoc.id, now);
          });
        } catch (error) {
          logger.error('Error en batch loading de exámenes', { error: error.message });
        }
      }));
    }

    return results;
  }, [examsCache]);

  /**
   * Obtiene múltiples materias por IDs (batch loading)
   */
  const getSubjectsByIds = useCallback(async (subjectIds) => {
    if (!subjectIds || subjectIds.length === 0) return new Map();

    // Primero intentar desde el caché general de materias
    const allSubjects = await getSubjects();
    const results = new Map();

    for (const id of subjectIds) {
      if (allSubjects.has(id)) {
        results.set(id, allSubjects.get(id));
      }
    }

    return results;
  }, [getSubjects]);

  /**
   * Invalida el caché
   */
  const invalidateCache = useCallback((type = 'all') => {
    logger.info('Invalidando caché', { type });

    if (type === 'all' || type === 'subjects') {
      setSubjectsCache(null);
      lastFetchTime.current.subjects = 0;
    }
    if (type === 'all' || type === 'exams') {
      setExamsCache(new Map());
      lastFetchTime.current.exams = new Map();
    }
  }, []);

  /**
   * Pre-carga datos comunes
   */
  const preloadCommonData = useCallback(async () => {
    logger.info('Pre-cargando datos comunes');
    await getSubjects();
  }, [getSubjects]);

  const value = {
    getSubjects,
    getSubjectsByIds,
    getExamById,
    getExamsByIds,
    invalidateCache,
    preloadCommonData,
    // Para debug
    cacheStats: {
      subjectsCached: !!subjectsCache,
      subjectsCount: subjectsCache?.size || 0,
      examsCachedCount: examsCache.size
    }
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
}

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache debe usarse dentro de CacheProvider');
  }
  return context;
};

export default CacheContext;
