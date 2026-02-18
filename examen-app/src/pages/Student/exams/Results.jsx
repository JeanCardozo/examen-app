import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAttemptById } from "../../../services/attemptService";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../services/firebase";
import Spinner from "../../../components/Spinner";
import {
  Trophy,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Target,
  Shield,
  ArrowLeft,
  Star,
  TrendingUp,
  Award,
  BarChart3,
  Eye,
  AlertTriangle,
  Home,
  RefreshCw,
  Calendar,
  User,
  FileText,
  Activity,
} from "lucide-react";

// Configuración de estados y mensajes
const statusConfig = {
  finished: {
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
    label: "Completado Exitosamente",
    message: "Examen finalizado correctamente",
  },
  aborted: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertTriangle,
    label: "Finalizado por Seguridad",
    message:
      "El examen fue terminado automáticamente por violaciones de seguridad",
  },
};

export default function Results() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔍 Cargando resultados para attemptId:", attemptId);

        // Obtener el intento completo
        const attemptData = await getAttemptById(attemptId);
        console.log("📊 Datos del intento:", attemptData);

        if (!attemptData) {
          throw new Error("No se encontraron los resultados del examen");
        }

        // Obtener información completa del examen
        let examInfo = null;
        if (attemptData.examId) {
          try {
            const examDoc = await getDoc(doc(db, "exams", attemptData.examId));
            if (examDoc.exists()) {
              examInfo = { id: examDoc.id, ...examDoc.data() };
              console.log("📋 Información del examen cargada:", examInfo.title);
            }
          } catch (examError) {
            console.warn(
              "⚠️ Error cargando información del examen:",
              examError
            );
          }
        }

        // 🔧 PROCESAR INFORMACIÓN DE MATERIAS CON SINCRONIZACIÓN PERFECTA
        const processedScoreBySubject = {};
        if (attemptData.scoreBySubject) {
          for (const [subjectId, score] of Object.entries(
            attemptData.scoreBySubject
          )) {
            try {
              // Verificar si ya tiene el nombre de la materia
              let subjectName = score.subjectName;

              // Si no tiene nombre, buscarlo en Firestore
              if (!subjectName || subjectName.includes("Materia ")) {
                try {
                  const subjectDoc = await getDoc(
                    doc(db, "subjects", subjectId)
                  );
                  if (subjectDoc.exists()) {
                    subjectName = subjectDoc.data().name;
                  } else {
                    subjectName = `Materia ${subjectId}`;
                  }
                } catch (subjectError) {
                  console.warn(
                    `⚠️ Error cargando materia ${subjectId}:`,
                    subjectError
                  );
                  subjectName = `Materia ${subjectId}`;
                }
              }

              processedScoreBySubject[subjectId] = {
                ...score,
                subjectName,
                percentage:
                  score.total > 0
                    ? Math.round((score.correct / score.total) * 100)
                    : 0,
              };
            } catch (subjectError) {
              console.warn(
                `⚠️ Error procesando materia ${subjectId}:`,
                subjectError
              );
              processedScoreBySubject[subjectId] = {
                ...score,
                subjectName: `Materia ${subjectId}`,
                percentage:
                  score.total > 0
                    ? Math.round((score.correct / score.total) * 100)
                    : 0,
              };
            }
          }
        }

        // 🔧 PROCESAR DETALLES DE PREGUNTAS CON DATOS COMPLETOS DE FIRESTORE
        const processedQuestionDetails = [];
        if (
          attemptData.detailPerQuestion &&
          Array.isArray(attemptData.detailPerQuestion)
        ) {
          for (let i = 0; i < attemptData.detailPerQuestion.length; i++) {
            const questionDetail = attemptData.detailPerQuestion[i];
            try {
              let fullQuestionData = { ...questionDetail };

              // 🎯 OBTENER PREGUNTA COMPLETA DE FIRESTORE PARA RESPUESTAS CORRECTAS
              if (questionDetail.questionId) {
                try {
                  const questionDoc = await getDoc(
                    doc(db, "questions", questionDetail.questionId)
                  );
                  if (questionDoc.exists()) {
                    const qData = questionDoc.data();

                    // Combinar datos del intento con datos actuales de Firestore
                    fullQuestionData = {
                      ...questionDetail,
                      text:
                        questionDetail.questionText ||
                        qData.text ||
                        "Sin texto",
                      options: qData.options || questionDetail.options || [],
                      explanation:
                        qData.explanation || questionDetail.explanation || null,
                      correctAnswers: qData.correctAnswers, // 🎯 SIEMPRE USAR DATOS ACTUALES
                      type:
                        qData.type || questionDetail.type || "multiple-choice",
                    };
                  }
                } catch (questionError) {
                  console.warn(
                    `⚠️ Error cargando pregunta ${questionDetail.questionId}:`,
                    questionError
                  );
                }
              }

              // Obtener nombre de la materia
              let subjectName = questionDetail.subjectName;
              if (!subjectName && questionDetail.subject) {
                try {
                  const subjectDoc = await getDoc(
                    doc(db, "subjects", questionDetail.subject)
                  );
                  if (subjectDoc.exists()) {
                    subjectName = subjectDoc.data().name;
                  }
                } catch (subjectError) {
                  console.warn(
                    `⚠️ Error cargando materia ${questionDetail.subject}:`,
                    subjectError
                  );
                }
              }

              // 🎯 FORMATEAR RESPUESTAS CORRECTAS SEGÚN TIPO
              const formatCorrectAnswers = (correctAnswers, type) => {
                if (!correctAnswers && correctAnswers !== false)
                  return "No definida";

                if (Array.isArray(correctAnswers)) {
                  if (correctAnswers.length === 0) return "No definida";
                  return correctAnswers.join(", ");
                }

                // Para true-false, normalizar la visualización
                if (type === "true-false") {
                  if (
                    correctAnswers === true ||
                    correctAnswers === "true" ||
                    correctAnswers === "Verdadero"
                  ) {
                    return "Verdadero";
                  }
                  if (
                    correctAnswers === false ||
                    correctAnswers === "false" ||
                    correctAnswers === "Falso"
                  ) {
                    return "Falso";
                  }
                }

                return correctAnswers.toString();
              };

              // 🎯 FORMATEAR RESPUESTA SELECCIONADA
              const formatSelectedAnswer = (selectedAnswer, type) => {
                if (!selectedAnswer && selectedAnswer !== false)
                  return "Sin respuesta";

                if (Array.isArray(selectedAnswer)) {
                  if (selectedAnswer.length === 0) return "Sin respuesta";
                  return selectedAnswer.join(", ");
                }

                // Para true-false, normalizar la visualización
                if (type === "true-false") {
                  if (
                    selectedAnswer === true ||
                    selectedAnswer === "true" ||
                    selectedAnswer === "Verdadero"
                  ) {
                    return "Verdadero";
                  }
                  if (
                    selectedAnswer === false ||
                    selectedAnswer === "false" ||
                    selectedAnswer === "Falso"
                  ) {
                    return "Falso";
                  }
                }

                return selectedAnswer.toString();
              };

              processedQuestionDetails.push({
                ...fullQuestionData,
                questionNumber: i + 1,
                subjectName: subjectName || "Materia no identificada",
                correctAnswersText: formatCorrectAnswers(
                  fullQuestionData.correctAnswers,
                  fullQuestionData.type
                ),
                selectedAnswerText: formatSelectedAnswer(
                  fullQuestionData.selectedAnswer,
                  fullQuestionData.type
                ),
              });
            } catch (questionError) {
              console.warn(
                "⚠️ Error procesando detalle de pregunta:",
                questionError
              );
              processedQuestionDetails.push({
                ...questionDetail,
                questionNumber: i + 1,
                subjectName:
                  questionDetail.subjectName || "Materia no identificada",
                correctAnswersText: "Error al cargar",
                selectedAnswerText:
                  questionDetail.selectedAnswer || "Sin respuesta",
              });
            }
          }
        }

        const processedData = {
          ...attemptData,
          scoreBySubject: processedScoreBySubject,
          detailPerQuestion: processedQuestionDetails,
        };

        setData(processedData);
        setExamData(examInfo);

        console.log("✅ Resultados procesados correctamente:", {
          totalQuestions: processedQuestionDetails.length,
          subjects: Object.keys(processedScoreBySubject).length,
          status: processedData.status,
          hasExamInfo: !!examInfo,
        });
      } catch (err) {
        console.error("❌ Error cargando resultados:", err);
        setError(err.message || "No se pudieron cargar los resultados");
      } finally {
        setLoading(false);
      }
    };

    if (attemptId) {
      fetchResults();
    }
  }, [attemptId]);

  // Funciones auxiliares optimizadas
  const getTotalStats = () => {
    if (!data?.scoreBySubject) return { correct: 0, total: 0, percentage: 0 };

    const stats = Object.values(data.scoreBySubject).reduce(
      (acc, subject) => ({
        correct: acc.correct + (subject.correct || 0),
        total: acc.total + (subject.total || 0),
      }),
      { correct: 0, total: 0 }
    );

    return {
      ...stats,
      percentage:
        stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    };
  };

  const getTimeSpent = () => {
    // Priorizar duration calculado
    if (data?.duration && data.duration > 0) {
      const hours = Math.floor(data.duration / 3600);
      const minutes = Math.floor((data.duration % 3600) / 60);
      const seconds = data.duration % 60;

      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      }
      return `${minutes}m ${seconds}s`;
    }

    // Fallback a cálculo por diferencia de timestamps
    if (!data?.startedAt || !data?.endedAt) return "No disponible";

    try {
      const start = data.startedAt?.toDate?.() || new Date(data.startedAt);
      const end = data.endedAt?.toDate?.() || new Date(data.endedAt);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return "No disponible";
      }

      const diffMs = end - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      }
      return `${minutes}m ${seconds}s`;
    } catch (timeError) {
      console.warn("⚠️ Error calculando tiempo:", timeError);
      return "No disponible";
    }
  };

  const getFeedbackMessage = (percentage) => {
    if (data?.status === "aborted") {
      return {
        message: "Examen finalizado por seguridad ⚠️",
        description:
          "El examen fue terminado debido a violaciones de las normas de seguridad.",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        icon: AlertTriangle,
      };
    }

    if (percentage >= 95) {
      return {
        message: "¡Extraordinario! ¡Puntaje casi perfecto! 🎉✨",
        description:
          "Tu desempeño fue excepcional. ¡Eres un verdadero experto!",
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        icon: Trophy,
      };
    } else if (percentage >= 90) {
      return {
        message: "¡Excelente trabajo! 🌟",
        description: "Tu desempeño fue sobresaliente. ¡Felicitaciones!",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        icon: Award,
      };
    } else if (percentage >= 80) {
      return {
        message: "¡Muy buen trabajo! 👏",
        description: "Tu desempeño fue muy bueno. ¡Sigue así!",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        icon: TrendingUp,
      };
    } else if (percentage >= 70) {
      return {
        message: "Buen trabajo 👍",
        description:
          "Tu desempeño fue satisfactorio. Hay espacio para mejorar.",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        icon: Target,
      };
    } else if (percentage >= 60) {
      return {
        message: "Necesitas practicar más 📚",
        description: "Tu desempeño fue regular. Te recomendamos estudiar más.",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        icon: BookOpen,
      };
    } else {
      return {
        message: "Debes estudiar más 💪",
        description: "Tu desempeño necesita mejorar significativamente.",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        icon: RefreshCw,
      };
    }
  };

  const getSecurityReport = () => {
    if (!data?.securityEvents && !data?.alertLog) return null;

    const events = [];

    // Revisar eventos de seguridad estructurados
    if (data.securityEvents) {
      if (data.securityEvents.tabSwitches > 0) {
        events.push(
          `${data.securityEvents.tabSwitches} cambios de pestaña detectados`
        );
      }
      if (data.securityEvents.timeUp) {
        events.push("Tiempo límite agotado");
      }
      if (data.securityEvents.aborted) {
        events.push("Examen abortado por violaciones de seguridad");
      }
    }

    // Revisar alertLog para compatibilidad con versiones anteriores
    if (data.alertLog && Array.isArray(data.alertLog)) {
      data.alertLog.forEach((alert) => {
        if (typeof alert === "string") {
          if (alert.includes("tabSwitches:")) {
            const count = alert.split(":")[1]?.trim();
            if (
              count &&
              !events.some((e) => e.includes("cambios de pestaña"))
            ) {
              events.push(`${count} cambios de pestaña detectados`);
            }
          } else if (
            alert === "timeUp" &&
            !events.some((e) => e.includes("Tiempo"))
          ) {
            events.push("Tiempo límite agotado");
          } else if (
            alert === "tabSwitch" &&
            !events.some((e) => e.includes("abortado"))
          ) {
            events.push("Examen abortado por cambio de pestaña");
          }
        }
      });
    }

    return events.length > 0 ? events : null;
  };

  const getStatsByDifficulty = () => {
    if (!data?.detailPerQuestion) return {};

    return data.detailPerQuestion.reduce((acc, detail) => {
      const difficulty = detail.difficulty || "medium";
      if (!acc[difficulty]) {
        acc[difficulty] = { correct: 0, total: 0 };
      }
      acc[difficulty].total++;
      if (detail.isCorrect) {
        acc[difficulty].correct++;
      }
      return acc;
    }, {});
  };

  // Estados de carga y error
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50">
        <div className="text-center">
          <Spinner size="16" />
          <p className="mt-4 text-gray-600 text-lg">Cargando resultados...</p>
          <p className="mt-2 text-gray-500 text-sm">
            Sincronizando con la base de datos...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Error al cargar resultados
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "No se pudieron cargar los resultados del examen"}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
              >
                <RefreshCw className="w-5 h-5" />
                Reintentar
              </button>
              <button
                onClick={() => nav("/student/exams")}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition"
              >
                <Home className="w-5 h-5" />
                Volver a Exámenes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calcular estadísticas
  const totalStats = getTotalStats();
  const feedback = getFeedbackMessage(totalStats.percentage);
  const timeSpent = getTimeSpent();
  const securityEvents = getSecurityReport();
  const difficultyStats = getStatsByDifficulty();
  const StatusIcon = statusConfig[data.status]?.icon || CheckCircle2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      {/* Header fijo con información completa */}
      <div className="bg-white shadow-lg border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  📊 Resultados del Examen
                </h1>
                <p className="text-gray-600">
                  {examData?.title || "Examen completado"} •{" "}
                  {new Date().toLocaleDateString("es-ES")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`px-4 py-2 rounded-full border-2 ${
                  statusConfig[data.status]?.color ||
                  statusConfig.finished.color
                }`}
              >
                <div className="flex items-center gap-2">
                  <StatusIcon className="w-5 h-5" />
                  <span className="font-medium text-sm">
                    {statusConfig[data.status]?.label || "Completado"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => nav("/student/exams")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs de navegación */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "overview", label: "📋 Resumen", icon: BarChart3 },
              { id: "subjects", label: "📚 Por Materia", icon: BookOpen },
              { id: "questions", label: "❓ Detalle", icon: Eye },
              { id: "analysis", label: "📈 Análisis", icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Resumen General */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Tarjeta principal de resultados */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Puntaje principal */}
              <div className="lg:col-span-2">
                <div
                  className={`rounded-2xl p-8 border-2 ${feedback.bgColor} ${feedback.borderColor}`}
                >
                  <div className="text-center">
                    <div className="relative inline-flex items-center justify-center mb-6">
                      <div className="w-40 h-40 rounded-full bg-white shadow-xl flex items-center justify-center">
                        <span
                          className={`text-5xl font-bold ${feedback.color}`}
                        >
                          {totalStats.percentage}%
                        </span>
                      </div>
                      <div className="absolute -top-2 -right-2">
                        <feedback.icon
                          className={`w-10 h-10 ${feedback.color}`}
                          fill="currentColor"
                        />
                      </div>
                    </div>

                    <h2 className={`text-3xl font-bold mb-3 ${feedback.color}`}>
                      {feedback.message}
                    </h2>
                    <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                      {feedback.description}
                    </p>

                    {/* Estadísticas detalladas */}
                    <div className="grid grid-cols-3 gap-6 mt-8">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {totalStats.correct}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          Correctas
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600 mb-1">
                          {totalStats.total - totalStats.correct}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          Incorrectas
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {totalStats.total}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          Total
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel de información */}
              <div className="space-y-6">
                {/* Información del intento */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                    Información del Intento
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tiempo empleado:</span>
                      <span className="font-bold text-blue-600">
                        {timeSpent}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha:</span>
                      <span className="font-medium">
                        {data.startedAt
                          ?.toDate?.()
                          ?.toLocaleDateString("es-ES", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }) || new Date().toLocaleDateString("es-ES")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hora de inicio:</span>
                      <span className="font-medium">
                        {data.startedAt
                          ?.toDate?.()
                          ?.toLocaleTimeString("es-ES") || "No disponible"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Hora de finalización:
                      </span>
                      <span className="font-medium">
                        {data.endedAt
                          ?.toDate?.()
                          ?.toLocaleTimeString("es-ES") || "No disponible"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información del examen */}
                {examData && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-green-600" />
                      Datos del Examen
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-600">Título:</span>
                        <p className="font-medium">{examData.title}</p>
                      </div>
                      {examData.description && (
                        <div>
                          <span className="text-gray-600">Descripción:</span>
                          <p className="font-medium text-sm">
                            {examData.description}
                          </p>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tiempo límite:</span>
                        <span className="font-medium">
                          {examData.timeLimit} minutos
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Intentos máximos:</span>
                        <span className="font-medium">
                          {examData.maxAttempts}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reporte de seguridad */}
                {(securityEvents || data.status === "aborted") && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-red-200">
                    <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                      <Shield className="w-6 h-6 text-red-600" />
                      Reporte de Seguridad
                    </h3>
                    <div className="space-y-2">
                      {data.status === "aborted" && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                          <AlertTriangle className="w-4 h-4 inline mr-2" />
                          Examen finalizado automáticamente por violaciones de
                          seguridad
                        </div>
                      )}
                      {securityEvents &&
                        securityEvents.map((event, index) => (
                          <div
                            key={index}
                            className="text-sm text-red-700 flex items-center gap-2"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            {event}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Resultados por Materia */}
        {activeTab === "subjects" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-blue-600" />
              Rendimiento por Materia
            </h2>
            {data.scoreBySubject &&
            Object.keys(data.scoreBySubject).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.entries(data.scoreBySubject).map(
                  ([subjectId, score]) => (
                    <div
                      key={subjectId}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200 hover:shadow-lg transition"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        <h4 className="font-bold text-gray-800">
                          {score.subjectName}
                        </h4>
                      </div>

                      <div className="text-center mb-4">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {score.percentage || 0}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {score.correct || 0} de {score.total || 0} correctas
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
                        <div
                          className={`h-4 rounded-full transition-all duration-500 ${
                            (score.percentage || 0) >= 80
                              ? "bg-green-500"
                              : (score.percentage || 0) >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${score.percentage || 0}%` }}
                        />
                      </div>

                      <div className="text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            (score.percentage || 0) >= 80
                              ? "bg-green-100 text-green-700"
                              : (score.percentage || 0) >= 60
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {(score.percentage || 0) >= 80
                            ? "Excelente"
                            : (score.percentage || 0) >= 60
                            ? "Bueno"
                            : "Necesita Mejorar"}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  No hay información de materias disponible
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Detalle de Preguntas */}
        {activeTab === "questions" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Target className="w-7 h-7 text-blue-600" />
                Detalle de Preguntas ({data.detailPerQuestion?.length || 0})
              </h2>
              <button
                onClick={() => setShowDetailedView(!showDetailedView)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
              >
                <Eye className="w-5 h-5" />
                {showDetailedView ? "Ocultar" : "Ver"} Detalles
              </button>
            </div>

            {data.detailPerQuestion && data.detailPerQuestion.length > 0 ? (
              showDetailedView ? (
                <div className="space-y-6">
                  {data.detailPerQuestion.map((question, index) => (
                    <div
                      key={question.questionId || index}
                      className={`p-6 rounded-xl border-2 ${
                        question.isCorrect
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            question.isCorrect ? "bg-green-500" : "bg-red-500"
                          }`}
                        >
                          {question.questionNumber || index + 1}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            {question.isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            <span
                              className={`font-bold ${
                                question.isCorrect
                                  ? "text-green-800"
                                  : "text-red-800"
                              }`}
                            >
                              {question.isCorrect
                                ? "✅ Correcta"
                                : "❌ Incorrecta"}
                            </span>
                            <span className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
                              📚 {question.subjectName}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                question.difficulty === "easy"
                                  ? "bg-green-100 text-green-700"
                                  : question.difficulty === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {question.difficulty === "easy"
                                ? "🟢 Fácil"
                                : question.difficulty === "medium"
                                ? "🟡 Medio"
                                : "🔴 Difícil"}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              📝 {question.type || "multiple-choice"}
                            </span>
                          </div>

                          <div className="mb-4 p-4 bg-white rounded-lg border">
                            <h4 className="font-medium text-gray-800 mb-2">
                              📋 Pregunta:
                            </h4>
                            <p className="text-gray-700 leading-relaxed">
                              {question.questionText ||
                                question.text ||
                                "Pregunta sin texto"}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-white p-4 rounded-lg border">
                              <h5 className="font-medium text-gray-700 mb-2">
                                📝 Tu respuesta:
                              </h5>
                              <p
                                className={`font-bold ${
                                  question.isCorrect
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {question.selectedAnswerText}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border">
                              <h5 className="font-medium text-gray-700 mb-2">
                                ✅ Respuesta correcta:
                              </h5>
                              <p className="font-bold text-green-600">
                                {question.correctAnswersText}
                              </p>
                            </div>
                          </div>

                          {question.explanation && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <h5 className="font-medium text-blue-800 mb-2">
                                💡 Explicación:
                              </h5>
                              <p className="text-blue-700">
                                {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {data.detailPerQuestion.map((question, index) => (
                    <div
                      key={question.questionId || index}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white ${
                        question.isCorrect ? "bg-green-500" : "bg-red-500"
                      }`}
                      title={`Pregunta ${index + 1}: ${
                        question.isCorrect ? "Correcta" : "Incorrecta"
                      }`}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  No hay detalles de preguntas disponibles
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Análisis Avanzado */}
        {activeTab === "analysis" && (
          <div className="space-y-8">
            {/* Estadísticas por dificultad */}
            {Object.keys(difficultyStats).length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <Activity className="w-7 h-7 text-purple-600" />
                  Rendimiento por Dificultad
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(difficultyStats).map(
                    ([difficulty, stats]) => {
                      const percentage = Math.round(
                        (stats.correct / stats.total) * 100
                      );
                      const difficultyInfo = {
                        easy: { label: "Fácil", color: "green", icon: "🟢" },
                        medium: { label: "Medio", color: "yellow", icon: "🟡" },
                        hard: { label: "Difícil", color: "red", icon: "🔴" },
                      };
                      const info = difficultyInfo[difficulty] || {
                        label: difficulty,
                        color: "gray",
                        icon: "⚪",
                      };

                      return (
                        <div
                          key={difficulty}
                          className={`p-6 rounded-xl border-2 bg-${info.color}-50 border-${info.color}-200`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-2">{info.icon}</div>
                            <h3 className="font-bold text-gray-800 mb-2">
                              {info.label}
                            </h3>
                            <div
                              className={`text-3xl font-bold text-${info.color}-600 mb-2`}
                            >
                              {percentage}%
                            </div>
                            <p className="text-sm text-gray-600">
                              {stats.correct} de {stats.total} correctas
                            </p>
                            <div
                              className={`w-full bg-${info.color}-200 rounded-full h-2 mt-3`}
                            >
                              <div
                                className={`bg-${info.color}-500 h-2 rounded-full transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Resumen del rendimiento */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Trophy className="w-7 h-7 text-yellow-600" />
                Resumen de Rendimiento
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {totalStats.percentage}%
                  </div>
                  <div className="text-sm text-blue-800 font-medium">
                    Puntaje General
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {totalStats.correct}
                  </div>
                  <div className="text-sm text-green-800 font-medium">
                    Respuestas Correctas
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {totalStats.total - totalStats.correct}
                  </div>
                  <div className="text-sm text-red-800 font-medium">
                    Respuestas Incorrectas
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {Object.keys(data.scoreBySubject || {}).length}
                  </div>
                  <div className="text-sm text-purple-800 font-medium">
                    Materias Evaluadas
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Acciones finales */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => nav("/student/exams")}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a Exámenes
          </button>
          <button
            onClick={() => nav("/student")}
            className="flex items-center gap-2 px-8 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition font-medium shadow-lg hover:shadow-xl"
          >
            <Home className="w-5 h-5" />
            Panel Principal
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium shadow-lg hover:shadow-xl"
          >
            <FileText className="w-5 h-5" />
            Imprimir Resultados
          </button>
        </div>
      </div>
    </div>
  );
}
