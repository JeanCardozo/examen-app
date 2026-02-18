// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { useAuth } from "../../contexts/AuthContext";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { createExam } from "../../services/examService";
import Spinner from "../../components/Spinner";
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
} from "lucide-react";

export default function CreateExam() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [pickedQs, setPickedQs] = useState([]);
  const [selectedQ, setSelectedQ] = useState(null);
  const [saving, setSaving] = useState(false);
  const [timeLimit, setTimeLimit] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [deadline, setDeadline] = useState("");

  const subjectSorting = useMemo(() => [["name", "asc"]], []);

  // Cargar datos con hooks optimizados
  const { data: subjects = [], loading: loadingSubjects } =
    useFirestoreCollection("subjects", { sorting: subjectSorting });

  const { data: allQuestions = [], loading: loadingQuestions } =
    useFirestoreCollection("questions", { sorting: [["createdAt", "desc"]] });

  const { data: questionGroups = [] } = useFirestoreCollection(
    "questionGroups",
    { sorting: [["createdAt", "desc"]] },
  );

  // Agrupamiento optimizado de preguntas
  const groupedQuestions = useMemo(() => {
    if (selectedSubjects.length === 0) return {};

    const bySubject = {};
    const subjectsMap = new Map(subjects.map((s) => [s.id, s.name]));

    // Inicializar estructura
    selectedSubjects.forEach((subjectId) => {
      const subjectName = subjectsMap.get(subjectId);
      if (subjectName) {
        bySubject[subjectId] = {
          name: subjectName,
          easy: { normal: [], grouped: {} },
          medium: { normal: [], grouped: {} },
          hard: { normal: [], grouped: {} },
        };
      }
    });

    // Procesar preguntas filtradas
    const filteredQuestions = allQuestions
      .filter((q) => selectedSubjects.includes(q.subject))
      .map((q) => ({
        ...q,
        subjectName: subjectsMap.get(q.subject) || "Materia no encontrada",
      }));

    filteredQuestions.forEach((q) => {
      const difficulty = q.difficulty || "medium";

      if (bySubject[q.subject]) {
        if (q.groupId) {
          const group = questionGroups.find((g) => g.id === q.groupId);
          if (group) {
            if (!bySubject[q.subject][difficulty].grouped[q.groupId]) {
              bySubject[q.subject][difficulty].grouped[q.groupId] = {
                text: group.text,
                questions: [],
              };
            }
            bySubject[q.subject][difficulty].grouped[q.groupId].questions.push(
              q,
            );
          }
        } else {
          bySubject[q.subject][difficulty].normal.push(q);
        }
      }
    });

    return bySubject;
  }, [allQuestions, questionGroups, selectedSubjects, subjects]);

  // Manejo de selección de materias
  const handleSubjectSelect = (subjectId) => {
    setSelectedSubjects((prev) => {
      const newSelection = prev.includes(subjectId)
        ? prev.filter((s) => s !== subjectId)
        : [...prev, subjectId];

      // Limpiar preguntas si se deselecciona materia
      if (prev.includes(subjectId)) {
        setPickedQs((current) =>
          current.filter((qId) => {
            const question = allQuestions.find((q) => q.id === qId);
            return question && newSelection.includes(question.subject);
          }),
        );
      }

      return newSelection;
    });
  };

  // **NUEVA FUNCIÓN MEJORADA** - Procesamiento de respuestas correctas
  const processCorrectAnswers = (question) => {
    if (!question.correctAnswers) return [];

    // Normalizar respuestas correctas según tipo
    let correctAnswers = Array.isArray(question.correctAnswers)
      ? question.correctAnswers
      : [question.correctAnswers];

    // Para tipos con opciones, convertir índices a letras si es necesario
    if (
      ["multiple-choice", "icfes", "image", "video"].includes(question.type)
    ) {
      correctAnswers = correctAnswers.map((answer) => {
        if (typeof answer === "number") {
          return String.fromCharCode(65 + answer); // 0->A, 1->B, etc.
        }
        return answer;
      });
    }

    return correctAnswers;
  };

  // **MEJORADO** - Función para seleccionar pregunta con procesamiento completo
  const handleQuestionSelect = (question) => {
    const processedQuestion = {
      ...question,
      correctAnswers: processCorrectAnswers(question),
      type: question.type || "multiple-choice",
    };

    setSelectedQ(processedQuestion);
  };

  // **COMPONENTE MEJORADO** - Renderizado de preguntas
  // eslint-disable-next-line no-unused-vars
  const renderQuestions = (questions, subjectId, difficulty) => {
    const totalNormal = questions.normal.length;
    const totalGrouped = Object.values(questions.grouped).reduce(
      (acc, g) => acc + g.questions.length,
      0,
    );
    const totalQuestions = totalNormal + totalGrouped;

    if (totalQuestions === 0) {
      return (
        <div className="text-gray-400 text-sm p-4 bg-gray-50 rounded-lg text-center border-2 border-dashed border-gray-200">
          <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p>No hay preguntas disponibles para esta dificultad</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Preguntas individuales */}
        {questions.normal.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Preguntas individuales ({questions.normal.length})
            </h4>
            <div className="space-y-2">
              {questions.normal.map((q) => (
                <div
                  key={q.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={pickedQs.includes(q.id)}
                      onChange={(e) => {
                        setPickedQs((p) =>
                          e.target.checked
                            ? [...p, q.id]
                            : p.filter((x) => x !== q.id),
                        );
                      }}
                      disabled={saving}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            q.type === "multiple-choice"
                              ? "bg-blue-100 text-blue-800"
                              : q.type === "true-false"
                                ? "bg-green-100 text-green-800"
                                : q.type === "icfes"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {q.type === "multiple-choice"
                            ? "Opción múltiple"
                            : q.type === "true-false"
                              ? "V/F"
                              : q.type === "icfes"
                                ? "ICFES"
                                : q.type === "image"
                                  ? "Imagen"
                                  : q.type === "video"
                                    ? "Video"
                                    : "Otro"}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            q.difficulty === "easy"
                              ? "bg-green-100 text-green-800"
                              : q.difficulty === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {q.difficulty === "easy"
                            ? "Fácil"
                            : q.difficulty === "medium"
                              ? "Medio"
                              : "Difícil"}
                        </span>
                      </div>
                      <p className="text-gray-800 text-sm font-medium mb-2 line-clamp-2">
                        {q.text || "Sin texto"}
                      </p>
                      <button
                        onClick={() => handleQuestionSelect(q)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalles
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preguntas agrupadas */}
        {Object.entries(questions.grouped).length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Preguntas agrupadas (
              {Object.values(questions.grouped).reduce(
                (acc, g) => acc + g.questions.length,
                0,
              )}
              )
            </h4>
            <div className="space-y-3">
              {Object.entries(questions.grouped).map(([groupId, group]) => (
                <div
                  key={groupId}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                >
                  <p className="font-semibold text-blue-900 mb-3 text-sm">
                    📋 {group.text}
                  </p>
                  <div className="space-y-2">
                    {group.questions.map((q) => (
                      <div
                        key={q.id}
                        className="bg-white border border-blue-200 rounded-lg p-3 ml-4"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={pickedQs.includes(q.id)}
                            onChange={(e) => {
                              setPickedQs((p) =>
                                e.target.checked
                                  ? [...p, q.id]
                                  : p.filter((x) => x !== q.id),
                              );
                            }}
                            disabled={saving}
                          />
                          <div className="flex-1">
                            <p className="text-gray-800 text-sm font-medium mb-2">
                              {q.text || "Sin texto"}
                            </p>
                            <button
                              onClick={() => handleQuestionSelect(q)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              Ver detalles
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Función para confirmar creación
  const handleConfirm = async () => {
    if (
      !title.trim() ||
      !selectedSubjects.length ||
      !pickedQs.length ||
      !timeLimit ||
      !maxAttempts ||
      !deadline
    ) {
      return Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Completa todos los campos obligatorios",
      });
    }

    if (maxAttempts < 1 || maxAttempts > 3) {
      return Swal.fire({
        icon: "warning",
        title: "Intentos inválidos",
        text: "El número de intentos debe ser entre 1 y 3",
      });
    }

    if (new Date(deadline) < new Date()) {
      return Swal.fire({
        icon: "warning",
        title: "Fecha inválida",
        text: "La fecha límite debe ser en el futuro",
      });
    }

    setSaving(true);
    try {
      await createExam({
        title: title.trim(),
        description: description.trim(),
        subjectList: selectedSubjects,
        questionRefs: pickedQs,
        createdBy: user.uid,
        timeLimit: Number(timeLimit),
        maxAttempts: Number(maxAttempts),
        deadline: new Date(deadline),
        isClosed: false,
      });

      await Swal.fire({
        icon: "success",
        title: "¡Examen creado!",
        text: "El examen ha sido guardado exitosamente",
      });

      // Resetear formulario
      setTitle("");
      setDescription("");
      setSelectedSubjects([]);
      setPickedQs([]);
      setSelectedQ(null);
      setTimeLimit(60);
      setMaxAttempts(1);
      setDeadline("");
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingSubjects || loadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="16" />
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
          Crear Nuevo Examen
        </h1>
        <p className="text-gray-600 text-lg">
          Configura y personaliza tu examen con preguntas seleccionadas
        </p>
      </div>

      {/* Formulario principal */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Información básica */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Título del Examen *
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Examen de Matemáticas - Primer Período"
                required
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción del examen..."
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Seleccionar Materias *
              </label>
              {subjects.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    No hay materias disponibles. Crea materias primero.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => handleSubjectSelect(subject.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedSubjects.includes(subject.id)
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      disabled={saving}
                    >
                      {subject.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Configuración */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Tiempo límite (minutos) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Intentos permitidos *
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  required
                  disabled={saving}
                >
                  <option value={1}>1 intento</option>
                  <option value={2}>2 intentos</option>
                  <option value={3}>3 intentos</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha límite *
              </label>
              <input
                type="datetime-local"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                disabled={saving}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Resumen */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Resumen del Examen
              </h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>📚 Materias: {selectedSubjects.length}</p>
                <p>❓ Preguntas: {pickedQs.length}</p>
                <p>⏱️ Duración: {timeLimit} minutos</p>
                <p>🔄 Intentos: {maxAttempts}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selección de preguntas */}
      {selectedSubjects.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Seleccionar Preguntas
          </h2>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {Object.entries(groupedQuestions).map(([subjectId, data]) => (
              <div
                key={subjectId}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200"
              >
                <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  {data.name}
                </h3>

                {["easy", "medium", "hard"].map((difficulty) => (
                  <div key={difficulty} className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          difficulty === "easy"
                            ? "bg-green-500"
                            : difficulty === "medium"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                      />
                      {difficulty === "easy"
                        ? "Fácil"
                        : difficulty === "medium"
                          ? "Intermedio"
                          : "Difícil"}
                    </h4>
                    {renderQuestions(data[difficulty], subjectId, difficulty)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* **MODAL MEJORADO** - Detalle de pregunta */}
      {selectedQ && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-4 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-800">
                  Detalle de la Pregunta
                </h3>
                <button
                  onClick={() => setSelectedQ(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-8 space-y-6">
              {/* Metadatos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Materia</span>
                  </div>
                  <p className="text-blue-800">
                    {subjects.find((s) => s.id === selectedQ.subject)?.name ||
                      "No definida"}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">
                      Dificultad
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedQ.difficulty === "easy"
                        ? "bg-green-100 text-green-800"
                        : selectedQ.difficulty === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedQ.difficulty === "easy"
                      ? "Fácil"
                      : selectedQ.difficulty === "medium"
                        ? "Intermedio"
                        : "Difícil"}
                  </span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 text-purple-600">📝</span>
                    <span className="font-semibold text-purple-900">Tipo</span>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {selectedQ.type === "multiple-choice"
                      ? "Opción múltiple"
                      : selectedQ.type === "true-false"
                        ? "Verdadero/Falso"
                        : selectedQ.type === "icfes"
                          ? "Tipo ICFES"
                          : selectedQ.type === "image"
                            ? "Imagen"
                            : selectedQ.type === "video"
                              ? "Video"
                              : "Otro"}
                  </span>
                </div>
              </div>

              {/* Enunciado */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="font-bold text-gray-800 mb-3 text-lg">
                  📋 Enunciado
                </h4>
                <p className="text-gray-800 leading-relaxed text-base">
                  {selectedQ.text || "Sin texto"}
                </p>
              </div>

              {/* Media */}
              {selectedQ.mediaUrl && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="font-bold text-gray-800 mb-3 text-lg">
                    🎯 Contenido Multimedia
                  </h4>
                  <div className="flex justify-center">
                    {selectedQ.type === "image" ? (
                      <img
                        src={selectedQ.mediaUrl}
                        alt="Imagen de la pregunta"
                        className="max-h-64 rounded-lg shadow-md"
                      />
                    ) : selectedQ.type === "video" ? (
                      <video
                        src={selectedQ.mediaUrl}
                        controls
                        className="max-h-64 rounded-lg shadow-md"
                      />
                    ) : null}
                  </div>
                </div>
              )}

              {/* **OPCIONES MEJORADAS** */}
              {selectedQ.options && selectedQ.options.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                  <h4 className="font-bold text-green-900 mb-4 text-lg flex items-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    Opciones de Respuesta
                  </h4>
                  <div className="space-y-3">
                    {selectedQ.options.map((option, index) => {
                      const optionLetter = String.fromCharCode(65 + index);
                      const optText =
                        typeof option === "string" ? option : option.text;
                      const optImg =
                        typeof option === "object" ? option.imageUrl : null;

                      const isCorrect =
                        selectedQ.correctAnswers.includes(optionLetter) ||
                        selectedQ.correctAnswers.includes(option) ||
                        selectedQ.correctAnswers.includes(index);

                      return (
                        <div
                          key={index}
                          className={`relative p-4 rounded-xl border-2 transition-all ${
                            isCorrect
                              ? "border-green-500 bg-green-50 shadow-lg"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mt-1 ${
                                isCorrect
                                  ? "bg-green-500 text-white shadow-md"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {optionLetter}
                            </div>

                            <div className="flex-1">
                              <p
                                className={`text-base font-medium ${
                                  isCorrect ? "text-green-900" : "text-gray-800"
                                }`}
                              >
                                {optText}
                              </p>
                              {optImg && (
                                <img
                                  src={optImg}
                                  alt={`Opción ${optionLetter}`}
                                  className="mt-2 max-h-32 rounded-lg border border-gray-200"
                                />
                              )}
                            </div>

                            {isCorrect && (
                              <div className="flex items-center bg-green-100 px-3 py-2 rounded-full">
                                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                <span className="text-sm font-bold text-green-700">
                                  Respuesta Correcta
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Indicador visual adicional */}
                          {isCorrect && (
                            <div className="absolute -top-2 -right-2">
                              <div className="bg-green-500 text-white rounded-full p-1">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Resumen de respuestas correctas */}
                  <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-lg">
                    <p className="text-green-800 font-semibold">
                      ✅ Respuesta(s) correcta(s):{" "}
                      {selectedQ.options
                        .map((option, index) => {
                          const optionLetter = String.fromCharCode(65 + index);
                          const isCorrect =
                            selectedQ.correctAnswers.includes(optionLetter) ||
                            selectedQ.correctAnswers.includes(option) ||
                            selectedQ.correctAnswers.includes(index);
                          return isCorrect ? optionLetter : null;
                        })
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Explicación */}
              {selectedQ.explanation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-bold text-blue-900 mb-3 text-lg flex items-center gap-2">
                    💡 Explicación
                  </h4>
                  <p className="text-blue-800 leading-relaxed">
                    {selectedQ.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Footer del modal */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 rounded-b-2xl">
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedQ(null)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón de crear examen */}
      {selectedSubjects.length > 0 && pickedQs.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                ¿Listo para crear el examen?
              </h3>
              <p className="text-gray-600">
                Has seleccionado {pickedQs.length} preguntas de{" "}
                {selectedSubjects.length} materias
              </p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              {saving ? (
                <>
                  <Spinner size="5" />
                  <span className="ml-2">Guardando...</span>
                </>
              ) : (
                "🚀 Crear Examen"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
