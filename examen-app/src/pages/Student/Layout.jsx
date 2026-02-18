import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { ChevronUp, Sparkles, Heart, Globe, Mail, Phone } from "lucide-react";

export default function LayoutStudent() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const location = useLocation();

  // Actualizar hora cada minuto
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Manejar botón de scroll to top
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Obtener título de la página según la ruta
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("/exams")) return "Exámenes Disponibles";
    if (path.includes("/progress")) return "Mi Progreso Académico";
    if (path.includes("/history")) return "Historial de Exámenes";
    if (path.includes("/dashboard")) return "Panel Principal";
    return "Centro de Aprendizaje";
  };

  const isDashboard =
    location.pathname.includes("/dashboard") ||
    location.pathname === "/student";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-x-hidden">
      {/* Elementos decorativos de fondo mejorados */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Burbujas flotantes animadas */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-40 right-20 w-48 h-48 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-56 h-56 bg-gradient-to-br from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>

        {/* Patrón de puntos mejorado */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(59,130,246,0.15)_2px,transparent_0)] bg-[length:40px_40px] opacity-60"></div>

        {/* Líneas decorativas */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-300/30 to-transparent"></div>
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-300/30 to-transparent"></div>
        </div>
      </div>

      {/* Navbar mejorada */}
      <div className="relative z-50">
        <div className="bg-white/90 backdrop-blur-xl border-b border-white/30 shadow-xl">
          <Navbar />
        </div>

        {/* Breadcrumb/Título de página mejorado (solo si no es dashboard) */}
        {!isDashboard && (
          <div className="bg-white/70 backdrop-blur-lg border-b border-white/20 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-2 h-12 rounded-full shadow-lg"></div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    {getPageTitle()}
                  </h1>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-sm text-gray-500 font-medium">
                      {currentTime.toLocaleDateString("es-ES", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <p className="text-sm text-gray-500">
                      {currentTime.toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <main className="relative z-10 flex-1">
        {isDashboard ? (
          // Para el dashboard, mantenemos el diseño sin contenedor
          <div className="w-full">
            <Outlet />
          </div>
        ) : (
          // Para otras páginas, usamos un contenedor con estilo mejorado
          <div className="min-h-screen pt-8 pb-16">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
                {/* Header del contenido mejorado */}
                <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 p-8 border-b border-gray-100/50 relative overflow-hidden">
                  {/* Elementos decorativos */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl"></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
                        <div>
                          <span className="text-gray-600 font-semibold text-lg">
                            Sección Activa
                          </span>
                          <div className="text-sm text-gray-500 mt-1">
                            PI.ICS - Plataforma Educativa
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200/50">
                        <div className="text-sm text-gray-600 font-medium">
                          {currentTime.toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido de la página */}
                <div className="p-8 md:p-12">
                  <Outlet />
                </div>

                {/* Decoración inferior mejorada */}
                <div className="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 shadow-lg"></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer completamente rediseñado */}
      <footer className="relative z-10 mt-auto">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white relative overflow-hidden">
          {/* Onda decorativa superior mejorada */}
          <div className="relative overflow-hidden">
            <svg
              className="w-full h-12 text-white transform scale-110"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
            >
              <path
                d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
                opacity=".25"
                fill="currentColor"
              ></path>
              <path
                d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
                opacity=".5"
                fill="currentColor"
              ></path>
              <path
                d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
                fill="currentColor"
              ></path>
            </svg>
          </div>

          {/* Contenido del footer mejorado */}
          <div className="px-8 py-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center">
                {/* Logo/Título mejorado */}
                <div className="mb-8">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="bg-white text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg">
                      P
                    </div>
                    <h3 className="text-3xl font-bold">PI.ICS</h3>
                  </div>
                  <p className="text-blue-100 text-lg font-medium">
                    Transformando el aprendizaje, un examen a la vez
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-blue-200 text-sm">
                      Innovación Educativa
                    </span>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </div>

                {/* Estadísticas rápidas mejoradas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                    <div className="text-3xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">
                      24/7
                    </div>
                    <div className="text-blue-100 font-medium">
                      Disponibilidad Total
                    </div>
                    <div className="text-blue-200 text-sm mt-1">
                      Siempre disponible para ti
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                    <div className="text-3xl font-bold text-white mb-2 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      ∞
                    </div>
                    <div className="text-blue-100 font-medium">
                      Oportunidades
                    </div>
                    <div className="text-blue-200 text-sm mt-1">
                      Sin límites para aprender
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                    <div className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2 group-hover:scale-110 transition-transform duration-300">
                      <Heart className="w-8 h-8 text-red-400 animate-pulse" />
                    </div>
                    <div className="text-blue-100 font-medium">
                      Hecho con Pasión
                    </div>
                    <div className="text-blue-200 text-sm mt-1">
                      Dedicación en cada detalle
                    </div>
                  </div>
                </div>

                {/* Información de contacto mejorada */}
                <div className="border-t border-white/20 pt-8">
                  <p className="text-white/95 mb-4 text-lg font-medium">
                    © {new Date().getFullYear()} PI.ICS — Plataforma Educativa
                    de Excelencia
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <a
                      href="mailto:wlaverde5@gmail.com"
                      className="flex items-center justify-center gap-2 text-blue-100 hover:text-white transition-colors duration-300 bg-white/10 rounded-xl p-3 hover:bg-white/20"
                    >
                      <Mail className="w-4 h-4" />
                      <span>wlaverde5@gmail.com</span>
                    </a>
                    <a
                      href="tel:+573124473537"
                      className="flex items-center justify-center gap-2 text-blue-100 hover:text-white transition-colors duration-300 bg-white/10 rounded-xl p-3 hover:bg-white/20"
                    >
                      <Phone className="w-4 h-4" />
                      <span>+57 312 4473537</span>
                    </a>
                    <a
                      href="https://examenes-c84bf.web.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-blue-100 hover:text-white transition-colors duration-300 bg-white/10 rounded-xl p-3 hover:bg-white/20"
                    >
                      <Globe className="w-4 h-4" />
                      <span>examenes-c84bf.web.app</span>
                    </a>
                  </div>

                  {/* Mensaje motivacional mejorado */}
                  <div className="bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-sm rounded-2xl px-8 py-4 inline-block border border-white/20">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                      <span className="text-white font-semibold text-lg">
                        Tu éxito es nuestro compromiso
                      </span>
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Botón de scroll to top mejorado */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-blue-500 to-purple-600 
            hover:from-blue-600 hover:to-purple-700 text-white p-4 rounded-2xl shadow-2xl 
            hover:shadow-blue-500/25 transition-all duration-300 hover:scale-110 group
            border border-white/20 backdrop-blur-sm"
          aria-label="Volver arriba"
        >
          <ChevronUp className="w-6 h-6 group-hover:animate-bounce" />
        </button>
      )}

      {/* Estilos CSS para animaciones mejoradas */}
      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }

          @keyframes float-delayed {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-15px);
            }
          }

          .animate-float {
            animation: float 6s ease-in-out infinite;
          }

          .animate-float-delayed {
            animation: float-delayed 8s ease-in-out infinite;
            animation-delay: 2s;
          }

          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }

          .animate-shimmer {
            animation: shimmer 3s linear infinite;
            background-size: 200% 100%;
          }

          @keyframes pulse-glow {
            0%, 100% {
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
            }
            50% {
              box-shadow: 0 0 40px rgba(139, 92, 246, 0.6);
            }
          }

          .animate-pulse-glow {
            animation: pulse-glow 3s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
}
