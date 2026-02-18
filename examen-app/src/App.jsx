import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import PageLoader from "./components/PageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { CacheProvider } from "./contexts/CacheContext";
import { ToastProvider } from "./contexts/ToastContext";
import { logger } from "./utils/logger";

// Importar seguridad (se auto-inicializa)
import "./utils/security";

// Lazy load de páginas - Admin
const LayoutAdmin = lazy(() => import("./pages/admin/Layout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageQuestions = lazy(() => import("./pages/admin/ManageQuestions"));
const CreateExam = lazy(() => import("./pages/admin/CreateExam"));
const ManageAdmins = lazy(() => import("./pages/admin/ManageAdmins"));
const ViewAttempts = lazy(() => import("./pages/admin/ViewAttempts"));
const BlockStudent = lazy(() => import("./pages/admin/BlockStudent"));
const ManageSubjects = lazy(() => import("./pages/admin/ManageSubjects"));

// Lazy load de páginas - Student
const LayoutStudent = lazy(() => import("./pages/Student/Layout"));
const StudentDashboard = lazy(() => import("./pages/Student/StudentDashboard"));
const StudentExams = lazy(() => import("./pages/Student/exams/StudentExams"));
const StudentProgress = lazy(() => import("./pages/Student/progress/StudentProgress"));
const StudentHistory = lazy(() => import("./pages/Student/history/StudentHistory"));
const Exam = lazy(() => import("./pages/Student/exams/Exam"));
const Results = lazy(() => import("./pages/Student/exams/Results"));

// Páginas públicas (cargar eager por ser entry points principales)
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";

// 404 lazy load
const NotFound = lazy(() => import("./components/NotFound"));

export default function App() {
  React.useEffect(() => {
    // Log de inicialización
    logger.info("PI.ICS - Aplicación iniciada", {
      version: import.meta.env.VITE_APP_VERSION || "1.5.0",
      env: import.meta.env.VITE_APP_ENV || "development",
    });

    // Configurar título
    document.title = "PI.ICS - Plataforma Educativa";

    // Prevenir iframe embedding
    if (window !== window.top) {
      window.top.location = window.location;
    }

    // Información de la aplicación (solo en desarrollo)
    if (import.meta.env.DEV) {
      console.log(`
        🎓 PI.ICS - Plataforma Educativa de Excelencia
        📧 Soporte técnico: wlaverde5@gmail.com
        📞 Teléfono: +57 312 4473537
        🌐 Web: https://examenes-c84bf.web.app

        Transformando el aprendizaje, un examen a la vez.
      `);
    }
  }, []);

  return (
    <ErrorBoundary>
      <div className="App">
        <AuthProvider>
        <CacheProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Ruta raíz redirige al login */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Rutas públicas */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Rutas Admin */}
                <Route
                  path="/admin"
                  element={
                    <PrivateRoute allowedRoles={["admin"]}>
                      <LayoutAdmin />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="create-exam" element={<CreateExam />} />
                  <Route path="questions" element={<ManageQuestions />} />
                  <Route path="admins" element={<ManageAdmins />} />
                  <Route path="attempts" element={<ViewAttempts />} />
                  <Route path="block-student" element={<BlockStudent />} />
                  <Route path="subjects" element={<ManageSubjects />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Rutas Estudiante */}
                <Route
                  path="/student"
                  element={
                    <PrivateRoute allowedRoles={["student"]}>
                      <LayoutStudent />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<StudentDashboard />} />
                  <Route path="exams" element={<StudentExams />} />
                  <Route path="progress" element={<StudentProgress />} />
                  <Route path="history" element={<StudentHistory />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Rutas de examen independientes */}
                <Route
                  path="/exam/:examId"
                  element={
                    <PrivateRoute allowedRoles={["student"]}>
                      <Exam />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/results/:attemptId"
                  element={
                    <PrivateRoute allowedRoles={["student"]}>
                      <Results />
                    </PrivateRoute>
                  }
                />

                {/* Catch-all para rutas no encontradas */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </ToastProvider>
          </CacheProvider>
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}
