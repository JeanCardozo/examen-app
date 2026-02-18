import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import { registerStudent } from "../services/authService";

export default function Register() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Validación mejorada
  const validate = () => {
    if (!form.displayName.trim() || form.displayName.length < 2) {
      Swal.fire({
        icon: "error",
        title: "Nombre inválido",
        text: "El nombre debe tener al menos 2 caracteres",
        confirmButtonColor: "#3B82F6",
      });
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(form.email)) {
      Swal.fire({
        icon: "error",
        title: "Email inválido",
        text: "Por favor ingresa un email válido",
        confirmButtonColor: "#3B82F6",
      });
      return false;
    }

    if (form.password.length < 6) {
      Swal.fire({
        icon: "error",
        title: "Contraseña muy corta",
        text: "La contraseña debe tener al menos 6 caracteres",
        confirmButtonColor: "#3B82F6",
      });
      return false;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(form.password)) {
      Swal.fire({
        icon: "warning",
        title: "Contraseña débil",
        text: "Se recomienda usar mayúsculas y minúsculas para mayor seguridad",
        confirmButtonColor: "#3B82F6",
      });
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await registerStudent(form);

      // 🔥 Mostrar mensaje de éxito más informativo
      await Swal.fire({
        icon: "success",
        title: "¡Registro exitoso!",
        html: `
        <div class="text-left">
          <p class="mb-4">Tu cuenta ha sido creada correctamente.</p>
          <div class="bg-blue-50 p-4 rounded-lg mb-4">
            <p class="text-blue-800 font-medium mb-2">📧 Pasos a seguir:</p>
            <ol class="list-decimal pl-5 text-sm text-blue-700">
              <li class="mb-2">Verifica tu correo electrónico (revisa tu bandeja)</li>
              <li class="mb-2">Contacta al administrador para aprobar tu acceso</li>
              <li>Una vez aprobado, podrás iniciar sesión</li>
            </ol>
          </div>
          <p class="text-gray-600 text-sm">
            ℹ️ Tu cuenta está pendiente de aprobación por un administrador.
          </p>
        </div>
      `,
        confirmButtonText: "Entendido",
        confirmButtonColor: "#10B981",
        allowOutsideClick: false,
      });

      nav("/login");
    } catch (err) {
      console.error("Error en registro:", err);
      let msg = err.code;

      switch (err.code) {
        case "auth/email-already-in-use":
          msg = "Este email ya está registrado";
          break;
        case "auth/invalid-email":
          msg = "El formato del email no es válido";
          break;
        case "auth/operation-not-allowed":
          msg = "El registro está deshabilitado temporalmente";
          break;
        case "auth/weak-password":
          msg = "La contraseña es muy débil. Usa al menos 6 caracteres";
          break;
        default:
          msg = "Error en el registro. Por favor, inténtalo de nuevo";
      }

      await Swal.fire({
        icon: "error",
        title: "Error en el registro",
        text: msg,
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 py-8">
      <div className="w-full max-w-md mx-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-2xl shadow-2xl space-y-6 border border-gray-100"
          autoComplete="on"
        >
          {/* 🎨 HEADER CON ESTILO MEJORADO */}
          <div className="text-center mb-6">
            <div className="w-20 h-1 bg-gradient-to-r from-green-600 to-blue-500 mx-auto rounded-full mb-4"></div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Crear Cuenta
            </h2>
            <p className="text-gray-600 text-sm">
              Únete a nuestra plataforma educativa
            </p>
          </div>

          {/* 👤 CAMPO NOMBRE */}
          <div className="space-y-2">
            <label
              className="block font-semibold text-gray-700"
              htmlFor="register-name"
            >
              Nombre Completo
            </label>
            <input
              id="register-name"
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              required
              autoFocus
              autoComplete="name"
              disabled={loading}
              placeholder="Tu nombre completo"
              minLength={2}
            />
          </div>

          {/* 📧 CAMPO EMAIL */}
          <div className="space-y-2">
            <label
              className="block font-semibold text-gray-700"
              htmlFor="register-email"
            >
              Correo Electrónico
            </label>
            <input
              id="register-email"
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              disabled={loading}
              placeholder="tu@email.com"
            />
          </div>

          {/* 🔒 CAMPO CONTRASEÑA */}
          <div className="space-y-2">
            <label
              className="block font-semibold text-gray-700"
              htmlFor="register-password"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPass ? "text" : "password"}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50 text-xl"
                onClick={() => setShowPass((s) => !s)}
                aria-label={
                  showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                disabled={loading}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>

            {/* 💡 INDICADOR DE SEGURIDAD */}
            <div className="text-xs text-gray-500 mt-1">
              <div className="flex items-center gap-1">
                <span
                  className={
                    form.password.length >= 6
                      ? "text-green-600"
                      : "text-gray-400"
                  }
                >
                  ✓ Mínimo 6 caracteres
                </span>
              </div>
            </div>
          </div>

          {/* 🚀 BOTÓN REGISTRAR */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? (
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
                Creando cuenta...
              </span>
            ) : (
              "Crear Cuenta"
            )}
          </button>

          {/* 📝 ENLACE LOGIN */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/login"
                className="text-green-600 hover:text-green-800 hover:underline font-semibold transition-colors"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
