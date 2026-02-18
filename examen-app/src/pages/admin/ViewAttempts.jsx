import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Award,
  Clock,
  BookOpen,
  Target,
  Activity,
  Search,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { db } from "../../services/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";

const COLORS = [
  "#3B82F6", // Azul
  "#EF4444", // Rojo
  "#10B981", // Verde
  "#F59E0B", // Amarillo
  "#8B5CF6", // Púrpura
  "#EC4899", // Rosa
  "#14B8A6", // Teal
  "#F97316", // Naranja
];

export default function ViewAttempts() {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [student, setStudent] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [exams, setExams] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [subjects, setSubjects] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Funciones auxiliares mejoradas
  const calculateAttemptPercentage = (attempt) => {
    if (!attempt.scoreBySubject) return 0;

    const scores = Object.values(attempt.scoreBySubject);
    const totalQuestions = scores.reduce(
      (sum, score) => sum + (Number(score.total) || 0),
      0
    );
    const correctAnswers = scores.reduce(
      (sum, score) => sum + (Number(score.correct) || 0),
      0
    );

    return totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;
  };

  const calculateAttemptDuration = (attempt) => {
    if (!attempt.startedAt || !attempt.endedAt) return 0;

    const start = attempt.startedAt.toDate();
    const end = attempt.endedAt.toDate();
    return Math.round((end - start) / (1000 * 60));
  };

  // Buscar estudiante por email
  const searchStudent = async (searchEmail) => {
    if (!searchEmail.trim()) return;

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("email", "==", searchEmail.toLowerCase())
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0];
        setStudent({ id: userData.id, ...userData.data() });
      } else {
        setStudent(null);
      }
    } catch (error) {
      console.error("Error buscando estudiante:", error);
      setStudent(null);
    }
    setLoading(false);
  };

  // Cargar intentos del estudiante - MEJORADO
  const loadAttempts = async (studentId) => {
    try {
      // 1. Obtener intentos
      const attemptsRef = collection(db, "attempts");
      const q = query(
        attemptsRef,
        where("userId", "==", studentId),
        orderBy("startedAt", "desc")
      );
      const querySnapshot = await getDocs(q);

      const attemptsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 2. Cargar información de exámenes
      const examIds = [
        ...new Set(attemptsData.map((a) => a.examId).filter(Boolean)),
      ];
      const examsData = {};

      for (const examId of examIds) {
        try {
          const examDoc = await getDoc(doc(db, "exams", examId));
          if (examDoc.exists()) {
            examsData[examId] = { id: examDoc.id, ...examDoc.data() };
          }
        } catch (error) {
          console.warn(`Error cargando examen ${examId}:`, error);
        }
      }

      // 3. Cargar TODAS las materias disponibles
      const subjectsRef = collection(db, "subjects");
      const subjectsSnapshot = await getDocs(subjectsRef);
      const subjectsData = {};

      subjectsSnapshot.docs.forEach((doc) => {
        subjectsData[doc.id] = {
          id: doc.id,
          name: doc.data().name,
          ...doc.data(),
        };
      });

      // 4. Procesar intentos con nombres reales de materias
      const processedAttempts = attemptsData.map((attempt) => {
        if (attempt.scoreBySubject) {
          const processedScores = {};

          Object.entries(attempt.scoreBySubject).forEach(
            ([subjectId, score]) => {
              const subjectName =
                subjectsData[subjectId]?.name || `Materia ${subjectId}`;
              processedScores[subjectName] = {
                ...score,
                subjectId,
                subjectName,
              };
            }
          );

          return {
            ...attempt,
            scoreBySubject: processedScores,
          };
        }
        return attempt;
      });

      console.log("✅ Datos procesados:", {
        attempts: processedAttempts.length,
        exams: Object.keys(examsData).length,
        subjects: Object.keys(subjectsData).length,
      });

      setAttempts(processedAttempts);
      setExams(examsData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error("❌ Error cargando intentos:", error);
      setAttempts([]);
    }
  };

  // Efecto para cargar intentos
  useEffect(() => {
    if (student?.id) {
      loadAttempts(student.id);
    }
  }, [student]);

  // Manejar búsqueda
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchEmail(email.trim());
    searchStudent(email.trim());
  };

  // Calcular estadísticas - COMPLETAMENTE REESCRITO
  const statistics = useMemo(() => {
    if (!attempts.length) return null;

    const finishedAttempts = attempts.filter((a) => a.status === "finished");

    console.log(
      "📊 Calculando estadísticas para:",
      finishedAttempts.length,
      "intentos"
    );

    // Datos de progreso temporal
    const progressData = finishedAttempts.map((attempt, index) => {
      const percentage = calculateAttemptPercentage(attempt);
      const duration = calculateAttemptDuration(attempt);

      return {
        attempt: index + 1,
        percentage,
        duration,
        date: attempt.startedAt?.toDate?.()?.toLocaleDateString() || "N/A",
        examTitle: exams[attempt.examId]?.title || "Examen sin título",
      };
    });

    // Rendimiento por materia - MEJORADO
    const subjectData = {};

    finishedAttempts.forEach((attempt) => {
      if (attempt.scoreBySubject) {
        Object.entries(attempt.scoreBySubject).forEach(
          ([subjectName, score]) => {
            const correct = Number(score?.correct) || 0;
            const total = Number(score?.total) || 0;

            if (total === 0) {
              console.warn(`⚠️ Materia ${subjectName} tiene total 0:`, score);
              return;
            }

            if (!subjectData[subjectName]) {
              subjectData[subjectName] = {
                correct: 0,
                total: 0,
                attempts: 0,
                name: subjectName,
                scores: [],
              };
            }

            subjectData[subjectName].correct += correct;
            subjectData[subjectName].total += total;
            subjectData[subjectName].attempts += 1;
            subjectData[subjectName].scores.push(
              Math.round((correct / total) * 100)
            );
          }
        );
      }
    });

    // Procesar promedios por materia
    const subjectAverages = Object.entries(subjectData)
      // eslint-disable-next-line no-unused-vars
      .filter(([_, data]) => data.total > 0)
      // eslint-disable-next-line no-unused-vars
      .map(([subject, data]) => {
        const percentage = Math.round((data.correct / data.total) * 100);
        const bestScore = Math.max(...data.scores);
        const worstScore = Math.min(...data.scores);

        return {
          subject: data.name,
          percentage,
          attempts: data.attempts,
          value: percentage, // Para el gráfico
          correct: data.correct,
          total: data.total,
          bestScore,
          worstScore,
          averageScore: percentage,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    // Calcular estadísticas generales
    const overallAverage =
      finishedAttempts.length > 0
        ? Math.round(
            progressData.reduce((sum, p) => sum + p.percentage, 0) /
              progressData.length
          )
        : 0;

    const bestScore =
      finishedAttempts.length > 0
        ? Math.max(...progressData.map((p) => p.percentage))
        : 0;

    const avgDuration =
      finishedAttempts.length > 0
        ? Math.round(
            progressData.reduce((sum, p) => sum + p.duration, 0) /
              progressData.length
          )
        : 0;

    console.log("📈 Estadísticas calculadas:", {
      subjectAverages: subjectAverages.length,
      overallAverage,
      bestScore,
      hasData: subjectAverages.length > 0,
    });

    return {
      progressData,
      subjectAverages,
      overallAverage,
      bestScore,
      avgDuration,
      totalAttempts: attempts.length,
      completedAttempts: finishedAttempts.length,
      hasSubjectData: subjectAverages.length > 0,
    };
  }, [attempts, exams]);

  // Componente de tarjeta de estadística mejorado
  const StatCard = ({
    title,
    value,
    // eslint-disable-next-line no-unused-vars
    icon: Icon,
    color = "blue",
    subtitle = null,
  }) => (
    <div
      className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-${color}-500 hover:shadow-xl transition-shadow duration-300`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600 mb-1`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-full`}>
          <Icon className={`w-8 h-8 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Header mejorado */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
          Dashboard de Rendimiento Estudiantil
        </h1>
        <p className="text-gray-600 text-lg">
          Análisis detallado del progreso académico y rendimiento por materias
        </p>
      </div>

      {/* Buscador mejorado */}
      <form
        onSubmit={handleSearch}
        className="mb-8 bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Buscar estudiante por correo electrónico..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Search className="w-5 h-5" />
            {loading ? "Buscando..." : "Buscar Estudiante"}
          </button>
        </div>
      </form>

      {/* Información del estudiante mejorada */}
      {student && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <User className="w-7 h-7 mr-3 text-blue-600" />
              Información del Estudiante
            </h2>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">
                Última actualización: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-700 mb-1">
                Nombre Completo
              </p>
              <p className="text-lg font-medium text-gray-900">
                {student.displayName || "No especificado"}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-700 mb-1">
                Correo Electrónico
              </p>
              <p className="text-lg font-medium text-gray-900">
                {student.email}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-700 mb-1">
                Estado de Cuenta
              </p>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  student.blocked
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-green-100 text-green-800 border border-green-200"
                }`}
              >
                {student.blocked ? (
                  <>
                    <XCircle className="w-4 h-4 mr-1" />
                    BLOQUEADO
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    ACTIVO
                  </>
                )}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-700 mb-1">
                Total de Intentos
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {attempts.length}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({statistics?.completedAttempts || 0} completados)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas principales mejoradas */}
      {statistics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Promedio General"
              value={`${statistics.overallAverage}%`}
              icon={Target}
              color="blue"
              subtitle={`Basado en ${statistics.completedAttempts} exámenes`}
            />
            <StatCard
              title="Mejor Puntuación"
              value={`${statistics.bestScore}%`}
              icon={Award}
              color="green"
              subtitle="Puntuación más alta obtenida"
            />
            <StatCard
              title="Exámenes Completados"
              value={statistics.completedAttempts}
              icon={Activity}
              color="purple"
              subtitle={`De ${statistics.totalAttempts} intentos totales`}
            />
            <StatCard
              title="Tiempo Promedio"
              value={`${statistics.avgDuration} min`}
              icon={Clock}
              color="orange"
              subtitle="Duración promedio por examen"
            />
          </div>

          {/* Tabs mejorados */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50">
              <nav className="flex space-x-8 px-6">
                {[
                  {
                    id: "overview",
                    label: "📊 Resumen",
                    desc: "Vista general del rendimiento",
                  },
                  {
                    id: "progress",
                    label: "📈 Progreso",
                    desc: "Evolución temporal",
                  },
                  {
                    id: "attempts",
                    label: "📝 Intentos",
                    desc: "Detalle de cada intento",
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    } rounded-t-lg`}
                    title={tab.desc}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-8">
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Gráfico de progreso mejorado */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
                      Evolución del Rendimiento
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={statistics.progressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis
                          dataKey="attempt"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                          formatter={(value, name) => [
                            `${value}%`,
                            name === "percentage" ? "Puntuación" : name,
                          ]}
                          labelFormatter={(label) => `Intento #${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="percentage"
                          stroke="#3B82F6"
                          strokeWidth={3}
                          dot={{
                            fill: "#3B82F6",
                            r: 6,
                            strokeWidth: 2,
                            stroke: "white",
                          }}
                          activeDot={{
                            r: 8,
                            stroke: "#3B82F6",
                            strokeWidth: 2,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Rendimiento por materia - CORREGIDO */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <BookOpen className="w-6 h-6 mr-2 text-green-600" />
                      Rendimiento por Materia
                    </h3>

                    {statistics?.hasSubjectData ? (
                      <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={statistics.subjectAverages}
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                              innerRadius={50}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="subject"
                            >
                              {statistics.subjectAverages.map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                )
                              )}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                              }}
                              formatter={(value, name, props) => [
                                `${value}%`,
                                `${props.payload.subject}`,
                              ]}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={36}
                              wrapperStyle={{ fontSize: "12px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>

                        {/* Resumen de materias */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="font-semibold text-gray-700 mb-3">
                            Resumen Detallado:
                          </h4>
                          <div className="space-y-2">
                            {statistics.subjectAverages.map(
                              (subject, index) => (
                                <div
                                  key={subject.subject}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex items-center">
                                    <div
                                      className="w-3 h-3 rounded-full mr-2"
                                      style={{
                                        backgroundColor:
                                          COLORS[index % COLORS.length],
                                      }}
                                    />
                                    <span className="text-sm font-medium">
                                      {subject.subject}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-bold">
                                      {subject.percentage}%
                                    </span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({subject.attempts} intentos)
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border-2 border-dashed border-gray-200">
                        <AlertTriangle className="w-12 h-12 text-gray-400 mb-4" />
                        <h4 className="text-lg font-medium text-gray-600 mb-2">
                          Sin Datos de Materias
                        </h4>
                        <p className="text-gray-500 text-center max-w-sm">
                          El estudiante aún no ha completado exámenes con
                          calificaciones por materias.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "progress" && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Clock className="w-6 h-6 mr-2 text-purple-600" />
                    Duración de Exámenes
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={statistics.progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                      <XAxis
                        dataKey="attempt"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(value) => [`${value} min`, "Duración"]}
                        labelFormatter={(label) => `Intento #${label}`}
                      />
                      <Bar
                        dataKey="duration"
                        fill="url(#barGradient)"
                        radius={[4, 4, 0, 0]}
                      >
                        <defs>
                          <linearGradient
                            id="barGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8B5CF6"
                              stopOpacity={0.9}
                            />
                            <stop
                              offset="95%"
                              stopColor="#A78BFA"
                              stopOpacity={0.7}
                            />
                          </linearGradient>
                        </defs>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeTab === "attempts" && (
                <div className="space-y-6">
                  {attempts.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">
                        Sin Intentos Registrados
                      </h3>
                      <p className="text-gray-500">
                        Este estudiante aún no ha realizado ningún intento de
                        examen.
                      </p>
                    </div>
                  ) : (
                    attempts.map((attempt, index) => (
                      <div
                        key={attempt.id}
                        className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Información general del intento */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-bold text-gray-800">
                                {exams[attempt.examId]?.title ||
                                  "Examen no disponible"}
                              </h3>
                              <span className="text-sm text-gray-500">
                                Intento #{attempts.length - index}
                              </span>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Estado:
                                </span>
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    attempt.status === "finished"
                                      ? "bg-green-100 text-green-800 border border-green-200"
                                      : attempt.status === "in-progress"
                                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                                      : "bg-red-100 text-red-800 border border-red-200"
                                  }`}
                                >
                                  {attempt.status === "finished" ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 inline mr-1" />
                                      COMPLETADO
                                    </>
                                  ) : attempt.status === "in-progress" ? (
                                    <>
                                      <Clock className="w-4 h-4 inline mr-1" />
                                      EN PROGRESO
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4 inline mr-1" />
                                      ABANDONADO
                                    </>
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Puntuación:
                                </span>
                                <span className="text-lg font-bold text-blue-600">
                                  {calculateAttemptPercentage(attempt)}%
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Duración:
                                </span>
                                <span className="text-gray-600">
                                  {calculateAttemptDuration(attempt)} minutos
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Inicio:
                                </span>
                                <span className="text-gray-600">
                                  {attempt.startedAt
                                    ?.toDate?.()
                                    ?.toLocaleString() || "—"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Finalización:
                                </span>
                                <span className="text-gray-600">
                                  {attempt.endedAt
                                    ?.toDate?.()
                                    ?.toLocaleString() || "—"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Resultados por materia */}
                          <div>
                            {attempt.scoreBySubject &&
                            Object.keys(attempt.scoreBySubject).length > 0 ? (
                              <div>
                                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                  <Target className="w-5 h-5 mr-2 text-blue-600" />
                                  Resultados por Materia
                                </h4>
                                <div className="space-y-3">
                                  {Object.entries(attempt.scoreBySubject).map(
                                    ([subject, score]) => {
                                      const percentage = Math.round(
                                        (score.correct / score.total) * 100
                                      );
                                      return (
                                        <div
                                          key={subject}
                                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-800">
                                              {subject}
                                            </span>
                                            <span
                                              className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                percentage >= 70
                                                  ? "bg-green-100 text-green-800"
                                                  : percentage >= 50
                                                  ? "bg-yellow-100 text-yellow-800"
                                                  : "bg-red-100 text-red-800"
                                              }`}
                                            >
                                              {percentage}%
                                            </span>
                                          </div>

                                          <div className="flex items-center justify-between text-sm text-gray-600">
                                            <span>
                                              {score.correct} de {score.total}{" "}
                                              correctas
                                            </span>
                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                              <div
                                                className={`h-2 rounded-full ${
                                                  percentage >= 70
                                                    ? "bg-green-500"
                                                    : percentage >= 50
                                                    ? "bg-yellow-500"
                                                    : "bg-red-500"
                                                }`}
                                                style={{
                                                  width: `${percentage}%`,
                                                }}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                <AlertTriangle className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-gray-500 text-sm">
                                  Sin resultados por materia disponibles
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Mensaje cuando no se encuentra estudiante */}
      {searchEmail && !loading && !student && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-xl shadow-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-yellow-800">
                Estudiante No Encontrado
              </h3>
              <p className="text-yellow-700 mt-1">
                No se encontró ningún estudiante registrado con el correo:{" "}
                <strong>{searchEmail}</strong>
              </p>
              <p className="text-yellow-600 text-sm mt-2">
                Verifica que el correo electrónico esté escrito correctamente y
                que el estudiante esté registrado en el sistema.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
