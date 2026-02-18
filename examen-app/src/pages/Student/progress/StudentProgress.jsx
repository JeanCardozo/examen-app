import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  Award,
  TrendingUp,
  Clock,
  Book,
  Target,
  Trophy,
  Calendar,
  ChevronUp,
  ChevronDown,
  Star,
  Activity,
} from "lucide-react";
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

const COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

// 🔥 FUNCIÓN CORREGIDA: Procesar intentos con datos reales de Firebase
const processAttempts = async (attempts) => {
  if (!attempts || attempts.length === 0) {
    return {
      totalExams: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      subjectPerformance: [],
      responseDistribution: [
        { name: "Correctas", value: 0 },
        { name: "Incorrectas", value: 0 },
      ],
      progressOverTime: [],
      recentActivity: [],
      weeklyProgress: [],
      improvementTrend: 0,
    };
  }

  console.log("🔍 Procesando intentos:", attempts.length);

  // 🎯 CALCULAR ESTADÍSTICAS REALES DE scoreBySubject
  let totalCorrectAnswers = 0;
  let totalQuestionsCount = 0;
  const scores = [];
  const subjectMap = {};
  const examTitles = {};

  // Obtener títulos de exámenes
  const examIds = [...new Set(attempts.map((a) => a.examId).filter(Boolean))];
  for (const examId of examIds) {
    try {
      const examDoc = await getDoc(doc(db, "exams", examId));
      if (examDoc.exists()) {
        examTitles[examId] = examDoc.data().title;
      }
    } catch (error) {
      console.warn(`Error cargando examen ${examId}:`, error);
    }
  }

  // Procesar cada intento
  attempts.forEach((attempt, index) => {
    // Calcular puntaje del intento desde scoreBySubject
    let attemptCorrect = 0;
    let attemptTotal = 0;

    if (attempt.scoreBySubject && typeof attempt.scoreBySubject === "object") {
      Object.values(attempt.scoreBySubject).forEach((subject) => {
        const correct = Number(subject.correct) || 0;
        const total = Number(subject.total) || 0;
        attemptCorrect += correct;
        attemptTotal += total;

        // Procesar materias
        const subjectName = subject.subjectName || `Materia ${index}`;
        if (!subjectMap[subjectName]) {
          subjectMap[subjectName] = {
            scores: [],
            correct: 0,
            total: 0,
            attempts: 0,
          };
        }
        subjectMap[subjectName].scores.push(
          total > 0 ? Math.round((correct / total) * 100) : 0
        );
        subjectMap[subjectName].correct += correct;
        subjectMap[subjectName].total += total;
        subjectMap[subjectName].attempts += 1;
      });
    }

    totalCorrectAnswers += attemptCorrect;
    totalQuestionsCount += attemptTotal;

    const attemptScore =
      attemptTotal > 0 ? Math.round((attemptCorrect / attemptTotal) * 100) : 0;
    scores.push(attemptScore);

    // Agregar título del examen al intento
    attempt.examTitle = examTitles[attempt.examId] || `Examen ${index + 1}`;
    attempt.calculatedScore = attemptScore;
  });

  // Estadísticas básicas
  const totalExams = attempts.length;
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const worstScore = scores.length > 0 ? Math.min(...scores) : 0;
  const accuracyRate =
    totalQuestionsCount > 0
      ? Math.round((totalCorrectAnswers / totalQuestionsCount) * 100)
      : 0;

  // Rendimiento por materia
  const subjectPerformance = Object.entries(subjectMap)
    .map(([subject, data]) => ({
      name: subject.length > 15 ? subject.substring(0, 15) + "..." : subject,
      fullName: subject,
      score: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      attempts: data.attempts,
      bestScore: Math.max(...data.scores),
      worstScore: Math.min(...data.scores),
    }))
    .sort((a, b) => b.score - a.score);

  // Distribución de respuestas
  const responseDistribution = [
    { name: "Correctas", value: totalCorrectAnswers },
    { name: "Incorrectas", value: totalQuestionsCount - totalCorrectAnswers },
  ];

  // Progreso a lo largo del tiempo (ordenado cronológicamente)
  const sortedAttempts = attempts
    .filter((attempt) => attempt.startedAt || attempt.createdAt)
    .sort((a, b) => {
      const dateA =
        a.startedAt?.toDate?.() ||
        a.createdAt?.toDate?.() ||
        new Date(a.startedAt || a.createdAt);
      const dateB =
        b.startedAt?.toDate?.() ||
        b.createdAt?.toDate?.() ||
        new Date(b.startedAt || b.createdAt);
      return dateA - dateB;
    });

  const progressOverTime = sortedAttempts.map((attempt, index) => {
    const date =
      attempt.startedAt?.toDate?.() ||
      attempt.createdAt?.toDate?.() ||
      new Date();
    return {
      date: date.toLocaleDateString("es-ES", {
        month: "short",
        day: "numeric",
      }),
      score: attempt.calculatedScore || 0,
      exam: attempt.examTitle || `Examen ${index + 1}`,
      fullDate: date.toLocaleDateString("es-ES"),
    };
  });

  // Actividad reciente (últimos 10 intentos)
  const recentActivity = sortedAttempts
    .slice(-10)
    .reverse()
    .map((attempt) => {
      const date =
        attempt.startedAt?.toDate?.() ||
        attempt.createdAt?.toDate?.() ||
        new Date();
      return {
        examTitle: attempt.examTitle || "Examen sin título",
        score: attempt.calculatedScore || 0,
        date: date.toLocaleDateString("es-ES"),
        timeAgo: getTimeAgo(date),
        attemptId: attempt.id,
      };
    });

  // Progreso semanal
  const weeklyProgress = getWeeklyProgress(sortedAttempts);

  // Tendencia de mejora
  const improvementTrend = calculateImprovementTrend(progressOverTime);

  console.log("✅ Estadísticas calculadas:", {
    totalExams,
    averageScore,
    totalQuestions: totalQuestionsCount,
    correctAnswers: totalCorrectAnswers,
    subjects: Object.keys(subjectMap).length,
  });

  return {
    totalExams,
    averageScore,
    bestScore,
    worstScore,
    totalQuestions: totalQuestionsCount,
    correctAnswers: totalCorrectAnswers,
    accuracyRate,
    subjectPerformance,
    responseDistribution,
    progressOverTime,
    recentActivity,
    weeklyProgress,
    improvementTrend,
  };
};

