import React, { useState, useMemo } from "react";
import Swal from "sweetalert2";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import {
  createQuestionGroup,
  updateQuestionGroup,
  deleteQuestionGroup,
  MAX_QUESTIONS_PER_GROUP,
} from "../../services/questionGroupService";
import Spinner from "../../components/Spinner";

export default function ManageQuestionGroups({ onSelectGroup }) {
  const [newGroupText, setNewGroupText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Consultas optimizadas
  const groupSorting = useMemo(() => [["createdAt", "desc"]], []);

  const { data: groups = [], loading } = useFirestoreCollection(
    "questionGroups",
    {
      sorting: groupSorting,
    }
  );

  const { data: questions = [] } = useFirestoreCollection("questions", {
    filters: [["type", "==", "grouped"]],
    sorting: [["createdAt", "desc"]],
  });

  // Contador de preguntas por grupo
  const groupQuestionCounts = useMemo(() => {
    return questions.reduce((acc, q) => {
      if (q.groupId) {
        acc[q.groupId] = (acc[q.groupId] || 0) + 1;
      }
      return acc;
    }, {});
  }, [questions]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newGroupText.trim() || newGroupText.length < 10) {
      Swal.fire(
        "Error",
        "El enunciado debe tener al menos 10 caracteres",
        "error"
      );
      return;
    }

    setSubmitting(true);
    try {
      const docRef = await createQuestionGroup(newGroupText);

      setNewGroupText("");
      Swal.fire("¡Listo!", "Enunciado creado correctamente", "success");

      if (onSelectGroup) {
        onSelectGroup({
          id: docRef.id,
          text: newGroupText.trim(),
        });
      }
    } catch (err) {
      console.error("Error:", err);
      Swal.fire("Error", "No se pudo crear el enunciado", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (groupId) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    try {
      const { value: newText } = await Swal.fire({
        title: "Editar enunciado",
        input: "textarea",
        inputValue: group.text,
        inputValidator: (value) => {
          if (!value?.trim() || value.length < 10) {
            return "El enunciado debe tener al menos 10 caracteres";
          }
        },
        showCancelButton: true,
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
      });

      if (newText && newText !== group.text) {
        await updateQuestionGroup(groupId, newText);
        Swal.fire("¡Actualizado!", "Enunciado modificado", "success");
      }
    } catch (err) {
      console.error("Error:", err);
      Swal.fire("Error", "No se pudo actualizar", "error");
    }
  };

  const handleDelete = async (groupId) => {
    const questionCount = groupQuestionCounts[groupId] || 0;

    try {
      const result = await Swal.fire({
        title: "¿Eliminar enunciado?",
        html:
          questionCount > 0
            ? `Este enunciado tiene ${questionCount} pregunta${
                questionCount > 1 ? "s" : ""
              } asociada${questionCount > 1 ? "s" : ""}.<br><br>
             <strong class="text-red-600">¡ADVERTENCIA!</strong> Se eliminarán todas las preguntas.`
            : "No hay preguntas asociadas a este enunciado.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText:
          questionCount > 0 ? "Sí, eliminar todo" : "Sí, eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#d33",
      });

      if (result.isConfirmed) {
        await deleteQuestionGroup(groupId);
        Swal.fire("Eliminado", "Enunciado y preguntas eliminados", "success");
      }
    } catch (err) {
      console.error("Error:", err);
      Swal.fire("Error", "No se pudo eliminar", "error");
    }
  };

  const handleSelectGroup = (group) => {
    if (onSelectGroup) {
      onSelectGroup(group);
    }
  };

  const getGroupStatus = (groupId) => {
    const count = groupQuestionCounts[groupId] || 0;
    if (count === 0) return { status: "empty", color: "gray" };
    if (count >= MAX_QUESTIONS_PER_GROUP)
      return { status: "full", color: "red" };
    if (count >= MAX_QUESTIONS_PER_GROUP * 0.8)
      return { status: "almost-full", color: "yellow" };
    return { status: "available", color: "green" };
  };

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Enunciados Agrupadores</h2>
        <Spinner size="8" />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Enunciados Agrupadores</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? "Ocultar" : `Mostrar (${groups.length})`}
        </button>
      </div>

      {/* Formulario para crear nuevo enunciado */}
      <form onSubmit={handleAdd} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            className="border p-2 rounded flex-1"
            placeholder="Escribe el enunciado agrupador (mínimo 10 caracteres)"
            value={newGroupText}
            onChange={(e) => setNewGroupText(e.target.value)}
            required
            disabled={submitting}
            minLength={10}
          />
          <button
            type="submit"
            className="bg-primaryBlue text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={submitting || newGroupText.trim().length < 10}
          >
            {submitting ? "Creando..." : "Crear"}
          </button>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {newGroupText.length}/10 caracteres mínimos
        </div>
      </form>

      {/* Lista de enunciados */}
      {isExpanded && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No hay enunciados agrupadores creados
            </div>
          ) : (
            groups.map((group) => {
              const questionCount = groupQuestionCounts[group.id] || 0;
              const groupStatus = getGroupStatus(group.id);

              return (
                <div
                  key={group.id}
                  className="bg-white rounded-lg shadow p-3 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <button
                        onClick={() => handleSelectGroup(group)}
                        className="text-left w-full hover:text-blue-600 transition-colors"
                      >
                        <p className="font-medium text-gray-800 mb-1">
                          {group.text.length > 80
                            ? `${group.text.slice(0, 80)}...`
                            : group.text}
                        </p>
                      </button>

                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            groupStatus.color === "green"
                              ? "bg-green-100 text-green-800"
                              : groupStatus.color === "yellow"
                              ? "bg-yellow-100 text-yellow-800"
                              : groupStatus.color === "red"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {questionCount}/{MAX_QUESTIONS_PER_GROUP} preguntas
                        </span>

                        {groupStatus.status === "empty" && (
                          <span className="text-xs text-gray-500">
                            Sin preguntas
                          </span>
                        )}
                        {groupStatus.status === "full" && (
                          <span className="text-xs text-red-600">Completo</span>
                        )}
                        {groupStatus.status === "almost-full" && (
                          <span className="text-xs text-yellow-600">
                            Casi completo
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleSelectGroup(group)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        disabled={groupStatus.status === "full"}
                      >
                        {groupStatus.status === "full"
                          ? "Completo"
                          : "Seleccionar"}
                      </button>

                      <button
                        onClick={() => handleEdit(group.id)}
                        className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition-colors"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => handleDelete(group.id)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Resumen rápido cuando está colapsado */}
      {!isExpanded && groups.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {groups.length} enunciado{groups.length > 1 ? "s" : ""} disponible
              {groups.length > 1 ? "s" : ""}
            </span>
            <span>
              {Object.values(groupQuestionCounts).reduce(
                (sum, count) => sum + count,
                0
              )}{" "}
              preguntas agrupadas
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
