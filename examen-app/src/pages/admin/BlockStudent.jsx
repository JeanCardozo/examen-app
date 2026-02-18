import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Search, User, UserX, UserCheck, CheckCircle } from "lucide-react"; // 🔥 Agregar CheckCircle
import Spinner from "../../components/Spinner";
import {
  toggleUserBlockStatus,
  approveStudent,
} from "../../services/authService";
import Swal from "sweetalert2";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, blocked

  useEffect(() => {
    loadUsers();
  }, []);

  const handleError = async (error, message) => {
    console.error(message, error);
    await Swal.fire({
      icon: "error",
      title: "Error",
      text: message,
      confirmButtonColor: "#EF4444",
    });
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "users"), where("role", "==", "student"));
      const querySnapshot = await getDocs(q);

      const usersData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        // Convertir timestamps a Date
        const registeredAt = data.registeredAt?.toDate?.() || new Date();
        const approvedAt = data.approvedAt?.toDate?.() || null;
        const blockedAt = data.blockedAt?.toDate?.() || null;

        return {
          id: doc.id,
          ...data,
          registeredAt,
          approvedAt,
          blockedAt,
        };
      });

      setUsers(usersData);
    } catch (error) {
      handleError(error, "Error al cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  const [filterApproval, setFilterApproval] = useState("all"); // all, pending, approved

  // Modificar el filtrado
  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        // Filtro por término de búsqueda
        const matchesSearch =
          searchTerm === "" ||
          (user.displayName &&
            user.displayName
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (user.email &&
            user.email.toLowerCase().includes(searchTerm.toLowerCase()));

        // Filtro por estado de aprobación
        const matchesApproval =
          filterApproval === "all" ||
          (filterApproval === "pending" && user.pendingApproval) ||
          (filterApproval === "approved" && !user.pendingApproval);

        // Filtro por estado de bloqueo
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "active" && !user.blocked) ||
          (filterStatus === "blocked" && user.blocked);

        return matchesSearch && matchesApproval && matchesStatus;
      })
      .sort((a, b) => {
        // Ordenar primero los pendientes de aprobación
        if (a.pendingApproval && !b.pendingApproval) return -1;
        if (!a.pendingApproval && b.pendingApproval) return 1;
        // Luego por fecha de registro (usando getTime en lugar de toMillis)
        return (
          (b.registeredAt?.getTime() || 0) - (a.registeredAt?.getTime() || 0)
        );
      });
  }, [users, searchTerm, filterStatus, filterApproval]);

  // Agregar función para aprobar estudiante

  const handleApproveStudent = async (userId) => {
    try {
      setUpdating(userId);

      const result = await Swal.fire({
        title: "¿Aprobar acceso?",
        html: `
          <div class="text-left">
            <p class="mb-4">Al aprobar el acceso:</p>
            <ul class="list-disc pl-5 text-sm">
              <li>El estudiante podrá iniciar sesión</li>
              <li>Tendrá acceso a exámenes asignados</li>
              <li>Se desbloqueará su cuenta automáticamente</li>
            </ul>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Sí, aprobar acceso",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        await approveStudent(userId);

        // Actualizar estado local
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  blocked: false,
                  pendingApproval: false,
                  approvedAt: new Date(),
                }
              : user
          )
        );

        await Swal.fire({
          icon: "success",
          title: "¡Acceso Aprobado!",
          text: "El estudiante ya puede acceder al sistema",
          timer: 2000,
          showConfirmButton: false,
        });

        // Recargar datos
        await loadUsers();
      }
    } catch (error) {
      handleError(error, "Error al aprobar el acceso del estudiante");
    } finally {
      setUpdating(null);
    }
  };

  // Agregar la función handleToggleBlock:
  const handleToggleBlock = async (userId, blocked) => {
    try {
      setUpdating(userId);

      const result = await Swal.fire({
        title: `¿${blocked ? "Bloquear" : "Desbloquear"} estudiante?`,
        html: `
        <div class="text-left">
          <p class="mb-4">Al ${blocked ? "bloquear" : "desbloquear"}:</p>
          <ul class="list-disc pl-5 text-sm">
            <li>El estudiante ${blocked ? "no" : ""} podrá iniciar sesión</li>
            <li>${blocked ? "No" : ""} tendrá acceso a exámenes</li>
            <li>Se mantendrá su historial y datos</li>
          </ul>
        </div>
      `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: blocked ? "#EF4444" : "#10B981",
        cancelButtonColor: "#6B7280",
        confirmButtonText: blocked ? "Sí, bloquear" : "Sí, desbloquear",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        await toggleUserBlockStatus(userId, blocked);

        // Actualizar estado local
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  blocked,
                  blockedAt: blocked ? new Date() : null,
                }
              : user
          )
        );

        await Swal.fire({
          icon: "success",
          title: `¡Estudiante ${blocked ? "bloqueado" : "desbloqueado"}!`,
          text: blocked
            ? "El estudiante no podrá acceder al sistema"
            : "El estudiante ya puede acceder al sistema",
          timer: 2000,
          showConfirmButton: false,
        });

        // Recargar datos
        await loadUsers();
      }
    } catch (error) {
      handleError(
        error,
        `Error al ${blocked ? "bloquear" : "desbloquear"} estudiante`
      );
    } finally {
      setUpdating(null);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Estudiantes
        </h1>
        <p className="text-gray-600">
          Administra el acceso de los estudiantes al sistema
        </p>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Buscador */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Buscar por nombre o correo electrónico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <span className="text-gray-400 hover:text-gray-600 text-xl">
                  ×
                </span>
              </button>
            )}
          </div>

          {/* Filtro por estado */}
          <div className="lg:w-48">
            <select
              value={filterApproval}
              onChange={(e) => setFilterApproval(e.target.value)}
              className="block w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes de Aprobación</option>
              <option value="approved">Aprobados</option>
            </select>
          </div>
        </div>

        {/* Estadísticas de búsqueda */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Mostrando {filteredUsers.length} de {users.length} estudiantes
          </span>
          {searchTerm && (
            <span>
              Resultados para: "<strong>{searchTerm}</strong>"
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-center">
            <Spinner />
            <span className="ml-3 text-gray-600">Cargando estudiantes...</span>
          </div>
        </div>
      ) : (
        <>
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-center">
                <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || filterStatus !== "all"
                    ? "No se encontraron estudiantes"
                    : "No hay estudiantes registrados"}
                </h3>
                <p className="text-gray-600">
                  {searchTerm || filterStatus !== "all"
                    ? "Intenta modificar los filtros de búsqueda"
                    : "Los estudiantes aparecerán aquí cuando se registren"}
                </p>
                {(searchTerm || filterStatus !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStatus("all");
                    }}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estudiante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Correo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aprobación
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.displayName || "Sin nombre"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.blocked
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {user.blocked ? "Bloqueado" : "Activo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {user.pendingApproval ? (
                            <button
                              onClick={() => handleApproveStudent(user.id)}
                              disabled={updating === user.id}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mr-2"
                            >
                              {updating === user.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Procesando...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aprobar Acceso
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprobado
                            </span>
                          )}

                          <button
                            onClick={() =>
                              handleToggleBlock(user.id, !user.blocked)
                            }
                            disabled={
                              updating === user.id || user.pendingApproval
                            }
                            className={`inline-flex items-center px-3 py-2 border text-sm leading-4 font-medium rounded-md transition-colors
      ${
        user.blocked
          ? "border-green-500 text-green-600 hover:bg-green-50"
          : "border-red-500 text-red-600 hover:bg-red-50"
      }
      ${
        (updating === user.id || user.pendingApproval) &&
        "opacity-50 cursor-not-allowed"
      }
    `}
                          >
                            {updating === user.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                Procesando...
                              </>
                            ) : user.blocked ? (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Desbloquear
                              </>
                            ) : (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Bloquear
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
