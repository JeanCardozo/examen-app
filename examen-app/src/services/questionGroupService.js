import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

export const MAX_QUESTIONS_PER_GROUP = 12;

/**
 * Crea un nuevo grupo de preguntas
 */
export async function createQuestionGroup(text) {
  try {
    const docRef = await addDoc(collection(db, "questionGroups"), {
      text: text.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef;
  } catch (error) {
    console.error("Error creating question group:", error);
    throw error;
  }
}

/**
 * Actualiza un grupo existente
 */
export async function updateQuestionGroup(groupId, text) {
  try {
    await updateDoc(doc(db, "questionGroups", groupId), {
      text: text.trim(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating question group:", error);
    throw error;
  }
}

/**
 * Elimina un grupo y todas sus preguntas asociadas
 */
export async function deleteQuestionGroup(groupId) {
  const batch = writeBatch(db);
  try {
    // Obtener preguntas asociadas
    const q = query(
      collection(db, "questions"),
      where("groupId", "==", groupId)
    );
    const snapshot = await getDocs(q);

    // Eliminar todas las preguntas
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Eliminar el grupo
    batch.delete(doc(db, "questionGroups", groupId));

    await batch.commit();
    return { deletedQuestions: snapshot.size };
  } catch (error) {
    console.error("Error deleting question group:", error);
    throw error;
  }
}

/**
 * Verifica si un grupo puede aceptar más preguntas
 */
export async function canAddQuestionsToGroup(groupId) {
  try {
    const q = query(
      collection(db, "questions"),
      where("groupId", "==", groupId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size < MAX_QUESTIONS_PER_GROUP;
  } catch (error) {
    console.error("Error checking group capacity:", error);
    throw error;
  }
}

/**
 * Obtiene el conteo de preguntas por grupo
 */
export async function getGroupQuestionCount(groupId) {
  try {
    const q = query(
      collection(db, "questions"),
      where("groupId", "==", groupId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Error getting group question count:", error);
    throw error;
  }
}
