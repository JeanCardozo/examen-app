// eslint-disable-next-line no-unused-vars
import { db, storage } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
// eslint-disable-next-line no-unused-vars
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MAX_QUESTIONS_PER_GROUP } from "./questionGroupService";

/**
 * Valida que la materia existe antes de crear/actualizar una pregunta
 */
async function validateSubject(subjectId) {
  if (!subjectId) throw new Error("ID de materia requerido");

  const subjectDoc = await getDoc(doc(db, "subjects", subjectId));
  if (!subjectDoc.exists()) {
    throw new Error("La materia seleccionada no existe");
  }

  return subjectDoc.data();
}

/**
 * Normaliza las respuestas correctas según el tipo de pregunta
 */

function normalizeCorrectAnswers(type, correctAnswers, options) {
  switch (type) {
    case "true-false":
      // Para true/false, debe ser un string único
      if (Array.isArray(correctAnswers)) {
        return correctAnswers[0] || "Verdadero";
      }
      return correctAnswers || "Verdadero";

    case "multiple-choice":
    case "icfes":
    case "image":
    case "video": {
      // Para opciones múltiples, asegurar que sean índices numéricos
      let normalized = Array.isArray(correctAnswers)
        ? correctAnswers
        : [correctAnswers];

      return normalized.map((answer) => {
        // Si es letra (A, B, C...), convertir a índice (0, 1, 2...)
        if (
          typeof answer === "string" &&
          answer.length === 1 &&
          answer >= "A" &&
          answer <= "Z"
        ) {
          return answer.charCodeAt(0) - 65;
        }
        // Si ya es número, mantenerlo
        if (typeof answer === "number") {
          return answer;
        }
        // Si es string de opción, encontrar su índice o buscar en objetos
        if (options) {
          const index = options.findIndex((opt) => {
            if (typeof opt === "string") return opt === answer;
            if (typeof opt === "object" && opt.text) return opt.text === answer;
            return false;
          });
          if (index !== -1) return index;
        }

        return 0; // fallback
      });
    }

    case "math":
      return []; // Las preguntas matemáticas no tienen opciones múltiples estándar

    default:
      return Array.isArray(correctAnswers) ? correctAnswers : [correctAnswers];
  }
}

/**
 * Valida la estructura completa de una pregunta
 */

function validateQuestionStructure(questionData) {
  const { text, type, options, correctAnswers, subject } = questionData;

  if (!text?.trim()) throw new Error("El enunciado es obligatorio");
  if (!type) throw new Error("El tipo de pregunta es obligatorio");
  if (!subject) throw new Error("La materia es obligatoria");

  // Validaciones específicas por tipo
  switch (type) {
    case "multiple-choice":
      if (!options || options.length < 2) {
        throw new Error(
          "Las preguntas de opción múltiple requieren al menos 2 opciones",
        );
      }
      if (!correctAnswers || correctAnswers.length === 0) {
        throw new Error("Debe seleccionar al menos una respuesta correcta");
      }
      break;

    case "icfes":
      if (!options || options.length < 4) {
        throw new Error(
          "Las preguntas tipo ICFES requieren al menos 4 opciones",
        );
      }
      if (!correctAnswers || correctAnswers.length === 0) {
        throw new Error("Debe seleccionar al menos una respuesta correcta");
      }
      break;

    case "true-false":
      if (!correctAnswers) {
        throw new Error("Debe seleccionar la respuesta correcta");
      }
      break;

    case "image":
    case "video":
      if (!questionData.mediaUrl && !questionData.mediaFile) {
        throw new Error(
          `Las preguntas de ${type} requieren contenido multimedia`,
        );
      }
      if (!options || options.length < 2) {
        throw new Error(
          `Las preguntas de ${type} requieren opciones de respuesta`,
        );
      }
      break;
  }

  return true;
}

/**
 * Añade una pregunta con validación y normalización completa
 */
