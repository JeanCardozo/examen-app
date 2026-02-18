import React from "react";
import { useNavigate } from "react-router-dom";

const cards = [
  {
    title: "Crear Examen",
    desc: "Crea nuevos exámenes y asígnalos a los estudiantes.",
    to: "/admin/create-exam",
    icon: "📝",
  },
  {
    title: "Gestionar Preguntas",
    desc: "Agrega, edita o elimina preguntas del banco de preguntas.",
    to: "/admin/questions",
    icon: "❓",
  },
  {
    title: "Gestionar Materias",
    desc: "Agrega, edita o elimina materias.",
    to: "/admin/subjects",
    icon: "📚",
  },
  {
    title: "Gestionar Administradores",
    desc: "Agrega o elimina cuentas de administradores.",
    to: "/admin/admins",
    icon: "👤",
  },
  {
    title: "Ver Intentos",
    desc: "Consulta los intentos y resultados de los estudiantes.",
    to: "/admin/attempts",
    icon: "📊",
  },
  {
    title: "Bloquear Estudiantes",
    desc: "Bloquea o desbloquea estudiantes por correo.",
    to: "/admin/block-student",
    icon: "🚫",
  },
];

export default function AdminDashboard() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-primaryBlue mb-6 flex items-center gap-2">
          <span role="img" aria-label="Admin">
            🛡️
          </span>
          Panel de Administración
        </h1>
        <p className="mb-8 text-gray-600 text-lg">
          Bienvenido al panel de control. Selecciona una opción para gestionar
          la plataforma.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card) => (
            <button
              key={card.title}
              onClick={() => nav(card.to)}
              className="bg-blue rounded-xl shadow-md p-6 flex flex-col items-start hover:shadow-xl transition border border-transparent hover:border-primaryBlue focus:outline-primaryBlue focus:ring-2 focus:ring-primaryBlue cursor-pointer"
            >
              <div className="text-4xl mb-3">{card.icon}</div>
              <h2 className="text-xl font-semibold text-primaryBlue mb-1">
                {card.title}
              </h2>
              <p className="text-gray-600">{card.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
