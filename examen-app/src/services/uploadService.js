import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

class UploadService {
  constructor() {
    this.storage = getStorage();
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    this.allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg"];
  }

  // 🔍 VERIFICAR SI EL USUARIO ES ADMINISTRADOR
  async isUserAdmin() {
    try {
      if (!auth.currentUser) {
        return false;
      }

      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      return userData.role === "admin";
    } catch (error) {
      console.error("Error verificando rol de administrador:", error);
      return false;
    }
  }

  // 🔍 VALIDAR ARCHIVO
  validateFile(file, type) {
    if (!file) {
      throw new Error("No se ha seleccionado ningún archivo");
    }

    // Validar tamaño
    if (file.size > this.maxFileSize) {
      throw new Error("El archivo es demasiado grande. Máximo 10MB permitido");
    }

    // Validar tipo según el tipo de pregunta
    if (type === "image" && !this.allowedImageTypes.includes(file.type)) {
      throw new Error(
        "Tipo de imagen no válido. Solo se permiten JPEG, PNG, GIF y WebP"
      );
    }

    if (type === "video" && !this.allowedVideoTypes.includes(file.type)) {
      throw new Error(
        "Tipo de video no válido. Solo se permiten MP4, WebM y OGG"
      );
    }

    return true;
  }

  // 📤 SUBIR ARCHIVO DE PREGUNTA CON VERIFICACIÓN MEJORADA
  async uploadQuestionFile(file, questionType) {
    try {
      // 1. Verificar autenticación
      if (!auth.currentUser) {
        throw new Error("Usuario no autenticado");
      }

      console.log("👤 Usuario actual:", auth.currentUser.uid);
      console.log("📧 Email:", auth.currentUser.email);

      // 2. Verificar que es administrador
      const isAdmin = await this.isUserAdmin();
      console.log("🎭 Es administrador:", isAdmin);

      if (!isAdmin) {
        throw new Error(
          "Solo los administradores pueden subir archivos multimedia"
        );
      }

      // 3. Validar archivo
      this.validateFile(file, questionType);

      // 4. Generar nombre único con timestamp más específico
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${timestamp}_${randomId}_${sanitizedName}`;

      // 5. Crear referencia con path más específico
      const filePath = `questions/${questionType}/${fileName}`;
      const fileRef = ref(this.storage, filePath);

      console.log("🔄 Subiendo archivo:", filePath);

      // 6. Preparar metadata completa
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: auth.currentUser.uid,
          uploaderEmail: auth.currentUser.email,
          questionType: questionType,
          originalName: file.name,
          uploadDate: new Date().toISOString(),
          fileSize: file.size.toString(),
        },
      };

      // 7. Subir archivo
      const snapshot = await uploadBytes(fileRef, file, metadata);
      console.log("✅ Archivo subido exitosamente a:", snapshot.ref.fullPath);

      // 8. Obtener URL de descarga
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("🔗 URL obtenida:", downloadURL);

      return {
        url: downloadURL,
        path: snapshot.ref.fullPath,
        name: fileName,
        size: file.size,
        type: file.type,
        questionType: questionType,
      };
    } catch (error) {
      console.error("❌ Error completo subiendo archivo:", error);

      // Mensajes de error más específicos
      if (error.code === "storage/unauthorized") {
        throw new Error(
          "Error de permisos de Firebase Storage. Verifica que las reglas estén correctamente configuradas."
        );
      } else if (error.code === "storage/invalid-format") {
        throw new Error("Formato de archivo no válido");
      } else if (error.code === "storage/object-not-found") {
        throw new Error("No se pudo completar la subida del archivo");
      } else if (error.code === "permission-denied") {
        throw new Error("Permisos insuficientes para subir archivos");
      } else if (error.message.includes("administrador")) {
        throw new Error(error.message);
      } else {
        throw new Error(
          `Error al subir archivo: ${error.message || "Error desconocido"}`
        );
      }
    }
  }

  // 🗑️ ELIMINAR ARCHIVO
  async deleteFile(filePath) {
    try {
      if (!auth.currentUser) {
        console.warn("Usuario no autenticado para eliminar archivo");
        return;
      }

      const isAdmin = await this.isUserAdmin();
      if (!isAdmin) {
        console.warn("Usuario no es administrador, no puede eliminar archivos");
        return;
      }

      const fileRef = ref(this.storage, filePath);
      await deleteObject(fileRef);
      console.log("🗑️ Archivo eliminado:", filePath);
    } catch (error) {
      console.error("❌ Error eliminando archivo:", error);
      // No lanzar error para no bloquear otras operaciones
    }
  }
}

// Exportar instancia singleton
const uploadService = new UploadService();
export default uploadService;
