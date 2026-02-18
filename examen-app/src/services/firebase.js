import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig, isProduction } from "../config/firebase.config";
import { logger } from "../utils/logger";

// Validaciones de seguridad
if (isProduction) {
  // Solo prevenir iframe embedding en producción
  if (window !== window.top) {
    logger.warn("Aplicación no puede ejecutarse en iframe");
    window.top.location = window.location;
  }
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Log de inicialización
logger.info("Firebase inicializado correctamente", {
  projectId: firebaseConfig.projectId,
  env: isProduction ? 'production' : 'development'
});

export default app;
