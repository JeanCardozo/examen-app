import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  BookOpen,
  ChartBar,
  Clock,
  Award,
  TrendingUp,
  Calendar,
  Target,
  Star,
  Zap,
  Trophy,
  Activity,
  Sparkles,
  Brain,
  BookMarked,
} from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState({
    totalExams: 0,
    averageScore: 0,
    bestScore: 0,
    recentActivity: 0,
    totalMinutes: 0,
    streak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar hora cada segundo para el efecto dinámico
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar estadísticas del usuario
  useEffect(() => {
    const loadUserStats = async () => {
      try {
        const attemptsRef = collection(db, "attempts");
        const q = query(
          attemptsRef,
          where("userId", "==", user.uid),
          where("status", "==", "finished"),
          orderBy("startedAt", "desc")
        );
        const snapshot = await getDocs(q);
        const attempts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (attempts.length > 0) {
          // Calcular estadísticas
          const scores = attempts.map((attempt) => {
            const totalCorrect = Object.values(
              attempt.scoreBySubject || {}
            ).reduce((sum, score) => sum + (score.correct || 0), 0);
            const totalQuestions = Object.values(
              attempt.scoreBySubject || {}
            ).reduce((sum, score) => sum + (score.total || 0), 0);
            return totalQuestions
              ? Math.round((totalCorrect / totalQuestions) * 100)
              : 0;
          });

          const totalMinutes = attempts.reduce(
            (sum, attempt) => sum + (attempt.duration || 0),
            0
          );

          const recentActivity = attempts.filter((attempt) => {
            const attemptDate = attempt.startedAt?.toDate();
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return attemptDate && attemptDate > weekAgo;
          }).length;

          setStats({
            totalExams: attempts.length,
            averageScore: scores.length
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : 0,
            bestScore: scores.length ? Math.max(...scores) : 0,
            recentActivity,
            totalMinutes,
            streak: Math.min(recentActivity, 7), // Máximo 7 días de racha
          });
        }
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) {
      loadUserStats();
    }
  }, [user]);

  const modules = [
    {
      title: "Exámenes Disponibles",
      description: "Accede a nuevos desafíos y demuestra tu conocimiento",
      icon: <BookOpen className="w-8 h-8" />,
      path: "/student/exams",
      gradient: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700",
      hoverGradient: "hover:from-blue-600 hover:via-blue-700 hover:to-blue-800",
      shadowColor: "shadow-blue-500/25",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      glowColor: "group-hover:shadow-blue-500/40",
      badge: "🚀",
    },
    {
      title: "Mi Progreso Académico",
      description: "Analiza tu rendimiento con gráficos detallados",
      icon: <ChartBar className="w-8 h-8" />,
      path: "/student/progress",
      gradient:
        "bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700",
      hoverGradient:
        "hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800",
      shadowColor: "shadow-emerald-500/25",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      glowColor: "group-hover:shadow-emerald-500/40",
      badge: "📊",
    },
    {
      title: "Historial de Exámenes",
      description: "Revisa todos tus intentos y mejora continua",
      icon: <Clock className="w-8 h-8" />,
      path: "/student/history",
      gradient:
        "bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700",
      hoverGradient:
        "hover:from-purple-600 hover:via-purple-700 hover:to-purple-800",
      shadowColor: "shadow-purple-500/25",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      glowColor: "group-hover:shadow-purple-500/40",
      badge: "📚",
    },
  ];

  const quickStats = [
    {
      label: "Promedio General",
      value: `${stats.averageScore}%`,
      icon: <Target className="w-6 h-6" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change:
        stats.averageScore >= 70
          ? "⬆️"
          : stats.averageScore >= 50
          ? "➡️"
          : "⬇️",
    },
    {
      label: "Mejor Puntuación",
      value: `${stats.bestScore}%`,
      icon: <Trophy className="w-6 h-6" />,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      change: "🏆",
    },
    {
      label: "Exámenes Realizados",
      value: stats.totalExams,
      icon: <Award className="w-6 h-6" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      change: "📚",
    },
    {
      label: "Actividad Semanal",
      value: stats.recentActivity,
      icon: <Activity className="w-6 h-6" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: "🔥",
    },
  ];

  const getGreeting = () => {
    const hour = currentTime.getHours();
    const name = user?.displayName?.split(" ")[0] || "Estudiante";

    if (hour < 12) return `¡Buenos días, ${name}!`;
    if (hour < 18) return `¡Buenas tardes, ${name}!`;
    return `¡Buenas noches, ${name}!`;
  };

  const getMotivationalMessage = () => {
    if (stats.averageScore >= 90)
      return "¡Eres excepcional! Sigue brillando ⭐";
    if (stats.averageScore >= 80)
      return "¡Excelente trabajo! Estás en el camino correcto 🚀";
    if (stats.averageScore >= 70)
      return "¡Buen progreso! Cada día mejoras más 📈";
    if (stats.averageScore >= 60)
      return "¡Sigue adelante! El esfuerzo da frutos 💪";
    if (stats.totalExams > 0) return "¡Cada intento te acerca al éxito! 🎯";
    return "¡Bienvenido! Tu aventura de aprendizaje comienza aquí 🌟";
  };

  const getTimeBasedTheme = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) {
      return {
        bg: "from-orange-50 via-yellow-50 to-blue-50",
        accent: "from-orange-400 to-yellow-500",
        theme: "morning",
      };
    } else if (hour >= 12 && hour < 18) {
      return {
        bg: "from-blue-50 via-indigo-50 to-purple-50",
        accent: "from-blue-500 to-indigo-600",
        theme: "afternoon",
      };
    } else {
      return {
        bg: "from-purple-50 via-blue-50 to-indigo-50",
        accent: "from-purple-500 to-blue-600",
        theme: "evening",
      };
    }
  };

  const currentTheme = getTimeBasedTheme();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.bg} p-6`}>
      {/* Header Dinámico Mejorado */}
      <div className="mb-8">
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/30 relative overflow-hidden">
          {/* Elementos decorativos */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-400/20 to-blue-400/20 rounded-full blur-xl"></div>

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-3 h-3 rounded-full bg-gradient-to-r ${currentTheme.accent} animate-pulse`}
                  ></div>
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    PANEL ESTUDIANTIL
                  </span>
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-3 leading-tight">
                  {getGreeting()}
                </h1>

                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-purple-500" />
                  <p className="text-gray-700 text-lg font-medium">
                    {getMotivationalMessage()}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {currentTime.toLocaleDateString("es-ES", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {currentTime.toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Racha de Estudio Mejorada */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div
                  className={`bg-gradient-to-r ${currentTheme.accent} text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 animate-pulse" />
                    <div className="text-center">
                      <div className="font-bold text-lg">{stats.streak}</div>
                      <div className="text-xs opacity-90">
                        días consecutivos
                      </div>
                    </div>
                  </div>
                </div>

                {stats.totalExams > 0 && (
                  <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BookMarked className="w-4 h-4" />
                      <span>{stats.totalExams} exámenes completados</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas Mejoradas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {quickStats.map((stat, index) => (
          <div
            key={stat.label}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/30 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 relative overflow-hidden"
            style={{
              animationDelay: `${index * 150}ms`,
              animation: "fadeInUp 0.8s ease-out both",
            }}
          >
            {/* Efecto de brillo */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`${stat.bgColor} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}
                >
                  <div className={stat.color}>{stat.icon}</div>
                </div>
                <div className="text-2xl">{stat.change}</div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2 font-medium">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mensaje de Bienvenida Central Mejorado */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
          <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
            Tu Centro de Aprendizaje
          </h2>
          <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
        </div>
        <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
          Explora tus opciones de estudio, revisa tu progreso y alcanza nuevas
          metas académicas con{" "}
          <span className="font-bold text-purple-600">PI.ICS</span>
        </p>
      </div>

      {/* Módulos Principales Mejorados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {modules.map((module, index) => (
          <button
            key={module.title}
            onClick={() => nav(module.path)}
            className={`group relative ${module.gradient} ${module.hoverGradient} 
              p-8 rounded-3xl shadow-2xl ${module.shadowColor} ${module.glowColor}
              transform hover:scale-105 transition-all duration-700 
              hover:shadow-3xl text-white overflow-hidden backdrop-blur-sm`}
            style={{
              animationDelay: `${index * 250}ms`,
              animation: `fadeInUp 1s ease-out both`,
            }}
          >
            {/* Efecto de brillo mejorado */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1200"></div>

            {/* Patrones de fondo mejorados */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-700"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12 group-hover:scale-110 transition-transform duration-700"></div>
              <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
            </div>

            {/* Badge flotante */}
            <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
              {module.badge}
            </div>

            {/* Contenido mejorado */}
            <div className="relative z-10">
              <div
                className={`${module.iconBg} ${module.iconColor} w-20 h-20 rounded-2xl 
                flex items-center justify-center mb-6 mx-auto
                group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl`}
              >
                {module.icon}
              </div>

              <h3 className="text-2xl font-bold mb-4 text-center leading-tight">
                {module.title}
              </h3>

              <p className="text-white/90 text-center leading-relaxed mb-6">
                {module.description}
              </p>

              {/* Indicador de acción mejorado */}
              <div className="flex justify-center">
                <div
                  className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full 
                  font-medium group-hover:bg-white/30 transition-all duration-300
                  border border-white/30 group-hover:border-white/50"
                >
                  <span className="flex items-center gap-2">
                    Explorar
                    <TrendingUp className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Información adicional mejorada */}
      {!loading && stats.totalExams === 0 && (
        <div className="mt-16 text-center">
          <div className="max-w-md mx-auto">
            <div
              className={`bg-gradient-to-r ${currentTheme.accent} text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden`}
            >
              {/* Efectos decorativos */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-8 -translate-x-8"></div>

              <div className="relative z-10">
                <div className="text-6xl mb-6 animate-bounce">🚀</div>
                <h3 className="text-2xl font-bold mb-4">
                  ¡Comienza tu aventura!
                </h3>
                <p className="text-white/90 mb-6 leading-relaxed">
                  Realiza tu primer examen y comienza a construir tu historial
                  académico con PI.ICS
                </p>
                <button
                  onClick={() => nav("/student/exams")}
                  className="bg-white text-purple-600 px-8 py-3 rounded-2xl font-bold 
                    hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl
                    transform hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Ver Exámenes
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estilos CSS para animaciones */}
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .shadow-3xl {
            box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
          }

          @keyframes pulse-glow {
            0%, 100% {
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
            }
            50% {
              box-shadow: 0 0 40px rgba(59, 130, 246, 0.6);
            }
          }

          .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
}
