import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import { login } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import { auth, db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function Login() {
  const nav = useNavigate();
  const { user, role, loading } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Redirigir usuario autenticado
  useEffect(() => {
    if (!loading) {
      if (user?.emailVerified && role) {
        if (role === "admin") {
          nav("/admin", { replace: true });
        } else if (role === "student") {
          nav("/student", { replace: true });
        }
      }
    }
  }, [user, role, loading, nav]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const userCredential = await login(form);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await Swal.fire({
          icon: "warning",
          title: "Verifica tu correo",
          text: "Debes validar tu correo electrónico antes de ingresar.",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#3B82F6",
        });
        setSubmitting(false);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      if (userData.pendingApproval) {
        await Swal.fire({
          icon: "info",
          title: "Acceso Pendiente",
          html: `
          <div class="text-left">
            <p class="mb-4">Tu cuenta está pendiente de aprobación por un administrador.</p>
            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="text-sm text-blue-800">
                Por favor, contacta al administrador para solicitar acceso al sistema.
              </p>
            </div>
          </div>
        `,
          confirmButtonText: "Entendido",
          confirmButtonColor: "#3B82F6",
        });
        await signOut(auth);
        setSubmitting(false);
        return;
      }

      if (userData.blocked) {
        await Swal.fire({
          icon: "error",
          title: "Cuenta Bloqueada",
          html: `
          <div class="text-left">
            <p class="mb-4">Tu cuenta ha sido bloqueada por un administrador.</p>
            <div class="bg-red-50 p-4 rounded-lg">
              <p class="text-sm text-red-800">
                Por favor, contacta al administrador para más información.
              </p>
            </div>
          </div>
        `,
          confirmButtonText: "Entendido",
          confirmButtonColor: "#EF4444",
        });
        await signOut(auth);
        setSubmitting(false);
        return;
      }

      await Swal.fire({
        icon: "success",
        title: "¡Bienvenido!",
        timer: 1500,
        showConfirmButton: false,
      });
      nav(userData.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      console.error("Error en login:", err);
      let msg = "";

      switch (err.message) {
        case "user-blocked":
          msg = "Tu cuenta está bloqueada. Contacta al administrador.";
          break;
        case "pending-approval":
          msg = "Tu cuenta está pendiente de aprobación.";
          break;
        case "invalid-credentials":
          msg = "Credenciales inválidas. Verifica tu email y contraseña.";
          break;
        case "email-not-verified":
          msg = "Por favor verifica tu correo electrónico.";
          break;
        default:
          msg = "Error al iniciar sesión. Inténtalo de nuevo.";
      }

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="w-full max-w-md mx-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-2xl shadow-2xl space-y-6 border border-gray-100"
          autoComplete="on"
        >
          {/* 🎨 HEADER CON ESTILO MEJORADO */}
          <div className="text-center mb-6">
            <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-yellow-500 mx-auto rounded-full mb-4"></div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-gray-600 text-sm">
              Accede a tu cuenta para continuar
            </p>
          </div>

          {/* 📧 CAMPO EMAIL */}
          <div className="space-y-2">
            <label
              className="block font-semibold text-gray-700"
              htmlFor="login-email"
            >
              Correo Electrónico
            </label>
            <input
              id="login-email"
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
              autoComplete="email"
              disabled={submitting}
              placeholder="tu@email.com"
            />
          </div>

          {/* 🔒 CAMPO CONTRASEÑA */}
          <div className="space-y-2">
            <label
              className="block font-semibold text-gray-700"
              htmlFor="login-password"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPass ? "text" : "password"}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                disabled={submitting}
                placeholder="Tu contraseña"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 text-xl"
                onClick={() => setShowPass((s) => !s)}
                aria-label={
                  showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                disabled={submitting}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>

            {/* 🔗 ENLACE RECUPERAR CONTRASEÑA */}
            <div className="text-right">
              <Link
                to="/reset-password"
                className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium transition-colors"
                title="Recuperar contraseña"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {/* 🚀 BOTÓN ENVIAR */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Verificando...
              </span>
            ) : (
              "Iniciar Sesión"
            )}
          </button>

          {/* 📝 ENLACE REGISTRO */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              ¿No tienes cuenta?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-800 hover:underline font-semibold transition-colors"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
