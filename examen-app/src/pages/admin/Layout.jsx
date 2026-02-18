import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { auth } from "../../services/firebase";
import Swal from "sweetalert2";

export default function LayoutAdmin() {
  const nav = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
      text: "¿Estás seguro de que deseas cerrar sesión?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      await auth.signOut();
      Swal.fire({
        icon: "success",
        title: "Sesión cerrada",
        text: "Has cerrado sesión correctamente.",
        timer: 1200,
        showConfirmButton: false,
      });
      nav("/login");
    }
  };

  const linkBase =
    "py-2 px-3 rounded transition font-medium text-white hover:bg-blue-800 hover:text-white";
  const linkActive = "bg-blue-800 text-primaryBlue font-bold shadow";

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-primaryBlue flex flex-col justify-between py-8 px-6">
        <div>
          <h2 className="text-2xl font-bold mb-8 text-white">Panel Admin</h2>
          <nav className="flex flex-col gap-2">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ""}`
              }
            >
              Inicio
            </NavLink>
            <NavLink
              to="/admin/create-exam"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ""}`
              }
            >
              Crear Examen
            </NavLink>
            <NavLink
              to="/admin/questions"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ""}`
              }
            >
              Gestionar Preguntas
            </NavLink>
            <NavLink
              to="/admin/subjects"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ""}`
              }
            >
              Gestionar Materias
            </NavLink>
            <NavLink
              to="/admin/admins"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ""}`
              }
            >
              Gestionar Admins
            </NavLink>
            <NavLink
              to="/admin/attempts"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ""}`
              }
            >
              Ver Intentos
            </NavLink>
            <NavLink
              to="/admin/block-student"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ""}`
              }
            >
              Bloquear Estudiantes
            </NavLink>
          </nav>
        </div>
        <div>
          <div className="mb-4 text-sm text-white">
            <span className="block font-semibold break-all">{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-accentYellow text-primaryBlue font-bold py-2 rounded hover:bg-yellow-400 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Outlet />
      </main>
    </div>
  );
}
