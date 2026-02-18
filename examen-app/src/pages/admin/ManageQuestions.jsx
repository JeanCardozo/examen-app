import React, { useState, useEffect, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  // eslint-disable-next-line no-unused-vars
  canAddToGroup,
} from "../../services/questionService";
import { MAX_QUESTIONS_PER_GROUP } from "../../services/questionGroupService";
import Spinner from "../../components/Spinner";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ManageQuestionGroups from "./ManageQuestionGroups";
import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Users,
  Calendar,
  BookOpen,
  Target,
  AlertTriangle,
  Image as ImageIcon,
  Trash,
} from "lucide-react";

const QUESTION_TYPES = [
  { value: "multiple-choice", label: "Opción múltiple" },
  { value: "icfes", label: "Tipo ICFES (hasta 8 opciones)" },
  { value: "true-false", label: "Verdadero / Falso" },
  { value: "image", label: "Imagen con opciones" },
  { value: "video", label: "Video con opciones" },
  { value: "math", label: "Fórmula (LaTeX)" },
];

const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Fácil" },
  { value: "medium", label: "Medio" },
  { value: "hard", label: "Difícil" },
];

export default function ManageQuestions() {
  const [editingId, setEditingId] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    text: "",
    type: "multiple-choice",
    options: [
      { text: "", imageUrl: null, file: null },
      { text: "", imageUrl: null, file: null },
      { text: "", imageUrl: null, file: null },
      { text: "", imageUrl: null, file: null },
    ],
    correctAnswers: [],
    difficulty: "easy",
    subject: "",
    explanation: "",
    mediaFile: null,
    mediaUrl: null,
    groupId: "",
  });

  const questionFilters = useMemo(() => {
    if (selectedGroup) {
      return [["groupId", "==", selectedGroup.id]];
    }
    return [];
  }, [selectedGroup]);

  const questionSorting = useMemo(() => [["createdAt", "desc"]], []);

  // Consulta de preguntas con filtros dinámicos
  const { data: questions = [], loading } = useFirestoreCollection(
    "questions",
    {
      filters: questionFilters,
      sorting: questionSorting,
    },
  );

  // Para subjects - SINCRONIZACIÓN CON BASE DE DATOS
  const subjectSorting = useMemo(() => [["name", "asc"]], []);

  const { data: subjects = [], loading: loadingSubjects } =
    useFirestoreCollection("subjects", {
      sorting: subjectSorting,
    });

  // Para questionGroups
  const groupSorting = useMemo(() => [["createdAt", "desc"]], []);

  // eslint-disable-next-line no-unused-vars
  const { data: questionGroups = [] } = useFirestoreCollection(
    "questionGroups",
    {
      sorting: groupSorting,
    },
  );

  // Obtener TODAS las preguntas para el conteo por grupo
  const { data: allQuestions = [] } = useFirestoreCollection("questions", {
    sorting: [["createdAt", "desc"]],
  });

  // Memoizar el conteo de preguntas por grupo para optimización
  const groupedCount = useMemo(() => {
    return allQuestions.reduce((acc, q) => {
      if (q.groupId) {
        acc[q.groupId] = (acc[q.groupId] || 0) + 1;
      }
      return acc;
    }, {});
  }, [allQuestions]);

  // Filtrar preguntas por grupo seleccionado
  const filteredQuestions = useMemo(() => {
    return selectedGroup
      ? questions.filter((q) => q.groupId === selectedGroup.id)
      : questions;
  }, [questions, selectedGroup]);

  // Efecto para establecer automáticamente el groupId cuando hay un grupo seleccionado
  useEffect(() => {
    if (selectedGroup && !editingId) {
      setForm((prev) => ({
        ...prev,
        groupId: selectedGroup.id,
      }));
    }
  }, [selectedGroup, editingId]);

  const normalizeOptions = (options, type) => {
    const defaultCount = type === "icfes" ? 8 : 4;
    const defaultOptions = Array(defaultCount).fill({
      text: "",
      imageUrl: null,
      file: null,
    });

    if (!options || options.length === 0) return defaultOptions;

    return options.map((opt) => {
      if (typeof opt === "string")
        return { text: opt, imageUrl: null, file: null };
      return {
        text: opt.text || "",
        imageUrl: opt.imageUrl || null,
        file: null,
      };
    });
  };

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm({
      text: "",
      type: "multiple-choice",
      options: [
        { text: "", imageUrl: null, file: null },
        { text: "", imageUrl: null, file: null },
        { text: "", imageUrl: null, file: null },
        { text: "", imageUrl: null, file: null },
      ],
      correctAnswers: [],
      difficulty: "easy",
      subject: "",
      explanation: "",
      mediaFile: null,
      mediaUrl: null,
      groupId: selectedGroup?.id || "",
    });
    const fileInput = document.getElementById("mediaFileInput");
    if (fileInput) fileInput.value = "";

    // Reset inputs de opciones
    const optionInputs = document.querySelectorAll('input[type="file"]');
    optionInputs.forEach((input) => (input.value = ""));
  }, [selectedGroup]);

  const validateForm = useCallback(() => {
    if (!form.text.trim()) {
      Swal.fire("Error", "El enunciado es obligatorio.", "error");
      return false;
    }
    if (!form.subject) {
      Swal.fire("Error", "Selecciona una materia.", "error");
      return false;
    }

    // Validar que la materia seleccionada existe en la base de datos
    const selectedSubject = subjects.find((s) => s.id === form.subject);
    if (!selectedSubject) {
      Swal.fire("Error", "La materia seleccionada no es válida.", "error");
      return false;
    }

    const showOptions = ["multiple-choice", "icfes", "image", "video"].includes(
      form.type,
    );

    if (showOptions) {
      const validOptions = form.options.filter(
        (opt) => opt.text.trim() || opt.imageUrl,
      );
      if (validOptions.length < 2 || form.correctAnswers.length === 0) {
        Swal.fire(
          "Error",
          "Completa al menos 2 opciones (texto o imagen) y selecciona respuesta correcta.",
          "error",
        );
        return false;
      }
    }

    if (form.type === "true-false" && form.correctAnswers.length === 0) {
      Swal.fire("Error", "Selecciona la respuesta correcta.", "error");
      return false;
    }

    if (
      ["image", "video"].includes(form.type) &&
      !form.mediaFile &&
      !form.mediaUrl
    ) {
      Swal.fire(
        "Error",
        "Debes subir un archivo multimedia para el enunciado.",
        "error",
      );
      return false;
    }

    // Validar límite de preguntas por grupo cuando hay un grupo seleccionado
    if (selectedGroup && form.groupId && !editingId) {
      const currentCount = groupedCount[form.groupId] || 0;
      if (currentCount >= MAX_QUESTIONS_PER_GROUP) {
        Swal.fire(
          "Error",
          `Este enunciado ya tiene el máximo de ${MAX_QUESTIONS_PER_GROUP} preguntas.`,
          "error",
        );
        return false;
      }
    }

    return true;
  }, [
    editingId,
    form?.correctAnswers.length,
    form?.groupId,
    form?.mediaFile,
    form?.mediaUrl,
    form?.options,
    form?.subject,
    form?.text,
    form?.type,
    groupedCount,
    selectedGroup,
    subjects,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      let mediaUrl = form.mediaUrl;
      const storage = getStorage();

      // Subir archivo multimedia principal si existe
      if (form.mediaFile) {
        const fileRef = ref(
          storage,
          `questions/${Date.now()}_${form.mediaFile.name}`,
        );
        await uploadBytes(fileRef, form.mediaFile);
        mediaUrl = await getDownloadURL(fileRef);
      }

      // Subir imágenes de opciones
      const processedOptions = await Promise.all(
        form.options.map(async (opt, index) => {
          let optImageUrl = opt.imageUrl;

          if (opt.file) {
            const fileRef = ref(
              storage,
              `options/${Date.now()}_${index}_${opt.file.name}`,
            );
            await uploadBytes(fileRef, opt.file);
            optImageUrl = await getDownloadURL(fileRef);
          }

          // Retornar estructura limpia para DB
          return {
            text: opt.text,
            imageUrl: optImageUrl,
          };
        }),
      );

      // SINCRONIZACIÓN: Asegurar que se guarden los datos correctos
      const questionData = {
        text: form?.text.trim(),
        type: form?.type,
        options: processedOptions.filter(
          (opt) => opt.text.trim() || opt.imageUrl,
        ), // Filtrar opciones vacías
        correctAnswers: form?.correctAnswers,
        difficulty: form?.difficulty,
        subject: form?.subject, // ID de la materia desde la base de datos
        explanation: form?.explanation.trim(),
        mediaUrl,
        groupId: form?.groupId || null,
      };

      console.log("Datos de pregunta a guardar:", questionData); // Debug

      if (editingId) {
        await updateQuestion(editingId, questionData);
        Swal.fire(
          "Actualizada",
          "Pregunta actualizada correctamente",
          "success",
        );
      } else {
        await addQuestion(questionData);
        Swal.fire("Creada", "Pregunta añadida al banco", "success");
      }
      resetForm();
    } catch (err) {
      console.error("Error:", err);
      Swal.fire(
        "Error",
        err.message || "Error al procesar la pregunta",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setForm({
      text: q.text,
      type: q.type,
      options: normalizeOptions(q.options, q.type),
      correctAnswers: q.correctAnswers || [],
      difficulty: q.difficulty,
      subject: q.subject,
      explanation: q.explanation || "",
      mediaFile: null,
      mediaUrl: q.mediaUrl || null,
      groupId: q.groupId || "",
    });
    const fileInput = document.getElementById("mediaFileInput");
    if (fileInput) fileInput.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (questionId) => {
    try {
      const result = await Swal.fire({
        title: "¿Eliminar pregunta?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        await deleteQuestion(questionId);
        Swal.fire("Eliminada", "Pregunta eliminada correctamente", "success");
      }
    } catch (err) {
      console.error("Error:", err);
      Swal.fire("Error", "No se pudo eliminar la pregunta", "error");
    }
  };

  const handleTypeChange = (newType) => {
    setForm((prev) => {
      const newForm = { ...prev, type: newType };

      // Resetear opciones y respuestas según el tipo
      if (newType === "true-false") {
        newForm.options = [
          { text: "Verdadero", imageUrl: null, file: null },
          { text: "Falso", imageUrl: null, file: null },
        ];
        newForm.correctAnswers = [];
      } else if (newType === "math") {
        newForm.options = [];
        newForm.correctAnswers = [];
      } else if (["multiple-choice", "image", "video"].includes(newType)) {
        newForm.options = Array(4).fill({
          text: "",
          imageUrl: null,
          file: null,
        });
        newForm.correctAnswers = [];
      } else if (newType === "icfes") {
        newForm.options = Array(8).fill({
          text: "",
          imageUrl: null,
          file: null,
        });
        newForm.correctAnswers = [];
      }

      return newForm;
    });
  };

  const handleOptionChange = (index, value) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, text: value } : opt,
      ),
    }));
  };

  const handleOptionFileChange = (index, file) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, file: file } : opt,
      ),
    }));
  };

  const handleRemoveOptionImage = (index) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, imageUrl: null, file: null } : opt,
      ),
    }));
    // Reset file input
    const fileInput = document.getElementById(`option-file-${index}`);
    if (fileInput) fileInput.value = "";
  };

  const handleCorrectAnswerToggle = (index) => {
    setForm((prev) => ({
      ...prev,
      correctAnswers: prev.correctAnswers.includes(index)
        ? prev.correctAnswers.filter((i) => i !== index)
        : [...prev.correctAnswers, index],
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm((prev) => ({
        ...prev,
        mediaFile: file,
        mediaUrl: null,
      }));
    }
  };

  const getQuestionTypeLabel = (type) => {
    const typeObj = QUESTION_TYPES.find((t) => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const getDifficultyLabel = (difficulty) => {
    const diffObj = DIFFICULTY_LEVELS.find((d) => d.value === difficulty);
    return diffObj ? diffObj.label : difficulty;
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return subject ? subject.name : "Materia no encontrada";
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    // Resetear formulario cuando se selecciona un grupo
    if (!editingId) {
      resetForm();
    }
  };

  const handleClearGroupSelection = () => {
    setSelectedGroup(null);
    if (!editingId) {
      resetForm();
    }
  };

  const renderQuestionOptions = () => {
    const showOptions = ["multiple-choice", "icfes", "image", "video"].includes(
      form.type,
    );

    if (form.type === "true-false") {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Respuesta correcta:
          </label>
          <div className="flex gap-4">
            {["Verdadero", "Falso"].map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name="trueFalseAnswer"
                  checked={form.correctAnswers.includes(index)}
                  onChange={() =>
                    setForm((prev) => ({ ...prev, correctAnswers: [index] }))
                  }
                  className="mr-2"
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (form.type === "math") {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Fórmula LaTeX:
          </label>
          <textarea
            className="w-full p-2 border rounded resize-none"
            rows="3"
            value={form.options[0]?.text || ""}
            onChange={(e) => handleOptionChange(0, e.target.value)}
            placeholder="Escribe la fórmula en LaTeX, ej: \\frac{a}{b} = c"
          />
        </div>
      );
    }

    if (showOptions) {
      const optionCount = form.type === "icfes" ? 8 : 4;
      return (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Opciones de respuesta:
          </label>
          {form.options.slice(0, optionCount).map((option, index) => (
            <div key={index} className="border p-3 rounded-lg bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="pt-2">
                  <input
                    type="checkbox"
                    checked={form.correctAnswers.includes(index)}
                    onChange={() => handleCorrectAnswerToggle(index)}
                    className="w-4 h-4"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-sm font-bold">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded"
                      value={option.text}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      placeholder={`Texto de opción ${String.fromCharCode(65 + index)}`}
                    />
                  </div>

                  {/* Subida de imagen para opción */}
                  <div className="flex items-center gap-2 pl-8">
                    <label
                      htmlFor={`option-file-${index}`}
                      className="cursor-pointer text-blue-600 hover:text-blue-800"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </label>
                    <input
                      type="file"
                      id={`option-file-${index}`}
                      className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      accept="image/*"
                      onChange={(e) =>
                        handleOptionFileChange(index, e.target.files[0])
                      }
                    />
                  </div>

                  {/* Previsualización de imagen */}
                  {(option.imageUrl || option.file) && (
                    <div className="ml-8 mt-2 relative inline-block">
                      <img
                        src={
                          option.file
                            ? URL.createObjectURL(option.file)
                            : option.imageUrl
                        }
                        alt="Opción"
                        className="h-20 w-auto rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div className="text-sm text-gray-500">
            Marca las opciones correctas. Puedes añadir texto, imagen o ambos.
          </div>
        </div>
      );
    }

    return null;
  };

  const renderMediaUpload = () => {
    if (!["image", "video"].includes(form.type)) return null;

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Archivo multimedia (Enunciado):
        </label>
        <input
          type="file"
          id="mediaFileInput"
          accept={form.type === "image" ? "image/*" : "video/*"}
          onChange={handleFileChange}
          className="w-full p-2 border rounded"
        />
        {form.mediaUrl && (
          <div className="text-sm text-green-600">
            ✓ Archivo multimedia cargado
          </div>
        )}
      </div>
    );
  };

  if (loading || loadingSubjects) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <Spinner size="12" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Gestión de Preguntas
        </h1>
        <p className="text-gray-600">
          Administra el banco de preguntas del sistema
        </p>
      </div>

      {/* Verificar que hay materias disponibles */}
      {subjects.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-yellow-600 mr-3">⚠️</div>
            <div>
              <h3 className="text-yellow-800 font-medium">
                No hay materias disponibles
              </h3>
              <p className="text-yellow-700 text-sm">
                Debes crear materias en el módulo correspondiente antes de poder
                crear preguntas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gestión de Enunciados Agrupadores */}
      <ManageQuestionGroups onSelectGroup={handleSelectGroup} />

      {/* Grupo seleccionado */}
      {selectedGroup && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-blue-800 mb-1">
                Enunciado seleccionado:
              </h3>
              <p className="text-blue-700">{selectedGroup.text}</p>
              <p className="text-sm text-blue-600 mt-1">
                {groupedCount[selectedGroup.id] || 0}/{MAX_QUESTIONS_PER_GROUP}{" "}
                preguntas
              </p>
            </div>
            <button
              onClick={handleClearGroupSelection}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Formulario de pregunta */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingId ? "Editar Pregunta" : "Nueva Pregunta"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Enunciado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enunciado de la pregunta:
            </label>
            <textarea
              className="w-full p-3 border rounded-lg resize-none"
              rows="3"
              value={form.text}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, text: e.target.value }))
              }
              placeholder="Escribe el enunciado de la pregunta..."
              required
            />
          </div>

          {/* Tipo de pregunta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de pregunta:
            </label>
            <select
              className="w-full p-2 border rounded-lg"
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Opciones de respuesta */}
          {renderQuestionOptions()}

          {/* Upload de medios */}
          {renderMediaUpload()}

          {/* Dificultad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dificultad:
            </label>
            <select
              className="w-full p-2 border rounded-lg"
              value={form.difficulty}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, difficulty: e.target.value }))
              }
            >
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Materia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Materia:
            </label>
            <select
              className="w-full p-2 border rounded-lg"
              value={form.subject}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, subject: e.target.value }))
              }
              required
              disabled={subjects.length === 0}
            >
              <option value="">
                {subjects.length === 0
                  ? "No hay materias disponibles"
                  : "Selecciona una materia"}
              </option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {subjects.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                Debes crear materias antes de poder crear preguntas
              </p>
            )}
          </div>

          {/* Explicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Explicación (opcional):
            </label>
            <textarea
              className="w-full p-3 border rounded-lg resize-none"
              rows="3"
              value={form.explanation}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, explanation: e.target.value }))
              }
              placeholder="Explica por qué esta es la respuesta correcta..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting || subjects.length === 0}
            >
              {submitting
                ? "Guardando..."
                : editingId
                  ? "Actualizar Pregunta"
                  : "Crear Pregunta"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de preguntas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {selectedGroup ? "Preguntas del Enunciado" : "Banco de Preguntas"}
          </h2>
          <span className="text-sm text-gray-500">
            {filteredQuestions.length} pregunta
            {filteredQuestions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {selectedGroup
              ? "No hay preguntas para este enunciado"
              : "No hay preguntas creadas"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <div
                key={question.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {getQuestionTypeLabel(question.type)}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        {getDifficultyLabel(question.difficulty)}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        {getSubjectName(question.subject)}
                      </span>
                      {question.groupId && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          Agrupada
                        </span>
                      )}
                    </div>
                    <p className="text-gray-800 font-medium mb-2">
                      {question.text}
                    </p>
                    {question.options && question.options.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {question.options.map((option, index) => {
                          const optText =
                            typeof option === "string" ? option : option.text;
                          const optImg =
                            typeof option === "object" ? option.imageUrl : null;
                          return (
                            <div
                              key={index}
                              className={`text-sm flex items-center gap-2 ${
                                question.correctAnswers?.includes(index)
                                  ? "text-green-600 font-medium"
                                  : "text-gray-600"
                              }`}
                            >
                              <span>
                                {String.fromCharCode(65 + index)}. {optText}
                              </span>
                              {optImg && <ImageIcon className="w-4 h-4" />}
                              {question.correctAnswers?.includes(index) && " ✓"}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {question.explanation && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        {question.explanation}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEdit(question)}
                      className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
