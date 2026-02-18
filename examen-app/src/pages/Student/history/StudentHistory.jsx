import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../services/firebase";
import Spinner from "../../../components/Spinner";
import {
  Clock,
  Calendar,
  Award,
  BookOpen,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft,
  Target,
  AlertTriangle,
  Shield,
} from "lucide-react";

export default function StudentHistory() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState([]);
  const [examDetails, setExamDetails] = useState({});
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    bestScore: 0,
    totalExams: 0,
  });

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);

        console.log("🔍 Cargando historial para usuario:", user.uid);

        // 🎯 CONSULTA MEJORADA: Obtener intentos finalizados y abortados
        const attemptsRef = collection(db, "attempts");
        const q = query(
          attemptsRef,
          where("userId", "==", user.uid),
          where("status", "in", ["finished", "aborted"]),
          orderBy("startedAt", "desc")
        );

        const snapshot = await getDocs(q);
        const attemptsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("📊 Intentos encontrados:", attemptsData.length);

        // Obtener detalles de los exámenes
        const examIds = [
          ...new Set(attemptsData.map((a) => a.examId).filter(Boolean)),
        ];
        const examsDetails = {};

        for (const examId of examIds) {
          try {
            const examDoc = await getDoc(doc(db, "exams", examId));
            if (examDoc.exists()) {
              examsDetails[examId] = {
                id: examDoc.id,
                ...examDoc.data(),
              };
            }
          } catch (error) {
            console.warn(`Error cargando examen ${examId}:`, error);
          }
        }

        // 🔥 CALCULAR ESTADÍSTICAS REALES desde scoreBySubject
        const processedAttempts = attemptsData.map((attempt) => {
          let totalCorrect = 0;
          let totalQuestions = 0;

          if (
            attempt.scoreBySubject &&
            typeof attempt.scoreBySubject === "object"
          ) {
            Object.values(attempt.scoreBySubject).forEach((subject) => {
              totalCorrect += Number(subject.correct) || 0;
              totalQuestions += Number(subject.total) || 0;
            });
          }

          const percentage =
            totalQuestions > 0
              ? Math.round((totalCorrect / totalQuestions) * 100)
              : 0;

          return {
            ...attempt,
            calculatedScore: percentage,
            totalCorrect,
            totalQuestions,
            examTitle:
              examsDetails[attempt.examId]?.title || "Examen no disponible",
          };
        });

        // Calcular estadísticas generales
        const finishedAttempts = processedAttempts.filter(
          (a) => a.status === "finished"
        );
        const scores = processedAttempts.map((a) => a.calculatedScore);

        const stats = {
          totalAttempts: processedAttempts.length,
          averageScore:
            scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : 0,
          bestScore: scores.length > 0 ? Math.max(...scores) : 0,
          totalExams: examIds.length,
          finishedCount: finishedAttempts.length,
          abortedCount: processedAttempts.filter((a) => a.status === "aborted")
            .length,
        };

        setAttempts(processedAttempts);
        setExamDetails(examsDetails);
        setStats(stats);

        console.log("✅ Historial cargado:", {
          attempts: processedAttempts.length,
          exams: examIds.length,
          averageScore: stats.averageScore,
        });
      } catch (error) {
        console.error("❌ Error loading history:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user?.uid]);

  const getScoreColor = (percent) => {
    if (percent >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (percent >= 80) return "text-blue-600 bg-blue-50 border-blue-200";
    if (percent >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (percent >= 60) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreIcon = (percent, status) => {
    if (status === "aborted") {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    if (percent >= 70)
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (status, score) => {
    if (status === "aborted") {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          <Shield className="w-3 h-3" />
          Finalizado por seguridad
        </div>
      );
    }

    if (score >= 70) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Aprobado
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
        <XCircle className="w-3 h-3" />
        No aprobado
      </div>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Fecha no disponible";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Fecha no disponible";
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return "N/A";
    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    if (minutes < 60) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  // 🎯 FUNCIÓN CORREGIDA: Navegar a resultados
  const handleViewResults = (attempt) => {
    console.log("📄 Navegando a resultados:", attempt.id);
    // 🔥 RUTA CORREGIDA: Usar /student/exams/results/ en lugar de /results/
    nav(`/results/${attempt.id}`);
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <Spinner size="16" />
          <p className="mt-4 text-gray-600 text-lg">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-4 mb-4 lg:mb-0">
            <button
              onClick={() => nav("/student")}
              className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                📚 Historial de Exámenes
              </h1>
              <p className="text-gray-600">
                Revisa tu progreso y rendimiento académico •{" "}
                {stats.totalAttempts} intentos realizados
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards - Mejoradas */}
        {attempts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">
                    Total Intentos
                  </p>
                  <p className="text-3xl font-bold">{stats.totalAttempts}</p>
                  <p className="text-blue-200 text-xs">
                    {stats.finishedCount} completados • {stats.abortedCount}{" "}
                    abortados
                  </p>
                </div>
                <BookOpen className="w-12 h-12 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">
                    Mejor Puntuación
                  </p>
                  <p className="text-3xl font-bold">{stats.bestScore}%</p>
                  <p className="text-green-200 text-xs">
                    Tu máximo rendimiento
                  </p>
                </div>
                <Target className="w-12 h-12 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">
                    Promedio General
                  </p>
                  <p className="text-3xl font-bold">{stats.averageScore}%</p>
                  <p className="text-purple-200 text-xs">
                    En todos los intentos
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">
                    Exámenes Únicos
                  </p>
                  <p className="text-3xl font-bold">{stats.totalExams}</p>
                  <p className="text-orange-200 text-xs">
                    Diferentes evaluaciones
                  </p>
                </div>
                <Award className="w-12 h-12 text-orange-200" />
              </div>
            </div>
          </div>
        )}

        {/* History Cards */}
        {attempts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-12 h-12 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                ¡Comienza tu journey académico! 🚀
              </h2>
              <p className="text-gray-600 mb-6 text-lg">
                Aún no has realizado ningún examen. Comienza ahora para ver tu
                progreso académico.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => nav("/student/exams")}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Ver Exámenes Disponibles
                </button>
                <button
                  onClick={() => nav("/student")}
                  className="px-8 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  Volver al Panel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {attempts.map((attempt) => {
              const exam = examDetails[attempt.examId] || {};
              const percent = attempt.calculatedScore;

              return (
                <div
                  key={attempt.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                      {/* Exam Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div
                            className={`p-3 rounded-xl border-2 ${getScoreColor(
                              percent
                            )}`}
                          >
                            {getScoreIcon(percent, attempt.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-gray-800">
                                {attempt.examTitle}
                              </h3>
                              {getStatusBadge(attempt.status, percent)}
                            </div>
                            {exam.description && (
                              <p className="text-sm text-gray-600 mb-2">
                                {exam.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Clock className="w-5 h-5 text-blue-500" />
                            <div>
                              <span className="text-xs text-gray-500 block">
                                Duración
                              </span>
                              <span className="text-sm font-semibold text-gray-700">
                                {formatDuration(attempt.duration)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Calendar className="w-5 h-5 text-green-500" />
                            <div>
                              <span className="text-xs text-gray-500 block">
                                Fecha
                              </span>
                              <span className="text-sm font-semibold text-gray-700">
                                {formatDate(attempt.startedAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Award className="w-5 h-5 text-purple-500" />
                            <div>
                              <span className="text-xs text-gray-500 block">
                                Resultado
                              </span>
                              <span className="text-sm font-semibold text-gray-700">
                                {attempt.totalCorrect}/{attempt.totalQuestions}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Target className="w-5 h-5 text-orange-500" />
                            <div>
                              <span className="text-xs text-gray-500 block">
                                Estado
                              </span>
                              <span className="text-sm font-semibold text-gray-700">
                                {attempt.status === "finished"
                                  ? "Completado"
                                  : "Abortado"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Score Display */}
                      <div className="text-center lg:text-right">
                        <div
                          className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl border-2 ${getScoreColor(
                            percent
                          )} mb-3`}
                        >
                          <span className="text-2xl font-bold">{percent}%</span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                          Puntuación
                        </p>
                      </div>
                    </div>

                    {/* Subject Breakdown */}
                    {attempt.scoreBySubject &&
                      Object.keys(attempt.scoreBySubject).length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Rendimiento por materia:
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries(attempt.scoreBySubject).map(
                              ([subjectId, score]) => {
                                const subjectPercent =
                                  score.total > 0
                                    ? Math.round(
                                        (score.correct / score.total) * 100
                                      )
                                    : 0;
                                return (
                                  <div
                                    key={subjectId}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                                  >
                                    <span className="text-sm font-medium text-gray-700">
                                      {score.subjectName ||
                                        `Materia ${subjectId}`}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600">
                                        {score.correct}/{score.total}
                                      </span>
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full font-bold border ${getScoreColor(
                                          subjectPercent
                                        )}`}
                                      >
                                        {subjectPercent}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}

                    {/* Security Events */}
                    {attempt.status === "aborted" &&
                      (attempt.securityEvents || attempt.alertLog) && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Eventos de seguridad:
                          </h4>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-red-700 text-sm">
                              <AlertTriangle className="w-4 h-4" />
                              <span>
                                Examen finalizado automáticamente por
                                violaciones de seguridad
                              </span>
                            </div>
                            {attempt.securityEvents?.tabSwitches > 0 && (
                              <p className="text-red-600 text-xs mt-1">
                                • {attempt.securityEvents.tabSwitches} cambios
                                de pestaña detectados
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Action Button */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <button
                        onClick={() => handleViewResults(attempt)}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        <Eye className="w-5 h-5" />
                        Ver Análisis Detallado
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        {attempts.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Acciones Rápidas
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => nav("/student/exams")}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Realizar Nuevo Examen
              </button>
              <button
                onClick={() => nav("/student/progress")}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                Ver Progreso Académico
              </button>
              <button
                onClick={() => nav("/student")}
                className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Volver al Panel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
