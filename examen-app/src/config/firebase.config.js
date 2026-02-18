/**
 * @fileoverview Configuración de Firebase desde variables de entorno
 * Centraliza la configuración y valida variables requeridas
 */

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
];

// Validar variables requeridas en desarrollo
if (import.meta.env.DEV) {
  const missing = requiredEnvVars.filter(varName => !import.meta.env[varName]);
  if (missing.length > 0) {
    console.error(`Variables de entorno faltantes: ${missing.join(', ')}`);
    console.error('Crea un archivo .env.development con las variables necesarias');
  }
}

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const appConfig = {
  name: import.meta.env.VITE_APP_NAME || 'PI.ICS',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  env: import.meta.env.VITE_APP_ENV || 'development',
};

export const isProduction = import.meta.env.VITE_APP_ENV === 'production';
export const isDevelopment = import.meta.env.VITE_APP_ENV === 'development' || import.meta.env.DEV;
