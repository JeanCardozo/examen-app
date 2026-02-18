import React, { useState } from "react";
import Swal from "sweetalert2";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import {
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import Spinner from "../../components/Spinner";

export default function ManageSubjects() {
  // Usa el hook sin orderBy para evitar errores de permisos
  const {
    data: subjects = [],
    loading,
    error,
  } = useFirestoreCollection("subjects", { filters: [] });
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      Swal.fire("Error", "El nombre de la materia es requerido", "error");
      return;
    }

    // Verificar si ya existe
    if (
      subjects.some((s) => s.name.toLowerCase() === trimmedName.toLowerCase())
    ) {
      Swal.fire("Error", "Esta materia ya existe", "error");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "subjects"), {
        name: trimmedName,
        createdAt: serverTimestamp(),
      });
      setName("");
      Swal.fire("¡Éxito!", "La materia se ha creado correctamente", "success");
    } catch (err) {
      console.error("Error al crear materia:", err);
      Swal.fire(
        "Error",
        "No se pudo crear la materia. Por favor intenta de nuevo.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id, oldName) => {
    try {
      const { value: newName } = await Swal.fire({
        title: "Editar materia",
        input: "text",
        inputValue: oldName,
        inputValidator: (value) => {
          if (!value.trim()) {
            return "El nombre es requerido";
          }
          if (
            subjects.some(
              (s) =>
                s.name.toLowerCase() === value.trim().toLowerCase() &&
                s.id !== id
            )
          ) {
            return "Esta materia ya existe";
          }
        },
        showCancelButton: true,
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
      });

      if (newName && newName.trim() && newName !== oldName) {
        await updateDoc(doc(db, "subjects", id), {
          name: newName.trim(),
          updatedAt: serverTimestamp(),
        });
        Swal.fire(
          "¡Actualizado!",
          "La materia se ha actualizado correctamente",
          "success"
        );
      }
    } catch (err) {
      console.error("Error al editar materia:", err);
      Swal.fire(
        "Error",
        "No se pudo actualizar la materia. Por favor intenta de nuevo.",
        "error"
      );
    }
  };

  const handleDelete = async (id, subjectName) => {
    try {
      const result = await Swal.fire({
        title: "¿Eliminar materia?",
        text: `¿Estás seguro de eliminar "${subjectName}"? Esta acción no se puede deshacer.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#dc3545",
      });

      if (result.isConfirmed) {
        await deleteDoc(doc(db, "subjects", id));
        Swal.fire(
          "¡Eliminado!",
          "La materia se ha eliminado correctamente",
          "success"
        );
      }
    } catch (err) {
      console.error("Error al eliminar materia:", err);
      Swal.fire(
        "Error",
        "No se pudo eliminar la materia. Por favor intenta de nuevo.",
        "error"
      );
    }
  };

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded">
        Error al cargar materias: {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Gestionar Materias</h2>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          className="border p-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-primaryBlue"
          placeholder="Nombre de la materia"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          required
        />
        <button
          className={`px-6 py-2 rounded font-medium transition-colors ${
            submitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-primaryBlue text-white hover:bg-blue-700"
          }`}
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Agregando..." : "Agregar"}
        </button>
      </form>

      {loading ? (
        <Spinner />
      ) : subjects.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No hay materias registradas
        </p>
      ) : (
        <ul className="space-y-3">
          {subjects
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((subject) => (
              <li
                key={subject.id}
                className="bg-white rounded-lg shadow p-4 flex justify-between items-center hover:shadow-md transition-shadow"
              >
                <span className="font-medium">{subject.name}</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(subject.id, subject.name)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id, subject.name)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