export async function addQuestion(questionData) {
  try {
    // Validar estructura
    validateQuestionStructure(questionData);

    // Validar que la materia existe
    await validateSubject(questionData.subject);

    // Normalizar respuestas correctas
    const normalizedCorrectAnswers = normalizeCorrectAnswers(
      questionData.type,
      questionData.correctAnswers,
      questionData.options,
    );

    // Limpiar y preparar datos
    const cleanedData = {
      text: questionData.text.trim(),
      type: questionData.type,
      options: questionData.options
        ? questionData.options.filter((opt) => {
            if (typeof opt === "string") return opt.trim();
            if (typeof opt === "object")
              return opt.text?.trim() || opt.imageUrl;
            return false;
          })
        : [],
      correctAnswers: normalizedCorrectAnswers,
      difficulty: questionData.difficulty || "medium",
      subject: questionData.subject,
      explanation: questionData.explanation?.trim() || "",
      mediaUrl: questionData.mediaUrl || null,
      groupId: questionData.groupId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Metadata para auditoría
      version: 1,
      isActive: true,
    };

    const docRef = await addDoc(collection(db, "questions"), cleanedData);

    console.log("✅ Pregunta creada con normalización:", {
      id: docRef.id,
      type: cleanedData.type,
      correctAnswers: cleanedData.correctAnswers,
      subject: cleanedData.subject,
    });

    return docRef;
  } catch (error) {
    console.error("❌ Error adding question:", error);
    throw error;
  }
}

/**
 * Actualiza una pregunta existente con validación.
 */
export async function updateQuestion(questionId, data) {
  try {
    if (!questionId) throw new Error("ID de pregunta requerido");

    // Validar que la materia existe si se está actualizando
    if (data.subject) {
      await validateSubject(data.subject);
    }

    // Normalizar respuestas correctas si se proporcionan
    if (data.correctAnswers && data.type) {
      data.correctAnswers = normalizeCorrectAnswers(
        data.type,
        data.correctAnswers,
        data.options,
      );
    }

    await updateDoc(doc(db, "questions", questionId), {
      ...data,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Pregunta actualizada:", questionId);
  } catch (error) {
    console.error("❌ Error updating question:", error);
    throw error;
  }
}

/**
 * Elimina una pregunta.
 */
export async function deleteQuestion(questionId) {
  try {
    await deleteDoc(doc(db, "questions", questionId));
    console.log("✅ Pregunta eliminada:", questionId);
  } catch (error) {
    console.error("❌ Error deleting question:", error);
    throw error;
  }
}

/**
 * Obtiene preguntas filtradas por materias y dificultades.
 */
export async function getQuestionsByFilters(subjects = [], difficulties = []) {
  try {
    let q = query(collection(db, "questions"));

    if (subjects.length) {
      q = query(q, where("subject", "in", subjects));
    }
    if (difficulties.length) {
      q = query(q, where("difficulty", "in", difficulties));
    }

    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting questions by filters:", error);
    throw error;
  }
}

/**
 * Obtiene todas las preguntas de un grupo específico.
 */
export async function getGroupQuestions(groupId) {
  try {
    const q = query(
      collection(db, "questions"),
      where("groupId", "==", groupId),
    );

    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting group questions:", error);
    throw error;
  }
}

/**
 * Verifica si se puede agregar una pregunta a un grupo
 */
export async function canAddToGroup(groupId) {
  try {
    const groupQuestions = await getGroupQuestions(groupId);
    return groupQuestions.length < MAX_QUESTIONS_PER_GROUP;
  } catch (error) {
    console.error("Error checking if can add to group:", error);
    throw error;
  }
}

/**
 * Obtiene preguntas con información completa de materias
 */
export async function getQuestionsWithSubjectNames() {
  try {
    const [questionsSnap, subjectsSnap] = await Promise.all([
      getDocs(collection(db, "questions")),
      getDocs(collection(db, "subjects")),
    ]);

    const subjectsMap = new Map();
    subjectsSnap.docs.forEach((doc) => {
      subjectsMap.set(doc.id, doc.data().name);
    });

    return questionsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        subjectName: subjectsMap.get(data.subject) || "Materia no encontrada",
      };
    });
  } catch (error) {
    console.error("Error getting questions with subject names:", error);
    throw error;
  }
}
