import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../services/authService";

export default function Navbar() {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();

  const handleLogout = async () => {
    await logout();
    await Swal.fire({
      icon: "info",
      title: "Sesión cerrada",
      showConfirmButton: false,
      timer: 1500,
    });
    nav("/login");
  };

  if (loading) return null; // Opcional: muestra un loader si lo prefieres

  return (
    <nav className="bg-primaryBlue text-white px-4 py-3 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold">
        ExamenApp
      </Link>
      <div className="space-x-4">
        {user ? (
          <>
            <span className="hidden sm:inline">Hola, {user.displayName}</span>
            {/* Opciones según el rol */}
            {role === "admin" && (
              <Link to="/admin" className="hover:underline">
                Panel Admin
              </Link>
            )}
            {role === "student" && (
              <Link to="/mis-examenes" className="hover:underline">
                Mis Exámenes
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="bg-white text-primaryBlue px-3 py-1 rounded hover:bg-gray-100 transition"
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:underline">
              Iniciar sesión
            </Link>
            <Link to="/register" className="hover:underline">
              Registrarse
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
