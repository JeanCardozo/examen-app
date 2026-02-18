import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getExams } from "../../../services/examService";
import {
  getUserAttempts,
  cleanupOrphanedAttempts,
} from "../../../services/attemptService";
import {
  Clock,
  Calendar,
  Book,
  Award,
  Users,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Activity,
} from "lucide-react";
import { SkeletonExamList, ErrorState } from "../../../components/ui";
import { auth, db } from "../../../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useCache } from "../../../contexts/CacheContext";
import { logger } from "../../../utils/logger";
import Swal from "sweetalert2";

export default function StudentExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userAttempts, setUserAttempts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const nav = useNavigate();

  // 🔥 FUNCIÓN CORREGIDA: Cargar exámenes con validación completa
  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Cargando exámenes...");

      // 🧹 LIMPIAR INTENTOS HUÉRFANOS PRIMERO
      if (auth.currentUser) {
        await cleanupOrphanedAttempts(auth.currentUser.uid);
      }

      const examData = await getExams();
      console.log("📊 Exámenes obtenidos:", examData);

      if (!examData || examData.length === 0) {
        console.log("❌ No se encontraron exámenes");
        setExams([]);
        return;
      }

      // 🔥 PROCESAMIENTO MEJORADO DE EXÁMENES
      const processedExams = examData
        .map((exam) => {
          // Validar estructura del examen
          if (!exam || !exam.id || !exam.title) {
            console.warn("❌ Examen inválido:", exam);
            return null;
          }

          // Procesar fecha límite correctamente
          let processedDeadline = null;
          if (exam.deadline) {
            if (exam.deadline.toDate) {
              processedDeadline = exam.deadline.toDate();
            } else if (exam.deadline instanceof Date) {
              processedDeadline = exam.deadline;
            } else {
              processedDeadline = new Date(exam.deadline);
            }
          }

          return {
            ...exam,
            deadline: processedDeadline,
            subjectList: Array.isArray(exam.subjectList)
              ? exam.subjectList
              : [],
            questionRefs: Array.isArray(exam.questionRefs)
              ? exam.questionRefs
              : [],
            maxAttempts: exam.maxAttempts || 1,
            timeLimit: exam.timeLimit || 60,
          };
        })
        .filter(Boolean); // Filtrar exámenes nulos

      console.log("✅ Exámenes procesados:", processedExams.length);

      // 🔥 CARGAR INTENTOS CON INFORMACIÓN COMPLETA Y ACTUALIZADA
      const attemptsMap = {};
      if (auth.currentUser) {
        for (const exam of processedExams) {
          try {
            const attempts = await getUserAttempts(
              auth.currentUser.uid,
              exam.id
            );

            // 🔥 PROCESAMIENTO CORRECTO DE INTENTOS
            const processedAttempts = attempts.map((attempt) => {
              // Calcular porcentaje si existe scoreBySubject
              let percentage = 0;
              if (
                attempt.scoreBySubject &&
                Object.keys(attempt.scoreBySubject).length > 0
              ) {
                const totals = Object.values(attempt.scoreBySubject);
                const totalCorrect = totals.reduce(
                  (sum, subj) => sum + subj.correct,
                  0
                );
                const totalQuestions = totals.reduce(
                  (sum, subj) => sum + subj.total,
                  0
                );
                percentage =
                  totalQuestions > 0
                    ? Math.round((totalCorrect / totalQuestions) * 100)
                    : 0;
              }

              return {
                ...attempt,
                percentage,
                examTitle: exam.title,
                createdAt: attempt.createdAt?.toDate
                  ? attempt.createdAt.toDate()
                  : new Date(attempt.createdAt || Date.now()),
              };
            });

            // Solo incluir intentos finalizados o abortados para el historial visual
            const completedAttempts = processedAttempts.filter(
              (att) => att.status === "finished" || att.status === "aborted"
            );

            attemptsMap[exam.id] = processedAttempts; // Todos los intentos para validación
            console.log(`📝 Intentos para ${exam.title}:`, {
              total: processedAttempts.length,
              completed: completedAttempts.length,
              finished: processedAttempts.filter(
                (att) => att.status === "finished"
              ).length,
              aborted: processedAttempts.filter(
                (att) => att.status === "aborted"
              ).length,
            });
          } catch (attemptError) {
            console.warn(
              `⚠️ Error cargando intentos para ${exam.title}:`,
              attemptError
            );
            attemptsMap[exam.id] = [];
          }
        }
      }

      // 🔥 CARGAR NOMBRES DE MATERIAS CON VALIDACIÓN
      const examsWithSubjects = await Promise.all(
        processedExams.map(async (exam) => {
          if (exam.subjectList?.length > 0) {
            const subjectDocs = await Promise.all(
              exam.subjectList.map(async (subjectId) => {
                try {
                  const subjectDoc = await getDoc(
                    doc(db, "subjects", subjectId)
                  );
                  return subjectDoc.exists() ? subjectDoc.data().name : null;
                } catch (error) {
                  console.warn(`Error cargando materia ${subjectId}:`, error);
                  return null;
                }
              })
            );
            return {
              ...exam,
              subjectNames: subjectDocs.filter(Boolean),
            };
          }
          return {
            ...exam,
            subjectNames: [],
          };
        })
      );

      setUserAttempts(attemptsMap);
      setExams(examsWithSubjects);
      console.log(
        "🎉 Exámenes cargados exitosamente:",
        examsWithSubjects.length
      );
    } catch (err) {
      console.error("❌ Error fetching exams:", err);
      setError("No se pudieron cargar los exámenes. Inténtalo de nuevo.");
      setExams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // 🔥 FUNCIÓN CORREGIDA: Verificar estado del examen
  const getExamStatus = useCallback(
    (exam) => {
      if (!exam.deadline) {
        return {
          status: "available",
          message: "Sin fecha límite",
          color: "blue",
        };
      }

      const now = new Date();
      const deadline = new Date(exam.deadline);

      if (deadline <= now) {
        return { status: "expired", message: "Examen vencido", color: "gray" };
      }

      // 🔥 VERIFICAR INTENTOS DEL USUARIO - INCLUYENDO ABORTADOS
      const attempts = userAttempts[exam.id] || [];

      // ✅ CONTAR TANTO INTENTOS TERMINADOS COMO ABORTADOS
      const consumedAttempts = attempts.filter(
        (att) => att.status === "finished" || att.status === "aborted"
      ).length;

      console.log(
        `📊 Examen ${exam.id} - Intentos consumidos: ${consumedAttempts}/${exam.maxAttempts}`,
        {
          total: attempts.length,
          finished: attempts.filter((att) => att.status === "finished").length,
          aborted: attempts.filter((att) => att.status === "aborted").length,
          inProgress: attempts.filter((att) => att.status === "in-progress")
            .length,
        }
      );

      if (consumedAttempts >= exam.maxAttempts) {
        return {
          status: "completed",
          message: `Límite alcanzado (${consumedAttempts}/${exam.maxAttempts})`,
          color: "red",
        };
      }

      // Verificar si hay un intento en progreso
      const inProgressAttempt = attempts.find(
        (att) => att.status === "in-progress"
      );
      if (inProgressAttempt) {
        return {
          status: "in-progress",
          message: "Examen en progreso",
          color: "orange",
        };
      }

      return {
        status: "available",
        message: `Disponible (${consumedAttempts}/${exam.maxAttempts} intentos)`,
        color: "blue",
      };
    },
    [userAttempts]
  );

  // 🔥 FUNCIÓN CORREGIDA: Manejar click en examen CON NAVEGACIÓN CORRECTA
  const handleExamClick = useCallback(
    (exam) => {
      const examStatus = getExamStatus(exam);

      if (examStatus.status === "expired") {
        Swal.fire({
          icon: "error",
          title: "Examen vencido",
          text: "Este examen ya no está disponible.",
          confirmButtonColor: "#EF4444",
        });
        return;
      }

      if (examStatus.status === "completed") {
        // 🔥 MOSTRAR DETALLES DE INTENTOS CONSUMIDOS
        const attempts = userAttempts[exam.id] || [];
        const finishedAttempts = attempts.filter(
          (att) => att.status === "finished"
        );
        const abortedAttempts = attempts.filter(
          (att) => att.status === "aborted"
        );

        Swal.fire({
          icon: "warning",
          title: "Límite de intentos alcanzado",
          html: `
          <div class="text-left">
            <p class="mb-3">Has agotado todos los intentos para este examen.</p>
            <div class="bg-gray-50 p-4 rounded-lg mb-3">
              <p class="text-sm text-gray-700"><strong>Resumen de intentos:</strong></p>
              <ul class="text-sm text-gray-600 mt-2">
                <li>✅ <strong>Completados:</strong> ${
                  finishedAttempts.length
                }</li>
                <li>❌ <strong>Abortados por seguridad:</strong> ${
                  abortedAttempts.length
                }</li>
                <li>📊 <strong>Total usado:</strong> ${
                  finishedAttempts.length + abortedAttempts.length
                }/${exam.maxAttempts}</li>
              </ul>
            </div>
            ${
              finishedAttempts.length > 0
                ? '<p class="text-green-600 text-sm">Puedes ver los resultados de tus intentos completados.</p>'
                : '<p class="text-red-600 text-sm">No tienes intentos completados para revisar.</p>'
            }
          </div>
        `,
          showCancelButton: finishedAttempts.length > 0,
          confirmButtonText:
            finishedAttempts.length > 0 ? "Ver Resultados" : "Entendido",
          cancelButtonText: "Cerrar",
          confirmButtonColor: "#3B82F6",
        }).then((result) => {
          if (result.isConfirmed && finishedAttempts.length > 0) {
            // Ir al resultado del último intento completado
            const lastFinishedAttempt = finishedAttempts.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            )[0];
            nav(`/results/${lastFinishedAttempt.id}`);
          }
        });
        return;
      }

      if (examStatus.status === "in-progress") {
        Swal.fire({
          icon: "info",
          title: "Examen en progreso",
          text: "Ya tienes un intento en progreso para este examen.",
          confirmButtonColor: "#3B82F6",
        });
        return;
      }

      // 🔥 NAVEGACIÓN CORREGIDA - Usar la ruta correcta
      console.log("🚀 Navegando al examen:", `/exam/${exam.id}`);
      nav(`/exam/${exam.id}`);
    },
    [userAttempts, getExamStatus, nav]
  );

  // Función para refrescar
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExams();
  }, [fetchExams]);

  // Obtener color de dificultad
  const getDifficultyInfo = useCallback((exam) => {
    const questionCount = exam.questionRefs?.length || 0;
    if (questionCount >= 50) {
      return { color: "text-red-600 bg-red-50", label: "Alto" };
    } else if (questionCount >= 25) {
      return { color: "text-orange-600 bg-orange-50", label: "Medio" };
    }
    return { color: "text-green-600 bg-green-50", label: "Básico" };
  }, []);

  // 🔥 FUNCIÓN CORREGIDA: Formatear tiempo restante
  const getTimeRemaining = useCallback((deadline) => {
    if (!deadline) return "Sin límite";

    const now = new Date();
    const end = deadline instanceof Date ? deadline : new Date(deadline);
    const diff = end - now;

    if (diff <= 0) return "Vencido";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return "< 1m";
  }, []);

  // Loading state con skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8 animate-pulse">
            <div className="h-10 bg-gray-200 rounded-lg w-64 mb-3"></div>
            <div className="h-5 bg-gray-200 rounded w-48"></div>
          </div>

          {/* Exams skeleton grid */}
          <SkeletonExamList count={4} />
        </div>
      </div>
    );
  }

  // Error state mejorado
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 p-6">
        <div className="max-w-2xl mx-auto pt-12">
          <ErrorState
            type="network"
            title="Error al cargar exámenes"
            description={error}
            onRetry={handleRefresh}
            onGoBack={() => nav("/student")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header mejorado */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
              📚 Mis Exámenes
            </h1>
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">
                  {exams.length} examen{exams.length !== 1 ? "es" : ""}{" "}
                  disponible{exams.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <span className="text-sm">
                  {Object.values(userAttempts).reduce(
                    (total, attempts) =>
                      total +
                      attempts.filter(
                        (att) =>
                          att.status === "finished" || att.status === "aborted"
                      ).length,
                    0
                  )}{" "}
                  intento
                  {Object.values(userAttempts).reduce(
                    (total, attempts) =>
                      total +
                      attempts.filter(
                        (att) =>
                          att.status === "finished" || att.status === "aborted"
                      ).length,
                    0
                  ) !== 1
                    ? "s"
                    : ""}{" "}
                  completado
                  {Object.values(userAttempts).reduce(
                    (total, attempts) =>
                      total +
                      attempts.filter(
                        (att) =>
                          att.status === "finished" || att.status === "aborted"
                      ).length,
                    0
                  ) !== 1
                    ? "s"
                    : ""}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              👤 {auth.currentUser?.email}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              onClick={() => nav("/student")}
              className="px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition font-medium shadow-md"
            >
              ← Volver al Panel
            </button>
          </div>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="bg-gradient-to-br from-blue-50 to-yellow-50 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6">
              <Book className="w-16 h-16 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-700 mb-3">
              📋 No hay exámenes disponibles
            </h2>
            <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
              Actualmente no hay exámenes asignados. Contacta a tu profesor o
              revisa más tarde.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition font-medium shadow-lg disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Actualizando..." : "Actualizar"}
              </button>
              <button
                onClick={() => nav("/student")}
                className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition font-medium shadow-lg"
              >
                Volver al Panel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {exams.map((exam) => {
              const examStatus = getExamStatus(exam);
              const attempts = userAttempts[exam.id] || [];
              const finishedAttempts = attempts.filter(
                (att) => att.status === "finished"
              );
              const difficultyInfo = getDifficultyInfo(exam);
              const timeRemaining = getTimeRemaining(exam.deadline);

              return (
                <div
                  key={exam.id}
                  className={`group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden hover:scale-[1.02] ${
                    examStatus.status === "expired" ? "opacity-60" : ""
                  }`}
                >
                  {/* Header del examen con gradiente dinámico */}
                  <div
                    className={`p-6 text-white relative overflow-hidden ${
                      examStatus.status === "available"
                        ? "bg-gradient-to-r from-blue-600 to-blue-700"
                        : examStatus.status === "completed"
                        ? "bg-gradient-to-r from-green-600 to-green-700"
                        : examStatus.status === "in-progress"
                        ? "bg-gradient-to-r from-orange-600 to-orange-700"
                        : "bg-gradient-to-r from-gray-600 to-gray-700"
                    }`}
                  >
                    {/* Elementos decorativos */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-12 -translate-x-12"></div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 pr-4">
                          <h3 className="text-2xl font-bold mb-2 leading-tight">
                            {exam.title}
                          </h3>
                          {exam.description && (
                            <p className="text-blue-100 text-sm leading-relaxed opacity-90">
                              {exam.description}
                            </p>
                          )}
                        </div>
                        <Award className="w-10 h-10 text-yellow-300 flex-shrink-0" />
                      </div>

                      {/* 🔥 BADGES CORREGIDOS CON MEJOR ESPACIADO */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-3 py-1 text-sm font-medium">
                          <Clock className="w-4 h-4" />
                          <span className="whitespace-nowrap">
                            {examStatus.message}
                          </span>
                        </div>
                        {finishedAttempts.length > 0 && (
                          <div className="inline-flex items-center gap-2 bg-yellow-400 bg-opacity-30 rounded-full px-3 py-1 text-sm font-medium">
                            📝 {finishedAttempts.length} intento
                            {finishedAttempts.length !== 1 ? "s" : ""}
                          </div>
                        )}
                        <div
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-white bg-opacity-20`}
                        >
                          <span className="whitespace-nowrap">
                            {difficultyInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 🔥 CONTENIDO CORREGIDO CON MEJOR LAYOUT */}
                  <div className="p-6">
                    {/* Estadísticas principales */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            Duración
                          </span>
                        </div>
                        <span className="text-xl font-bold text-blue-900">
                          {exam.timeLimit} min
                        </span>
                      </div>

                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Award className="w-5 h-5 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            Intentos
                          </span>
                        </div>
                        <span className="text-xl font-bold text-yellow-900">
                          {
                            attempts.filter(
                              (att) =>
                                att.status === "finished" ||
                                att.status === "aborted"
                            ).length
                          }
                          /{exam.maxAttempts}
                        </span>
                      </div>
                    </div>

                    {/* 🔥 INFORMACIÓN DETALLADA CON LAYOUT MEJORADO */}
                    <div className="space-y-4 mb-6">
                      {/* Fecha límite con mejor formato */}
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-sm text-gray-600">
                              <strong>Fecha límite:</strong>{" "}
                              {exam.deadline
                                ? exam.deadline.toLocaleDateString("es-ES", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Sin límite"}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                                timeRemaining === "Vencido"
                                  ? "bg-red-100 text-red-700"
                                  : timeRemaining.includes("d")
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {timeRemaining}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Book className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600">
                          <strong>Materias:</strong>{" "}
                          {exam.subjectNames?.length > 0
                            ? exam.subjectNames.join(", ")
                            : "No especificadas"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600">
                          <strong>Preguntas:</strong>{" "}
                          {exam.questionRefs?.length || 0}
                        </span>
                      </div>
                    </div>

                    {/* 🔥 HISTORIAL DE INTENTOS MEJORADO */}
                    {finishedAttempts.length > 0 && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          📊 Historial de intentos
                          <span className="text-xs text-gray-500">
                            ({finishedAttempts.length} completado
                            {finishedAttempts.length !== 1 ? "s" : ""})
                          </span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {finishedAttempts
                            .slice(0, 4)
                            .map((attempt, index) => (
                              <div
                                key={attempt.id}
                                className={`text-xs px-3 py-1 rounded-full font-medium border ${
                                  attempt.status === "finished"
                                    ? (attempt.percentage || 0) >= 70
                                      ? "bg-green-100 text-green-700 border-green-200"
                                      : "bg-red-100 text-red-700 border-red-200"
                                    : "bg-gray-100 text-gray-700 border-gray-200"
                                }`}
                                title={`Intento ${index + 1}: ${
                                  attempt.status === "finished"
                                    ? (attempt.percentage || 0) + "%"
                                    : "Abortado"
                                } - ${attempt.createdAt?.toLocaleDateString()}`}
                              >
                                #{index + 1}:{" "}
                                {attempt.status === "finished"
                                  ? (attempt.percentage || 0) + "%"
                                  : "Abortado"}
                              </div>
                            ))}
                          {finishedAttempts.length > 4 && (
                            <div className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">
                              +{finishedAttempts.length - 4} más
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 🔥 BOTÓN DE ACCIÓN PRINCIPAL MEJORADO */}
                    <button
                      onClick={() => handleExamClick(exam)}
                      disabled={examStatus.status === "expired"}
                      className={`w-full py-4 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl group-hover:scale-105 transform ${
                        examStatus.status === "available"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                          : examStatus.status === "completed"
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                          : examStatus.status === "in-progress"
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                          : "bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed opacity-60"
                      } disabled:hover:scale-100`}
                    >
                      <span className="text-lg">
                        {examStatus.status === "available"
                          ? "🚀 Iniciar Examen"
                          : examStatus.status === "completed"
                          ? "📊 Ver Resultados"
                          : examStatus.status === "in-progress"
                          ? "📝 Continuar Examen"
                          : "🚫 Examen Vencido"}
                      </span>
                      {examStatus.status !== "expired" && (
                        <Award className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
