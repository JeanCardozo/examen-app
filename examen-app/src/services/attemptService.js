import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  // eslint-disable-next-line no-unused-vars
  deleteDoc,
} from "firebase/firestore";

/**
 * 🔥 FUNCIÓN MEJORADA: Crea un intento ÚNICO para un estudiante
 */
export async function createAttempt({ userId, examId }) {
  if (!userId || !examId) {
    throw new Error("ID de usuario y examen son requeridos");
  }

  try {
    console.log("🆕 Creando intento único para:", { userId, examId });

    // 🔒 VERIFICAR SI YA HAY UN INTENTO ACTIVO
    const activeAttemptQuery = query(
      collection(db, "attempts"),
      where("userId", "==", userId),
      where("examId", "==", examId),
      where("status", "==", "in-progress")
    );

    const activeAttempts = await getDocs(activeAttemptQuery);

    // Si hay intentos activos, finalizarlos primero
    if (!activeAttempts.empty) {
      console.log("⚠️ Encontrados intentos activos, limpiando...");
      const cleanupPromises = activeAttempts.docs.map(async (doc) => {
        await updateDoc(doc.ref, {
          status: "abandoned",
          endedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await Promise.all(cleanupPromises);
    }

    // Crear el nuevo intento
    const attemptData = {
      userId,
      examId,
      startedAt: serverTimestamp(),
      endedAt: null,
      status: "in-progress",
      detailPerQuestion: [],
      scoreBySubject: {},
      alertLog: [],
      securityEvents: {
        tabSwitches: 0,
        timeUp: false,
        aborted: false,
      },
      duration: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Metadata para prevenir duplicados
      sessionId: `${userId}_${examId}_${Date.now()}`,
    };

    const attemptRef = await addDoc(collection(db, "attempts"), attemptData);

    console.log("✅ Intento único creado:", attemptRef.id);
    return attemptRef.id;
  } catch (error) {
    console.error("❌ Error creating unique attempt:", error);
    throw new Error(`Error al crear intento: ${error.message}`);
  }
}

/**
 * 🔥 FUNCIÓN MEJORADA: Finalizar intento con validación completa
 */
export async function finishAttempt(attemptId, data) {
  if (!attemptId) throw new Error("ID de intento requerido");

  try {
    console.log("📤 Finalizando intento:", attemptId);

    // Verificar que el intento existe
    const attemptDoc = await getDoc(doc(db, "attempts", attemptId));
    if (!attemptDoc.exists()) {
      throw new Error("Intento no encontrado");
    }

    const currentData = attemptDoc.data();

    // Si ya está finalizado completamente (finished) no sobrescribimos
    if (currentData.status === "finished") {
      console.warn("⚠️ Intento ya finalizado, ignorando actualización...");
      return true;
    }

    // 🎯 PROCESAR Y VALIDAR DATOS ENTRANTES
    const processedScoreBySubject = {};
    if (data.scoreBySubject) {
      Object.entries(data.scoreBySubject).forEach(([subject, score]) => {
        processedScoreBySubject[subject] = {
          correct: Number(score.correct) || 0,
          total: Number(score.total) || 0,
          subjectName: score.subjectName || `Materia ${subject}`,
        };
      });
    }

    // Validar detailPerQuestion (ahora esperamos selectedAnswerIds / selectedAnswerTexts)
    const processedDetails = [];
    if (Array.isArray(data.detailPerQuestion)) {
      data.detailPerQuestion.forEach((detail, index) => {
        const selectedIds =
          Array.isArray(detail.selectedAnswerIds) &&
          detail.selectedAnswerIds.length > 0
            ? detail.selectedAnswerIds
            : detail.selectedAnswerId
            ? [detail.selectedAnswerId]
            : null;

        const selectedTexts =
          Array.isArray(detail.selectedAnswerTexts) &&
          detail.selectedAnswerTexts.length > 0
            ? detail.selectedAnswerTexts
            : detail.selectedAnswerText
            ? [detail.selectedAnswerText]
            : null;

        // Mantener estructura completa para prospección y auditoría
        processedDetails.push({
          questionId: detail.questionId || `question_${index}`,
          questionText: detail.questionText || detail.text || "Sin texto",
          subject: detail.subject || "unknown",
          subjectName: detail.subjectName || "Sin materia",
          difficulty: detail.difficulty || "medium",
          // Valores enviados por el frontend (ids y textos)
          selectedAnswerIds: selectedIds,
          selectedAnswerTexts: selectedTexts,
          // Mantener backward-compatibility con keys antiguas
          selectedAnswer: selectedIds
            ? selectedIds.length === 1
              ? selectedIds[0]
              : selectedIds
            : detail.selectedAnswer || null,
          correctAnswers: detail.correctAnswers || null,
          isCorrect: Boolean(detail.isCorrect),
          explanation: detail.explanation || null,
          type: detail.type || "multiple-choice",
        });
      });
    }

    // Procesar eventos de seguridad
    const securityEvents = {
      tabSwitches: Number(data.securityEvents?.tabSwitches) || 0,
      timeUp: Boolean(data.securityEvents?.timeUp),
      aborted: Boolean(data.securityEvents?.aborted),
    };

    // Incluir datos adaptativos si vienen
    const adaptiveOrderingData = data.adaptiveOrderingData || null;

    // Preparar datos finales
    const totalQuestions = processedDetails.length;
    const totalCorrect = processedDetails.filter((d) => d.isCorrect).length;
    const totalIncorrect = totalQuestions - totalCorrect;

    const finalData = {
      detailPerQuestion: processedDetails,
      scoreBySubject: processedScoreBySubject,
      alertLog: Array.isArray(data.alertLog) ? data.alertLog : [],
      securityEvents,
      status: data.status || (securityEvents.aborted ? "aborted" : "finished"),
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      duration: Number(data.duration) || 0,
      // Estadísticas calculadas
      totalQuestions,
      totalCorrect,
      totalIncorrect,
      percentage:
        totalQuestions > 0
          ? Math.round((totalCorrect / totalQuestions) * 100)
          : 0,
      // Datos del sistema adaptativo (si se enviaron)
      adaptiveOrderingData,
    };

    // Actualizar documento del intento
    await updateDoc(doc(db, "attempts", attemptId), finalData);

    console.log("✅ Intento finalizado exitosamente:", {
      attemptId,
      status: finalData.status,
      totalQuestions: finalData.totalQuestions,
      percentage: finalData.percentage,
      securityEvents: finalData.securityEvents,
    });

    return true;
  } catch (error) {
    console.error("❌ Error finishing attempt:", error);
    throw new Error(`Error al finalizar intento: ${error.message}`);
  }
}

/**
 * 🔥 FUNCIÓN MEJORADA: Obtener intento con datos completos
 */
export async function getAttemptById(attemptId) {
  if (!attemptId) throw new Error("ID de intento requerido");

  try {
    console.log("🔍 Obteniendo intento:", attemptId);

    const attemptDoc = await getDoc(doc(db, "attempts", attemptId));
    if (!attemptDoc.exists()) {
      throw new Error("Intento no encontrado");
    }

    const data = attemptDoc.data();

    // Procesar datos para compatibilidad
    const processedData = {
      id: attemptDoc.id,
      ...data,
      // Asegurar que securityEvents existe
      securityEvents: data.securityEvents || {
        tabSwitches: 0,
        timeUp: false,
        aborted: data.status === "aborted",
      },
      // Asegurar que detailPerQuestion es un array
      detailPerQuestion: Array.isArray(data.detailPerQuestion)
        ? data.detailPerQuestion
        : [],
      // Asegurar que scoreBySubject existe
      scoreBySubject: data.scoreBySubject || {},
      // Calcular estadísticas si no existen
      totalQuestions:
        data.totalQuestions || data.detailPerQuestion?.length || 0,
      totalCorrect:
        data.totalCorrect ||
        data.detailPerQuestion?.filter((d) => d.isCorrect).length ||
        0,
      percentage:
        data.percentage ||
        (data.detailPerQuestion?.length > 0
          ? Math.round(
              (data.detailPerQuestion.filter((d) => d.isCorrect).length /
                data.detailPerQuestion.length) *
                100
            )
          : 0),
    };

    console.log("✅ Intento obtenido:", {
      id: attemptId,
      status: processedData.status,
      totalQuestions: processedData.totalQuestions,
      percentage: processedData.percentage,
    });

    return processedData;
  } catch (error) {
    console.error("❌ Error getting attempt:", error);
    throw new Error(`Error al obtener intento: ${error.message}`);
  }
}

/**
 * 🔥 FUNCIÓN MEJORADA: Obtener intentos del usuario con limpieza automática
 */
export async function getUserAttempts(userId, examId = null) {
  if (!userId) throw new Error("ID de usuario requerido");

  try {
    console.log("🔍 Obteniendo intentos del usuario:", { userId, examId });

    let queryConstraints = [
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    ];

    if (examId) {
      queryConstraints.push(where("examId", "==", examId));
    }

    const q = query(collection(db, "attempts"), ...queryConstraints);
    const snapshot = await getDocs(q);

    const attempts = [];
    const toCleanup = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Marcar intentos abandonados para limpieza
      if (data.status === "in-progress") {
        const createdAt =
          data.createdAt?.toDate?.() || new Date(data.createdAt);
        const hoursSinceCreated = (new Date() - createdAt) / (1000 * 60 * 60);

        // Si tiene más de 24 horas y sigue "in-progress", marcarlo como abandonado
        if (hoursSinceCreated > 24) {
          toCleanup.push(doc.id);
          return;
        }
      }

      // Solo incluir intentos finalizados o activos recientes
      if (data.status === "finished" || data.status === "aborted") {
        attempts.push({
          id: doc.id,
          ...data,
        });
      }
    });

    // Limpiar intentos abandonados
    if (toCleanup.length > 0) {
      console.log(`🧹 Limpiando ${toCleanup.length} intentos abandonados`);
      const cleanupPromises = toCleanup.map((attemptId) =>
        updateDoc(doc(db, "attempts", attemptId), {
          status: "abandoned",
          endedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
      await Promise.all(cleanupPromises);
    }

    console.log(`✅ ${attempts.length} intentos válidos encontrados`);
    return attempts;
  } catch (error) {
    console.error("❌ Error getting user attempts:", error);
    throw new Error(`Error al obtener intentos: ${error.message}`);
  }
}

/**
 * 🔧 FUNCIÓN NUEVA: Limpiar intentos huérfanos
 */
export async function cleanupOrphanedAttempts(userId) {
  if (!userId) return;

  try {
    console.log("🧹 Iniciando limpieza de intentos huérfanos para:", userId);

    const q = query(
      collection(db, "attempts"),
      where("userId", "==", userId),
      where("status", "==", "in-progress")
    );

    const snapshot = await getDocs(q);
    const toCleanup = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
      const hoursSinceCreated = (new Date() - createdAt) / (1000 * 60 * 60);

      // Si tiene más de 2 horas y sigue "in-progress", marcarlo como abandonado
      if (hoursSinceCreated > 2) {
        toCleanup.push(doc.id);
      }
    });

    if (toCleanup.length > 0) {
      console.log(`🧹 Limpiando ${toCleanup.length} intentos abandonados`);
      const cleanupPromises = toCleanup.map((attemptId) =>
        updateDoc(doc(db, "attempts", attemptId), {
          status: "abandoned",
          endedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
      await Promise.all(cleanupPromises);
    }

    console.log("✅ Limpieza completada");
    return toCleanup.length;
  } catch (error) {
    console.error("❌ Error en limpieza:", error);
    return 0;
  }
}

/**
 * 🔧 FUNCIÓN NUEVA: Obtener estadísticas del intento
 */
export async function getAttemptStats(attemptId) {
  try {
    const attempt = await getAttemptById(attemptId);
    if (!attempt) return null;

    const stats = {
      totalQuestions: attempt.totalQuestions || 0,
      totalCorrect: attempt.totalCorrect || 0,
      totalIncorrect: attempt.totalIncorrect || 0,
      percentage: attempt.percentage || 0,
      timeSpent: attempt.duration || 0,
      status: attempt.status,
      securityEvents: attempt.securityEvents || {},
    };

    return stats;
  } catch (error) {
    console.error("❌ Error getting attempt stats:", error);
    return null;
  }
}

/**
 * 🔧 FUNCIÓN NUEVA: Validar integridad del intento
 */
export async function validateAttemptIntegrity(attemptId) {
  try {
    const attempt = await getAttemptById(attemptId);
    if (!attempt) return false;

    const issues = [];

    // Verificar que tenga preguntas
    if (!attempt.detailPerQuestion || attempt.detailPerQuestion.length === 0) {
      issues.push("Sin preguntas respondidas");
    }

    // Verificar coherencia en scoreBySubject
    if (
      !attempt.scoreBySubject ||
      Object.keys(attempt.scoreBySubject).length === 0
    ) {
      issues.push("Sin puntajes por materia");
    }

    // Verificar estado válido
    if (!["finished", "aborted", "abandoned"].includes(attempt.status)) {
      issues.push("Estado inválido");
    }

    if (issues.length > 0) {
      console.warn(
        `⚠️ Problemas de integridad en intento ${attemptId}:`,
        issues
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error validating attempt integrity:", error);
    return false;
  }
}
