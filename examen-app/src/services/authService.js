import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  getDoc,
  addDoc,
  collection,
} from "firebase/firestore";

/**
 * Registra un estudiante y envía verificación de email.
 */
export async function registerStudent({ displayName, email, password }) {
  try {
    // 1. Crear usuario en Firebase Auth
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // 2. Actualizar perfil con displayName
    await updateProfile(user, { displayName });

    // 3. Crear documento en Firestore
    await setDoc(doc(db, "users", user.uid), {
      displayName,
      email,
      role: "student",
      blocked: true,
      pendingApproval: true,
      registeredAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    // 4. Enviar email de verificación
    await sendEmailVerification(user);

    // 5. Cerrar sesión inmediatamente después del registro
    await signOut(auth);

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName,
      },
    };
  } catch (error) {
    console.error("Error en registro:", error);
    throw error;
  }
}

// 🔥 Nueva función para aprobar estudiante
export async function approveStudent(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error("Usuario no encontrado");
    }

    const userData = userDoc.data();
    if (userData.role !== "student") {
      throw new Error("El usuario no es un estudiante");
    }

    // Actualizar documento con serverTimestamp()
    const updateData = {
      blocked: false,
      pendingApproval: false,
      approvedAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      approvedBy: auth.currentUser?.uid || "system",
    };

    await updateDoc(userRef, updateData);

    // Log de actividad
    await addDoc(collection(db, "activityLogs"), {
      type: "STUDENT_APPROVED",
      userId,
      performedBy: auth.currentUser?.uid,
      timestamp: serverTimestamp(),
      metadata: {
        approvedBy: auth.currentUser?.uid,
        approvedAt: serverTimestamp(),
      },
    });

    return true;
  } catch (error) {
    console.error("Error aprobando estudiante:", error);
    throw error;
  }
}

/**
 * Crea un administrador (rol = admin).
 * Solo debe usarse desde una cuenta admin ya logueada.
 */
// Modificar la función createAdmin
export async function createAdmin({ displayName, email, password }) {
  try {
    // 1. Guardar el usuario actual
    const currentUser = auth.currentUser;

    // 2. Crear el nuevo usuario admin usando una instancia secundaria de auth
    const { user: newAdmin } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // 3. Actualizar el perfil del nuevo admin
    await updateProfile(newAdmin, { displayName });

    // 4. Crear documento en Firestore
    await setDoc(doc(db, "users", newAdmin.uid), {
      displayName,
      email,
      role: "admin",
      blocked: false,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid, // Registrar quién lo creó
    });

    // 5. Enviar email de verificación al nuevo admin
    await sendEmailVerification(newAdmin);

    // 6. Volver a iniciar sesión con el usuario actual si es necesario
    if (currentUser && currentUser.email) {
      try {
        await auth.updateCurrentUser(currentUser);
      } catch (error) {
        console.error("Error restaurando sesión actual:", error);
      }
    }

    return newAdmin;
  } catch (error) {
    console.error("Error creating admin:", error);
    throw error;
  }
}

/**
 * Actualiza la contraseña del usuario actual
 * Requiere reautenticación previa
 */
export async function updateCurrentUserPassword(currentPassword, newPassword) {
  try {
    if (!auth.currentUser) {
      throw new Error("No hay usuario autenticado");
    }

    // 1. Crear credencial para reautenticación
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword
    );

    // 2. Reautenticar usuario
    await reauthenticateWithCredential(auth.currentUser, credential);

    // 3. Actualizar contraseña en Firebase Auth
    await updatePassword(auth.currentUser, newPassword);

    // 4. Actualizar metadatos en Firestore
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      passwordLastChanged: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
}

/**
 * Elimina un admin (solo elimina de Firestore, no de Auth).
 */
export async function deleteAdmin(adminId) {
  await deleteDoc(doc(db, "users", adminId));
}

/**
 * Inicia sesión; requiere email verificado y usuario no bloqueado.
 */
export async function login({ email, password }) {
  try {
    // 1. Intentar autenticación
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // 2. Verificar datos en Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      await signOut(auth);
      throw new Error("user-not-found");
    }

    const userData = userDoc.data();

    // 3. Verificaciones de estado - ORDEN CORREGIDO
    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error("email-not-verified");
    }

    // Verificar bloqueo primero
    if (userData.blocked) {
      await signOut(auth);
      throw new Error("user-blocked");
    }

    // Luego verificar aprobación
    if (userData.pendingApproval) {
      await signOut(auth);
      throw new Error("pending-approval");
    }

    // 4. Registrar acceso exitoso y limpiar intentos fallidos
    await updateDoc(doc(db, "users", user.uid), {
      lastLogin: serverTimestamp(),
      lastLoginAttempt: serverTimestamp(),
      loginAttempts: 1, // Resetear contador
      lastLoginSuccess: true,
    });

    return {
      user: userCredential.user,
      userData, // Incluir datos de Firestore
    };
  } catch (error) {
    console.error("Login error:", error);

    // Manejar errores específicos
    if (error.message === "user-blocked") {
      throw new Error("user-blocked");
    }
    if (error.message === "pending-approval") {
      throw new Error("pending-approval");
    }
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      throw new Error("invalid-credentials");
    }

    throw error;
  }
}
/**
 * Cierra la sesión actual.
 */
export function logout() {
  return signOut(auth);
}

/**
 * Función auxiliar para bloquear/desbloquear un usuario
 * Solo debe ser usada por administradores
 */
export async function toggleUserBlockStatus(userId, blocked) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error("Usuario no encontrado");
    }

    const userData = userDoc.data();
    if (userData.role !== "student") {
      throw new Error("Solo se pueden bloquear estudiantes");
    }

    // Si está pendiente de aprobación, no permitir cambios
    if (userData.pendingApproval) {
      throw new Error(
        "No se puede modificar un usuario pendiente de aprobación"
      );
    }

    await updateDoc(userRef, {
      blocked,
      blockedAt: blocked ? serverTimestamp() : null,
      lastUpdated: serverTimestamp(),
      blockedBy: blocked ? auth.currentUser?.uid : null,
    });

    // Registrar en log de actividad
    await addDoc(collection(db, "activityLogs"), {
      type: blocked ? "STUDENT_BLOCKED" : "STUDENT_UNBLOCKED",
      userId,
      performedBy: auth.currentUser?.uid,
      timestamp: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error updating user block status:", error);
    throw error;
  }
}

/**
 * Función auxiliar para obtener datos del usuario desde Firestore
 */
export async function getUserData(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
}
