import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Crea un examen con validaciones completas y sincronización perfecta
 */
export async function createExam({
  title,
  description,
  subjectList = [],
  questionRefs = [],
  createdBy,
  timeLimit,
  maxAttempts,
  deadline,
  isClosed = false,
}) {
  try {
    // Validaciones básicas
    if (!title?.trim()) throw new Error("El título es requerido");
    if (!subjectList?.length)
      throw new Error("Selecciona al menos una materia");
    if (!questionRefs?.length)
      throw new Error("Selecciona al menos una pregunta");
    if (!timeLimit || timeLimit < 1) throw new Error("Tiempo límite inválido");
    if (!maxAttempts || maxAttempts < 1 || maxAttempts > 3)
      throw new Error("Número de intentos inválido (1-3)");
    if (!deadline) throw new Error("Fecha límite requerida");

    // Validar que las materias existen
    const subjectsSnap = await getDocs(collection(db, "subjects"));
    const validSubjects = new Set(subjectsSnap.docs.map((doc) => doc.id));

    const invalidSubjects = subjectList.filter((id) => !validSubjects.has(id));
    if (invalidSubjects.length) {
      throw new Error(`Materias no válidas: ${invalidSubjects.join(", ")}`);
    }

    // Validar que las preguntas existen y pertenecen a las materias seleccionadas
    const questionsSnap = await getDocs(collection(db, "questions"));
    const questionsMap = new Map();

    questionsSnap.docs.forEach((doc) => {
      const data = doc.data();
      questionsMap.set(doc.id, data);
    });

    // Verificar preguntas válidas
    const invalidQuestions = [];
    const questionSubjectMismatch = [];

    for (const questionId of questionRefs) {
      const questionData = questionsMap.get(questionId);

      if (!questionData) {
        invalidQuestions.push(questionId);
      } else if (!subjectList.includes(questionData.subject)) {
        questionSubjectMismatch.push({
          id: questionId,
          questionSubject: questionData.subject,
          text: questionData.text?.substring(0, 50) + "...",
        });
      }
    }

    if (invalidQuestions.length) {
      throw new Error(
        `Preguntas no encontradas: ${invalidQuestions.length} preguntas`
      );
    }

    if (questionSubjectMismatch.length) {
      throw new Error(
        `Algunas preguntas no pertenecen a las materias seleccionadas`
      );
    }

    // Validar estructura de respuestas correctas
    const questionsWithIssues = [];
    for (const questionId of questionRefs) {
      const questionData = questionsMap.get(questionId);

      // Validar que tengan respuestas correctas
      if (
        !questionData.correctAnswers ||
        (Array.isArray(questionData.correctAnswers) &&
          questionData.correctAnswers.length === 0)
      ) {
        questionsWithIssues.push({
          id: questionId,
          issue: "sin respuestas correctas",
          text: questionData.text?.substring(0, 50) + "...",
        });
      }
    }

    if (questionsWithIssues.length) {
      console.warn("⚠️ Preguntas con problemas:", questionsWithIssues);
      throw new Error(
        `Hay ${questionsWithIssues.length} preguntas sin respuestas correctas definidas`
      );
    }

    // Crear el examen
    const examDoc = await addDoc(collection(db, "exams"), {
      title: title.trim(),
      description: description?.trim() || "",
      subjectList,
      questionRefs,
      createdBy,
      timeLimit: Number(timeLimit),
      maxAttempts: Number(maxAttempts),
      deadline: new Date(deadline),
      isClosed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Metadata adicional para sincronización
      totalQuestions: questionRefs.length,
      subjectCount: subjectList.length,
      version: 1,
    });

    console.log("✅ Examen creado exitosamente:", {
      id: examDoc.id,
      title,
      questions: questionRefs.length,
      subjects: subjectList.length,
    });

    return examDoc;
  } catch (error) {
    console.error("❌ Error creating exam:", error);
    throw error;
  }
}

/**
 * Obtiene todos los exámenes con información completa y sincronizada
 */
