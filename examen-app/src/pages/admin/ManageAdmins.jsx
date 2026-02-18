import React, { useState, useRef, useMemo } from "react";
import Swal from "sweetalert2";
import {
  createAdmin,
  updateCurrentUserPassword,
  deleteAdmin,
} from "../../services/authService";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { auth } from "../../services/firebase";
import Spinner from "../../components/Spinner";
import { useAuth } from "../../contexts/AuthContext";

export default function ManageAdmins() {
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef(null);
  const { user } = useAuth();

  // Cargar todos los admins
  const adminFilters = useMemo(() => [["role", "==", "admin"]], []);
  const adminSorting = useMemo(() => [["createdAt", "desc"]], []);

  const { data: admins = [], loading } = useFirestoreCollection("users", {
    filters: adminFilters,
    sorting: adminSorting,
  });

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!form.displayName.trim()) {
      Swal.fire({
        icon: "error",
        title: "Campo requerido",
        text: "El nombre es obligatorio",
        confirmButtonColor: "#EF4444",
      });
      return false;
    }

    if (!validateEmail(form.email)) {
      Swal.fire({
        icon: "error",
        title: "Email inválido",
        text: "Por favor ingresa un email válido",
        confirmButtonColor: "#EF4444",
      });
      return false;
    }

    if (form.password.length < 6) {
      Swal.fire({
        icon: "error",
        title: "Contraseña débil",
        text: "La contraseña debe tener al menos 6 caracteres",
        confirmButtonColor: "#EF4444",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // Mostrar indicador de carga
      const loadingAlert = Swal.fire({
        title: "Creando administrador...",
        text: "Por favor espera",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        },
      });

      // Crear el nuevo admin
      await createAdmin(form);

      // Cerrar indicador de carga
      await loadingAlert.close();

      // Mostrar mensaje de éxito
      await Swal.fire({
        icon: "success",
        title: "¡Administrador creado!",
        text: "Se ha enviado un email de verificación al nuevo administrador.",
        confirmButtonColor: "#3B82F6",
      });

      // Resetear formulario
      setForm({ displayName: "", email: "", password: "" });
      setTimeout(() => nameInputRef.current?.focus(), 100);
    } catch (err) {
      console.error("Error creating admin:", err);
      let errorMessage = "Error al crear el administrador.";

      if (err.code === "auth/email-already-in-use") {
        errorMessage = "Este email ya está registrado.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "El formato del email no es válido.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      }

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (admin) => {
    if (admin.email === user.email) {
      Swal.fire("Error", "No puedes eliminar tu propio usuario.", "error");
      return;
    }
    const res = await Swal.fire({
      title: "¿Eliminar administrador?",
      text: `¿Seguro que deseas eliminar a ${admin.displayName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (res.isConfirmed) {
      await deleteAdmin(admin.id);
      Swal.fire("Eliminado", "Administrador eliminado.", "success");
    }
  };

  const handleChangeMyPassword = async () => {
    try {
      // Paso 1: Pedir contraseña actual
      const { value: currentPassword } = await Swal.fire({
        title: "Verificación necesaria",
        input: "password",
        inputLabel: "Ingresa tu contraseña actual",
        inputPlaceholder: "Contraseña actual",
        showCancelButton: true,
        inputValidator: (value) => {
          if (!value) return "La contraseña actual es requerida";
        },
      });

      if (!currentPassword) return;

      // Paso 2: Pedir nueva contraseña
      const { value: newPassword } = await Swal.fire({
        title: "Cambiar mi contraseña",
        input: "password",
        inputLabel: "Nueva contraseña (mínimo 6 caracteres)",
        inputPlaceholder: "Ingresa la nueva contraseña",
        showCancelButton: true,
        inputValidator: (value) => {
          if (!value || value.length < 6) {
            return "La contraseña debe tener al menos 6 caracteres";
          }
        },
      });

      if (!newPassword) return;

      // Paso 3: Confirmar nueva contraseña
      const { value: confirmPassword } = await Swal.fire({
        title: "Confirmar nueva contraseña",
        input: "password",
        inputLabel: "Confirma tu nueva contraseña",
        inputPlaceholder: "Confirma la nueva contraseña",
        showCancelButton: true,
        inputValidator: (value) => {
          if (!value) return "Debes confirmar la contraseña";
          if (value !== newPassword) return "Las contraseñas no coinciden";
        },
      });

      if (!confirmPassword) return;

      // Paso 4: Actualizar contraseña
      await updateCurrentUserPassword(currentPassword, newPassword);

      Swal.fire(
        "¡Contraseña actualizada!",
        "Tu contraseña ha sido cambiada correctamente",
        "success"
      );
    } catch (err) {
      console.error("Error changing password:", err);

      if (err.code === "auth/wrong-password") {
        Swal.fire("Error", "La contraseña actual es incorrecta", "error");
      } else if (err.code === "auth/requires-recent-login") {
        Swal.fire(
          "Error",
          "Por seguridad, debes iniciar sesión nuevamente",
          "error"
        );
      } else {
        Swal.fire("Error", "No se pudo cambiar la contraseña", "error");
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Administradores</h1>
        <button
          onClick={handleChangeMyPassword}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium"
        >
          Cambiar mi contraseña
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow mb-6 space-y-3"
        autoComplete="off"
      >
        <div>
          <label className="block font-medium" htmlFor="admin-name">
            Nombre Completo
          </label>
          <input
            id="admin-name"
            ref={nameInputRef}
            type="text"
            className="mt-1 w-full border p-2 rounded"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            required
            disabled={submitting}
            autoFocus
          />
        </div>
        <div>
          <label className="block font-medium" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            className="mt-1 w-full border p-2 rounded"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block font-medium" htmlFor="admin-password">
            Contraseña
          </label>
          <input
            id="admin-password"
            type="password"
            className="mt-1 w-full border p-2 rounded"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            disabled={submitting}
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          className={`
            w-full px-4 py-2 
            bg-primaryBlue text-white 
            rounded-lg font-medium
            transition duration-200
            ${
              submitting ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
            }
          `}
          disabled={submitting}
        >
          {submitting ? (
            <div className="flex items-center justify-center">
              <Spinner size="small" />
              <span className="ml-2">Creando administrador...</span>
            </div>
          ) : (
            "Crear Administrador"
          )}
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Lista de Admins</h2>
      {loading ? (
        <Spinner />
      ) : admins.length === 0 ? (
        <div className="text-gray-500">No hay administradores registrados.</div>
      ) : (
        <ul className="space-y-2">
          {admins.map((a) => (
            <li
              key={a.id}
              className="p-3 bg-white rounded shadow flex justify-between items-center"
            >
              <div>
                <span className="font-medium">{a.displayName}</span>
                <span className="text-gray-600"> — {a.email}</span>
                {a.id === auth.currentUser?.uid && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Tú
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {a.id !== auth.currentUser?.uid && (
                  <button
                    className="text-red-500 hover:text-red-700 font-medium"
                    onClick={() => handleDelete(a)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
