import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebase";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();

    // Validación básica
    if (!email.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Email requerido",
        text: "Por favor ingresa tu correo electrónico",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Swal.fire({
        icon: "error",
        title: "Email inválido",
        text: "Por favor ingresa un email válido",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setEmailSent(true);

      await Swal.fire({
        icon: "success",
        title: "¡Correo enviado!",
        html: `
          <div class="text-center">
            <p class="mb-3">Se ha enviado un enlace de recuperación a:</p>
            <div class="bg-green-50 p-3 rounded-lg mb-3">
              <p class="text-green-800 font-medium">${email}</p>
            </div>
            <div class="text-left text-sm text-gray-600">
              <p class="mb-2"><strong>Pasos a seguir:</strong></p>
              <ol class="list-decimal list-inside space-y-1">
                <li>Revisa tu bandeja de entrada</li>
                <li>Busca el email de recuperación</li>
                <li>Haz clic en el enlace</li>
                <li>Crea tu nueva contraseña</li>
              </ol>
            </div>
          </div>
        `,
        confirmButtonText: "Entendido",
        confirmButtonColor: "#10B981",
      });
    } catch (err) {
      console.error("Error enviando email:", err);
      let msg = err.message;

      if (msg.includes("user-not-found")) {
        msg = "No encontramos una cuenta con este email.";
      } else if (msg.includes("invalid-email")) {
        msg = "El formato del email no es válido.";
      } else if (msg.includes("too-many-requests")) {
        msg =
          "Demasiados intentos. Espera unos minutos antes de intentar de nuevo.";
      } else {
        msg = "Error al enviar el correo. Inténtalo de nuevo.";
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
        confirmButtonColor: "#3B82F6",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="w-full max-w-md mx-4">
        <form
          onSubmit={handleReset}
          className="bg-white p-8 rounded-2xl shadow-2xl space-y-6 border border-gray-100"
          autoComplete="on"
        >
          {/* 🎨 HEADER CON ESTILO MEJORADO */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m0 0V9a2 2 0 012-2m-2 2V7a4 4 0 118 0v2m-8 0V9a2 2 0 012-2m0 0a2 2 0 012-2 2 2 0 00-2-2z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Recuperar Contraseña
            </h2>
            <p className="text-gray-600 text-sm">
              Te enviaremos un enlace para restablecer tu contraseña
            </p>
          </div>

          {!emailSent ? (
            <>
              {/* 📧 CAMPO EMAIL */}
              <div className="space-y-2">
                <label
                  className="block font-semibold text-gray-700"
                  htmlFor="reset-email"
                >
                  Correo Electrónico
                </label>
                <input
                  id="reset-email"
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  disabled={loading}
                  placeholder="tu@email.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa el email asociado a tu cuenta
                </p>
              </div>

              {/* 🚀 BOTÓN ENVIAR */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
                    Enviando...
                  </span>
                ) : (
                  "Enviar Enlace de Recuperación"
                )}
              </button>
            </>
          ) : (
            /* 📧 MENSAJE DE ÉXITO */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  ¡Correo Enviado!
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Revisa tu bandeja de entrada y sigue las instrucciones
                </p>
                <div className="bg-green-50 p-3 rounded-lg text-sm text-green-800">
                  <strong>Enviado a:</strong> {email}
                </div>
              </div>

              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="text-orange-600 hover:text-orange-800 font-medium text-sm hover:underline transition-colors"
              >
                ¿No recibiste el correo? Intentar de nuevo
              </button>
            </div>
          )}

          {/* 📝 ENLACE VOLVER */}
          <div className="text-center pt-4 border-t border-gray-200">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline font-semibold transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