// Función auxiliar para calcular tiempo transcurrido
const getTimeAgo = (date) => {
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return `Hace ${Math.floor(diffDays / 30)} meses`;
};

// Función para calcular progreso semanal
const getWeeklyProgress = (attempts) => {
  const weeks = {};

  attempts.forEach((attempt) => {
    const date =
      attempt.startedAt?.toDate?.() ||
      attempt.createdAt?.toDate?.() ||
      new Date();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split("T")[0];

    if (!weeks[weekKey]) {
      weeks[weekKey] = { scores: [], count: 0, date: weekStart };
    }
    weeks[weekKey].scores.push(attempt.calculatedScore || 0);
    weeks[weekKey].count++;
  });

  return (
    Object.entries(weeks)
      // eslint-disable-next-line no-unused-vars
      .map(([key, data]) => ({
        week: data.date.toLocaleDateString("es-ES", {
          month: "short",
          day: "numeric",
        }),
        averageScore: Math.round(
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        ),
        attempts: data.count,
        date: data.date,
      }))
      .sort((a, b) => a.date - b.date)
      .slice(-8)
  ); // Últimas 8 semanas
};

// Función para calcular tendencia de mejora
const calculateImprovementTrend = (progressData) => {
  if (progressData.length < 2) return 0;

  const recent = progressData.slice(-5);
  const older = progressData.slice(0, Math.max(1, progressData.length - 5));

  const recentAvg =
    recent.reduce((sum, item) => sum + item.score, 0) / recent.length;
  const olderAvg =
    older.reduce((sum, item) => sum + item.score, 0) / older.length;

  return Math.round(recentAvg - olderAvg);
};