export async function getExams() {
  try {
    // Cargar datos en paralelo para optimizar
    const [examSnap, subjectsSnap, questionsSnap] = await Promise.all([
      getDocs(collection(db, "exams")),
      getDocs(collection(db, "subjects")),
      getDocs(collection(db, "questions")),
    ]);

    // Crear mapas para búsqueda rápida
    const subjectsMap = new Map(
      subjectsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
    );

    const questionsMap = new Map(
      questionsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
    );

    // Procesar exámenes
    const exams = await Promise.all(
      examSnap.docs.map(async (doc) => {
        const examData = doc.data();

        // Procesar fecha límite
        const deadline = examData.deadline?.toDate?.()
          ? examData.deadline.toDate()
          : new Date(examData.deadline);

        // Procesar materias
        const subjectList = Array.isArray(examData.subjectList)
          ? examData.subjectList
          : [];
        const subjectNames = subjectList
          .map((id) => subjectsMap.get(id)?.name)
          .filter(Boolean);

        // Procesar preguntas con normalización de respuestas correctas
        const questions = (examData.questionRefs || [])
          .map((qId) => {
            const question = questionsMap.get(qId);
            if (!question) {
              console.warn(`⚠️ Pregunta no encontrada: ${qId}`);
              return null;
            }

            // **NORMALIZACIÓN CRÍTICA** - Asegurar formato consistente
            let normalizedCorrectAnswers = question.correctAnswers;

            if (question.type === "true-false") {
              // Para true/false, asegurar que sea string
              normalizedCorrectAnswers = Array.isArray(question.correctAnswers)
                ? question.correctAnswers[0]
                : question.correctAnswers;
            } else if (
              ["multiple-choice", "icfes", "image", "video"].includes(
                question.type
              )
            ) {
              // Para opciones múltiples, asegurar que sea array
              if (!Array.isArray(question.correctAnswers)) {
                normalizedCorrectAnswers = [question.correctAnswers];
              }

              // Convertir índices numéricos a letras si es necesario
              normalizedCorrectAnswers = normalizedCorrectAnswers.map(
                (answer) => {
                  if (typeof answer === "number") {
                    return String.fromCharCode(65 + answer); // 0->A, 1->B, etc.
                  }
                  return answer;
                }
              );
            }

            return {
              ...question,
              correctAnswers: normalizedCorrectAnswers,
              subjectName:
                subjectsMap.get(question.subject)?.name ||
                "Materia no encontrada",
            };
          })
          .filter(Boolean);

        // Verificar integridad
        const missingQuestions =
          examData.questionRefs.length - questions.length;
        if (missingQuestions > 0) {
          console.warn(
            `⚠️ Examen ${doc.id}: ${missingQuestions} preguntas faltantes`
          );
        }

        return {
          id: doc.id,
          ...examData,
          deadline,
          subjectList,
          subjectNames,
          questions,
          // Metadata de integridad
          integrity: {
            questionsFound: questions.length,
            questionsExpected: examData.questionRefs?.length || 0,
            subjectsFound: subjectNames.length,
            subjectsExpected: subjectList.length,
            isValid: questions.length > 0 && subjectNames.length > 0,
          },
        };
      })
    );

    // Filtrar exámenes válidos
    const validExams = exams.filter((exam) => exam.integrity.isValid);
    const invalidExams = exams.filter((exam) => !exam.integrity.isValid);

    if (invalidExams.length > 0) {
      console.warn(
        `⚠️ ${invalidExams.length} exámenes con problemas de integridad:`,
        invalidExams.map((e) => ({ id: e.id, title: e.title }))
      );
    }

    console.log(
      `✅ Exámenes cargados: ${validExams.length} válidos, ${invalidExams.length} con problemas`
    );

    return validExams;
  } catch (error) {
    console.error("❌ Error getting exams:", error);
    throw error;
  }
}

/**
 * Obtiene un examen específico con validación completa
 */
export async function getExamById(examId) {
  try {
    const examDoc = await getDoc(doc(db, "exams", examId));
    if (!examDoc.exists()) {
      throw new Error("Examen no encontrado");
    }

    const examData = examDoc.data();

    // Cargar materias y preguntas
    const [subjectsSnap, questionsSnap] = await Promise.all([
      getDocs(collection(db, "subjects")),
      getDocs(collection(db, "questions")),
    ]);

    const subjectsMap = new Map(
      subjectsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
    );

    const questionsMap = new Map(
      questionsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
    );

    // Procesar igual que en getExams()
    const deadline = examData.deadline?.toDate?.()
      ? examData.deadline.toDate()
      : new Date(examData.deadline);

    const subjectList = Array.isArray(examData.subjectList)
      ? examData.subjectList
      : [];
    const subjectNames = subjectList
      .map((id) => subjectsMap.get(id)?.name)
      .filter(Boolean);

    const questions = (examData.questionRefs || [])
      .map((qId) => {
        const question = questionsMap.get(qId);
        if (!question) return null;

        // Normalización igual que en getExams()
        let normalizedCorrectAnswers = question.correctAnswers;

        if (question.type === "true-false") {
          normalizedCorrectAnswers = Array.isArray(question.correctAnswers)
            ? question.correctAnswers[0]
            : question.correctAnswers;
        } else if (
          ["multiple-choice", "icfes", "image", "video"].includes(question.type)
        ) {
          if (!Array.isArray(question.correctAnswers)) {
            normalizedCorrectAnswers = [question.correctAnswers];
          }

          normalizedCorrectAnswers = normalizedCorrectAnswers.map((answer) => {
            if (typeof answer === "number") {
              return String.fromCharCode(65 + answer);
            }
            return answer;
          });
        }

        return {
          ...question,
          correctAnswers: normalizedCorrectAnswers,
          subjectName:
            subjectsMap.get(question.subject)?.name || "Materia no encontrada",
        };
      })
      .filter(Boolean);

    return {
      id: examDoc.id,
      ...examData,
      deadline,
      subjectList,
      subjectNames,
      questions,
    };
  } catch (error) {
    console.error("❌ Error getting exam by ID:", error);
    throw error;
  }
}

/**
 * Actualiza un examen
 */
export async function updateExam(examId, data) {
  await updateDoc(doc(db, "exams", examId), {
    ...data,
    updatedAt: serverTimestamp(),
    version: (data.version || 1) + 1,
  });
}

/**
 * Elimina un examen
 */
export async function deleteExam(examId) {
  await deleteDoc(doc(db, "exams", examId));
}
