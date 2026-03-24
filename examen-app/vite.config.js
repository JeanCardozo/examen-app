import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "./",

  // Aliases para imports más limpios
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@contexts": path.resolve(__dirname, "./src/contexts"),
      "@pages": path.resolve(__dirname, "./src/pages"),
    },
  },

  // Configuración del servidor de desarrollo
  server: {
    port: 3000,
    host: '127.0.0.1',
    strictPort: false,
    open: false,
  },

  // Preview del build
  preview: {
    port: 4173,
  },

  // Optimizaciones de build
  build: {
    // Generar source maps solo en desarrollo
    sourcemap: mode !== "production",

    // Límite de advertencia de chunks
    chunkSizeWarningLimit: 600,

    // Configuración de Rollup
    rollupOptions: {
      output: {
        // Code splitting manual para mejor caching
        manualChunks: {
          // Vendor: React y Router
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // Firebase (separado por ser pesado)
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
          ],

          // Librerías de UI
          "vendor-ui": ["lucide-react", "sweetalert2"],

          // Charts (solo se usa en algunas vistas)
          "vendor-charts": ["recharts"],
        },
      },
    },

    // Opciones de minificación
    minify: "terser",
    terserOptions: {
      compress: {
        // Eliminar console.log en producción
        drop_console: mode === "production",
        drop_debugger: mode === "production",
      },
    },
  },

  // Optimizaciones de dependencias
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
    ],
  },
}));