export default function StudentProgress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.uid) {
        setError("Usuario no autenticado");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        console.log("🔍 Cargando intentos para usuario:", user.uid);

        // 🎯 CONSULTA CORREGIDA: Obtener intentos finalizados ordenados por fecha
        const attemptsRef = collection(db, "attempts");
        const q = query(
          attemptsRef,
          where("userId", "==", user.uid),
          where("status", "in", ["finished", "aborted"]), // Solo intentos completados
          orderBy("startedAt", "desc")
        );

        const snapshot = await getDocs(q);
        const attempts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("📊 Intentos cargados:", attempts.length);

        if (attempts.length === 0) {
          setStats({
            totalExams: 0,
            averageScore: 0,
            bestScore: 0,
            worstScore: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            accuracyRate: 0,
            subjectPerformance: [],
            responseDistribution: [
              { name: "Correctas", value: 0 },
              { name: "Incorrectas", value: 0 },
            ],
            progressOverTime: [],
            recentActivity: [],
            weeklyProgress: [],
            improvementTrend: 0,
          });
        } else {
          // 🔥 PROCESAR DATOS REALES
          const statistics = await processAttempts(attempts);
          setStats(statistics);
        }

        setError(null);
      } catch (error) {
        console.error("❌ Error loading stats:", error);
        setError("Error al cargar las estadísticas: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Spinner size="16" />
          <p className="mt-4 text-gray-600 text-lg">
            Cargando progreso académico...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="h-8 w-8 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Error al cargar estadísticas
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalExams === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Mi Progreso Académico
              </h1>
              <p className="text-gray-600 text-lg">
                Visualiza tu desempeño y evolución académica
              </p>
            </div>
            <button
              onClick={() => navigate("/student")}
              className="px-6 py-3 bg-white text-gray-600 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-lg border border-gray-200 hover:shadow-xl"
            >
              Volver al Panel
            </button>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Book className="w-12 h-12 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              ¡Comienza tu journey académico! 🚀
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              Aún no has completado ningún examen. Realiza tu primer examen para
              comenzar a ver tu progreso académico.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/student/exams")}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Ver Exámenes Disponibles
              </button>
              <button
                onClick={() => navigate("/student")}
                className="px-8 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                Volver al Panel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Mi Progreso Académico
          </h1>
          <p className="text-gray-600 text-lg">
            Visualiza tu desempeño y evolución académica • {stats.totalExams}{" "}
            exámenes completados
          </p>
        </div>
        <button
          onClick={() => navigate("/student")}
          className="px-6 py-3 bg-white text-gray-600 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-lg border border-gray-200 hover:shadow-xl"
        >
          Volver al Panel
        </button>
      </div>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Promedio General"
          value={`${stats.averageScore}%`}
          icon={<Award className="w-8 h-8" />}
          color="from-green-400 to-green-600"
          bgColor="bg-green-50"
          trend={stats.improvementTrend}
        />
        <StatCard
          title="Exámenes Completados"
          value={stats.totalExams}
          icon={<Book className="w-8 h-8" />}
          color="from-blue-400 to-blue-600"
          bgColor="bg-blue-50"
          subtitle={`${stats.totalQuestions} preguntas`}
        />
        <StatCard
          title="Mejor Puntuación"
          value={`${stats.bestScore}%`}
          icon={<Target className="w-8 h-8" />}
          color="from-purple-400 to-purple-600"
          bgColor="bg-purple-50"
          subtitle={`Peor: ${stats.worstScore}%`}
        />
        <StatCard
          title="Precisión Global"
          value={`${stats.accuracyRate}%`}
          icon={<Trophy className="w-8 h-8" />}
          color="from-orange-400 to-orange-600"
          bgColor="bg-orange-50"
          subtitle={`${stats.correctAnswers}/${stats.totalQuestions}`}
        />
      </div>

      {/* Gráficas Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Progreso a lo Largo del Tiempo */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Evolución de Puntuaciones
            </h3>
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.progressOverTime}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "10px",
                    border: "none",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rendimiento por Materia */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Rendimiento por Materia
            </h3>
            <Star className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="h-80">
            {stats.subjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.subjectPerformance} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#6b7280"
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "10px",
                      border: "none",
                      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value, name, props) => [
                      `${value}%`,
                      `Promedio: ${value}%\nIntentos: ${props.payload.attempts}`,
                    ]}
                  />
                  <Bar dataKey="score" fill="#3B82F6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos por materia</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución de Respuestas */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Precisión Global
            </h3>
            <Activity className="w-6 h-6 text-green-500" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.responseDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {stats.responseDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progreso Semanal */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Progreso Semanal
            </h3>
            <Calendar className="w-6 h-6 text-blue-500" />
          </div>
          <div className="h-64">
            {stats.weeklyProgress.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "10px",
                      border: "none",
                      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageScore"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Datos insuficientes</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Actividad Reciente
            </h3>
            <Clock className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  onClick={() =>
                    navigate(`/student/results/${activity.attemptId}`)
                  }
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {activity.examTitle}
                    </p>
                    <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`text-sm font-bold ${
                        activity.score >= 80
                          ? "text-green-600"
                          : activity.score >= 60
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {activity.score}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Sin actividad reciente</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de tarjeta de estadísticas
const StatCard = ({ title, value, icon, color, bgColor, trend, subtitle }) => (
  <div
    className={`${bgColor} p-6 rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm hover:shadow-2xl transition-all duration-300`}
  >
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <p className="text-gray-600 mb-1 text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-gray-800 mb-1">{value}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        {trend !== undefined && trend !== 0 && (
          <div
            className={`flex items-center mt-2 ${
              trend > 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend > 0 ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span className="text-xs font-medium">
              {Math.abs(trend)}% vs promedio anterior
            </span>
          </div>
        )}
      </div>
      <div
        className={`p-3 rounded-xl bg-gradient-to-r ${color} text-white shadow-lg`}
      >
        {icon}
      </div>
    </div>
  </div>
);
