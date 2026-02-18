import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Spinner from "../../../components/Spinner";
import LazyImage from "../../../components/LazyImage";
import { auth } from "../../../services/firebase";
import {
  createAttempt,
  finishAttempt,
  getUserAttempts,
} from "../../../services/attemptService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../services/firebase";
import {
  Clock,
  AlertTriangle,
  BookOpen,
  Target,
  CheckCircle,
  XCircle,
  ArrowRight,
  Shield,
  AlertCircle,
} from "lucide-react";

export default function Exam() {
  const { examId } = useParams();
  const nav = useNavigate();

  // Estados principales
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [attemptId, setAttemptId] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [userAttempts, setUserAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // 🔒 Estados de seguridad
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isExamActive, setIsExamActive] = useState(false);
  const [securityWarningShown, setSecurityWarningShown] = useState(false);

  // 🔥 FUNCIÓN MEJORADA: Validar respuesta correcta
  const validateAnswer = useCallback((question, userAnswer) => {
    if (!question || (userAnswer === undefined && userAnswer !== false))
      return false;

    console.log("🔍 Validando respuesta:", {
      questionId: question.id,
      type: question.type,
      userAnswer,
      correctAnswers: question.correctAnswers,
    });

    switch (question.type) {
      case "icfes": {
        const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
        const correctAnswers = Array.isArray(question.correctAnswers)
          ? question.correctAnswers
          : [question.correctAnswers];

        // comparar arrays de ids (orden no importa)
        const isCorrect =
          userAnswers.length === correctAnswers.length &&
          userAnswers.every((a) => correctAnswers.includes(a)) &&
          correctAnswers.every((a) => userAnswers.includes(a));

        return isCorrect;
      }

      case "true-false": {
        const normalizedUser =
          userAnswer === "Verdadero" ||
          userAnswer === true ||
          userAnswer === "true";
        const normalizedCorrect =
          question.correctAnswers === "Verdadero" ||
          question.correctAnswers === true ||
          question.correctAnswers === "true";

        return normalizedUser === normalizedCorrect;
      }

      case "multiple-choice":
      case "image":
      case "video": {
        const correctAnswers = Array.isArray(question.correctAnswers)
          ? question.correctAnswers
          : [question.correctAnswers];

        // comparar por id si correctAnswers son ids
        return correctAnswers.includes(userAnswer);
      }

      default: {
        return question.correctAnswers === userAnswer;
      }
    }
  }, []);

  // 🔥 FUNCIÓN CRÍTICA COMPLETAMENTE CORREGIDA: Manejar respuestas
  const handleAnswer = useCallback(
    (optionIdentifier) => {
      const questionId = questions[currentQuestionIndex]?.id;
      const currentQuestion = questions[currentQuestionIndex];

      if (!questionId || !currentQuestion || !isExamActive) {
        console.log("❌ Condiciones no válidas para responder");
        return;
      }

      console.log("📝 Procesando respuesta:", {
        questionId,
        type: currentQuestion.type,
        optionIdentifier,
        currentState: answers[questionId],
      });

      setAnswers((prevAnswers) => {
        const newAnswers = { ...prevAnswers };

        // ICFES: optionIdentifier = option.id
        if (currentQuestion.type === "icfes") {
          const currentSelections = Array.isArray(newAnswers[questionId])
            ? [...newAnswers[questionId]]
            : [];

          const isAlreadySelected =
            currentSelections.includes(optionIdentifier);

          if (isAlreadySelected) {
            const updatedSelections = currentSelections.filter(
              (item) => item !== optionIdentifier,
            );
            if (updatedSelections.length === 0) {
              delete newAnswers[questionId];
            } else {
              newAnswers[questionId] = updatedSelections;
            }
          } else {
            newAnswers[questionId] = [...currentSelections, optionIdentifier];
          }

          return newAnswers;
        }

        // true-false: optionIdentifier is "Verdadero" or "Falso"
        if (currentQuestion.type === "true-false") {
          if (newAnswers[questionId] === optionIdentifier) {
            delete newAnswers[questionId];
          } else {
            newAnswers[questionId] = optionIdentifier;
          }
          return newAnswers;
        }

        // único: optionIdentifier = option.id
        if (newAnswers[questionId] === optionIdentifier) {
          delete newAnswers[questionId];
        } else {
          newAnswers[questionId] = optionIdentifier;
        }

        return newAnswers;
      });
    },
    [questions, currentQuestionIndex, isExamActive, answers],
  );

  // 🧠 SISTEMA DE ORDENAMIENTO ADAPTATIVO POR DIFICULTAD
  const [adaptiveOrdering, setAdaptiveOrdering] = useState({
    enabled: true,
    currentStreak: 0, // Racha de respuestas correctas/incorrectas
    lastAnswers: [], // Últimas 3 respuestas para determinar tendencia
    difficultyLevel: "medium", // easy, medium, hard
  });

  // 🔥 FUNCIÓN: Actualizar ordenamiento adaptativo
  const updateAdaptiveOrdering = useCallback((questionId, isCorrect) => {
    setAdaptiveOrdering((prev) => {
      const newLastAnswers = [...prev.lastAnswers, isCorrect].slice(-3);

      // Calcular nueva racha
      let newStreak = prev.currentStreak;
      if (prev.lastAnswers.length > 0) {
        const lastAnswer = prev.lastAnswers[prev.lastAnswers.length - 1];
        if (lastAnswer === isCorrect) {
          newStreak = isCorrect
            ? Math.max(0, prev.currentStreak) + 1
            : Math.min(0, prev.currentStreak) - 1;
        } else {
          newStreak = isCorrect ? 1 : -1;
        }
      } else {
        newStreak = isCorrect ? 1 : -1;
      }

      // Determinar nuevo nivel de dificultad
      let newDifficultyLevel = prev.difficultyLevel;

      // Si tiene 2+ respuestas correctas consecutivas, subir dificultad
      if (newStreak >= 2 && newDifficultyLevel === "easy") {
        newDifficultyLevel = "medium";
      } else if (newStreak >= 3 && newDifficultyLevel === "medium") {
        newDifficultyLevel = "hard";
      }

      // Si tiene 2+ respuestas incorrectas consecutivas, bajar dificultad
      else if (newStreak <= -2 && newDifficultyLevel === "hard") {
        newDifficultyLevel = "medium";
      } else if (newStreak <= -2 && newDifficultyLevel === "medium") {
        newDifficultyLevel = "easy";
      }

      console.log("🧠 Ordenamiento adaptativo actualizado:", {
        isCorrect,
        newStreak,
        newDifficultyLevel,
        lastAnswers: newLastAnswers,
      });

      return {
        ...prev,
        currentStreak: newStreak,
        lastAnswers: newLastAnswers,
        difficultyLevel: newDifficultyLevel,
      };
    });
  }, []);

  // 🔥 FUNCIÓN: Ordenar preguntas por dificultad adaptativa
  const getNextQuestionIndex = useCallback(() => {
    if (!adaptiveOrdering.enabled || questions.length === 0) {
      return currentQuestionIndex + 1;
    }

    const remainingQuestions = questions.slice(currentQuestionIndex + 1);
    const targetDifficulty = adaptiveOrdering.difficultyLevel;

    // Buscar pregunta de la dificultad objetivo
    const preferredQuestions = remainingQuestions.filter(
      (q) => q.difficulty === targetDifficulty,
    );

    if (preferredQuestions.length > 0) {
      // Encontrar el índice real de la primera pregunta preferida
      const preferredQuestion = preferredQuestions[0];
      const realIndex = questions.findIndex(
        (q) => q.id === preferredQuestion.id,
      );

      // Si no es la siguiente inmediata, reordenar
      if (realIndex !== currentQuestionIndex + 1) {
        console.log(
          `🔄 Reordenando: Moviendo pregunta de dificultad ${targetDifficulty} al frente`,
        );

        // Crear nuevo array reordenado
        const newQuestions = [...questions];
        const [questionToMove] = newQuestions.splice(realIndex, 1);
        newQuestions.splice(currentQuestionIndex + 1, 0, questionToMove);

        // Actualizar el estado de preguntas
        setQuestions(newQuestions);
      }
    }

    return currentQuestionIndex + 1;
  }, [questions, currentQuestionIndex, adaptiveOrdering]);

  // 🔥 FUNCIÓN MODIFICADA: Navegar a la siguiente pregunta con ordenamiento

  const goToNextQuestion = useCallback(() => {
    if (!isExamActive) return;

    const nextIndex = getNextQuestionIndex();

    if (nextIndex < questions.length) {
      setCurrrentQuestionIndex(nextIndex);
    }
  }, [isExamActive, questions.length, getNextQuestionIndex]);

  // 🔥 MODIFICACIÓN: Integrar evaluación adaptativa en submitExam
  const submitExam = useCallback(
    async (isTimeUp = false, isAborted = false) => {
      if (submitting || !attemptId || !questions.length) return;

      setSubmitting(true);
      setIsExamActive(false);

      try {
        console.log("📤 Enviando examen con ordenamiento adaptativo:", {
          attemptId,
          questionsCount: questions.length,
          adaptiveData: adaptiveOrdering,
        });

        const results = questions.map((question) => {
          const userAnswer = answers[question.id];

          // construir selectedIds y selectedTexts
          let selectedIds = null;
          let selectedTexts = null;
          if (userAnswer !== undefined) {
            if (Array.isArray(userAnswer)) {
              selectedIds = [...userAnswer];
              selectedTexts = selectedIds.map((id) => {
                const opt = question.options?.find((o) => o.id === id);
                return opt ? opt.text : id;
              });
            } else {
              selectedIds = [userAnswer];
              const opt = question.options?.find((o) => o.id === userAnswer);
              selectedTexts = [opt ? opt.text : userAnswer];
            }
          }

          const isCorrect = validateAnswer(question, userAnswer);

          if (userAnswer !== undefined) {
            updateAdaptiveOrdering(question.id, isCorrect);
          }

          return {
            questionId: question.id,
            questionText:
              question.text?.substring(0, 100) + "..." || "Sin texto",
            subject: question.subject,
            subjectName: question.subjectName || "Sin materia",
            difficulty: question.difficulty || "medium",
            selectedAnswerIds: selectedIds,
            selectedAnswerTexts: selectedTexts,
            correctAnswers: question.correctAnswers,
            isCorrect,
            explanation: question.explanation || null,
            type: question.type || "multiple-choice",
          };
        });

        // Resto del código igual...
        const scoreBySubject = results.reduce((acc, result) => {
          if (!result.subject) return acc;

          if (!acc[result.subject]) {
            acc[result.subject] = {
              correct: 0,
              total: 0,
              subjectName: result.subjectName,
            };
          }
          acc[result.subject].total++;
          if (result.isCorrect) {
            acc[result.subject].correct++;
          }
          return acc;
        }, {});

        const alertLog = [];
        if (isTimeUp) alertLog.push("timeUp");
        if (isAborted) alertLog.push("tabSwitch");
        if (tabSwitchCount > 0) alertLog.push(`tabSwitches: ${tabSwitchCount}`);
        if (!isAborted && !isTimeUp) alertLog.push("submitted");

        // 🧠 Incluir datos del ordenamiento adaptativo
        await finishAttempt(attemptId, {
          detailPerQuestion: results,
          scoreBySubject,
          alertLog,
          status: isAborted ? "aborted" : "finished",
          endedAt: new Date(),
          duration: startTime ? Math.round((new Date() - startTime) / 1000) : 0,
          securityEvents: {
            tabSwitches: tabSwitchCount,
            timeUp: isTimeUp,
            aborted: isAborted,
          },
          // 🆕 Datos del sistema adaptativo
          adaptiveOrderingData: {
            finalDifficultyLevel: adaptiveOrdering.difficultyLevel,
            totalStreak: adaptiveOrdering.currentStreak,
            answerPattern: adaptiveOrdering.lastAnswers,
            adaptiveEnabled: adaptiveOrdering.enabled,
          },
        });

        // Mostrar mensajes apropiados
        if (isAborted) {
          await Swal.fire({
            icon: "warning",
            title: "Examen finalizado por seguridad",
            text: "El examen se ha enviado automáticamente debido a violaciones de seguridad.",
            confirmButtonColor: "#EF4444",
          });
        } else if (isTimeUp) {
          await Swal.fire({
            icon: "info",
            title: "¡Tiempo agotado!",
            text: "El tiempo se ha agotado. Tu examen ha sido enviado automáticamente.",
            confirmButtonColor: "#10B981",
          });
        } else {
          await Swal.fire({
            icon: "success",
            title: "¡Examen enviado!",
            html: `
            <div class="text-center">
              <p class="mb-3">Tu examen ha sido enviado exitosamente.</p>
              <div class="bg-blue-50 p-3 rounded-lg">
                <p class="text-blue-800 text-sm">
                  🧠 Nivel final de dificultad: <strong>${adaptiveOrdering.difficultyLevel}</strong>
                </p>
                <p class="text-blue-600 text-xs">
                  El sistema adaptativo ajustó las preguntas según tu rendimiento
                </p>
              </div>
            </div>
          `,
            confirmButtonColor: "#10B981",
          });
        }

        nav(`/results/${attemptId}`);
      } catch (error) {
        console.error("❌ Error submitting exam:", error);
        await Swal.fire({
          icon: "error",
          title: "Error al enviar",
          text: "Hubo un problema al enviar tu examen. Inténtalo de nuevo.",
          confirmButtonColor: "#EF4444",
        });
        setSubmitting(false);
        setIsExamActive(true);
      }
    },
    [
      submitting,
      attemptId,
      questions,
      answers,
      validateAnswer,
      tabSwitchCount,
      startTime,
      nav,
      adaptiveOrdering,
      updateAdaptiveOrdering,
    ],
  );

  // Manejar tiempo agotado
  const handleTimeUp = useCallback(async () => {
    if (submitting || !attemptId || !isExamActive) return;
    console.log("⏰ Tiempo agotado");
    setIsTimeUp(true);
    await submitExam(true, false);
  }, [submitting, attemptId, isExamActive, submitExam]);

  // 🔒 Manejar cambio de pestaña
  const handleTabSwitch = useCallback(async () => {
    if (!attemptId || !isExamActive || submitting) return;

    const newCount = tabSwitchCount + 1;
    setTabSwitchCount(newCount);

    console.log(`🚨 Cambio de pestaña detectado. Conteo: ${newCount}`);

    if (newCount === 1 && !securityWarningShown) {
      setSecurityWarningShown(true);
      await Swal.fire({
        icon: "warning",
        title: "⚠️ Advertencia de Seguridad",
        html: `
          <div class="text-left">
            <p class="mb-3"><strong>Has cambiado de pestaña o ventana.</strong></p>
            <p class="mb-3">🔒 <strong>Política de seguridad:</strong></p>
            <ul class="text-sm text-gray-600 mb-3">
              <li>• <strong>2do cambio:</strong> Advertencia final</li>
              <li>• <strong>3er cambio:</strong> Examen finalizado automáticamente</li>
            </ul>
            <p class="text-red-600 font-medium">⚡ Mantente en esta pestaña para continuar</p>
          </div>
        `,
        confirmButtonText: "Entendido, continuar",
        confirmButtonColor: "#EF4444",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
      return;
    }

    if (newCount === 2) {
      await Swal.fire({
        icon: "error",
        title: "🚨 ÚLTIMA ADVERTENCIA",
        html: `
          <div class="text-left">
            <p class="mb-3"><strong class="text-red-600">Este es tu último aviso.</strong></p>
            <p class="mb-3">Si cambias de pestaña una vez más, tu examen será:</p>
            <div class="bg-red-50 p-3 rounded-lg mb-3">
              <ul class="text-sm text-red-800">
                <li>• ❌ <strong>Finalizado automáticamente</strong></li>
                <li>• 📝 <strong>Enviado con las respuestas actuales</strong></li>
                <li>• ⚠️ <strong>Marcado como violación de seguridad</strong></li>
              </ul>
            </div>
            <p class="text-red-600 font-bold">🎯 Permanece en esta pestaña</p>
          </div>
        `,
        confirmButtonText: "Entendido, no cambiaré de pestaña",
        confirmButtonColor: "#DC2626",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
      return;
    }

    if (newCount >= 3) {
      try {
        await Swal.fire({
          icon: "error",
          title: "🚫 Examen Finalizado",
          html: `
            <div class="text-left">
              <p class="mb-3"><strong class="text-red-600">Límite de cambios de pestaña excedido.</strong></p>
              <div class="bg-red-50 p-4 rounded-lg mb-3">
                <p class="text-red-800 font-medium">📋 <strong>Acciones tomadas:</strong></p>
                <ul class="text-sm text-red-700 mt-2">
                  <li>• Examen enviado automáticamente</li>
                  <li>• Respuestas guardadas hasta este momento</li>
                  <li>• Incidente registrado por seguridad</li>
                </ul>
              </div>
              <p class="text-gray-600 text-sm">Serás redirigido a los resultados.</p>
            </div>
          `,
          confirmButtonText: "Ver Resultados",
          confirmButtonColor: "#DC2626",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        await submitExam(false, true);
      } catch (error) {
        console.error("Error al finalizar examen por seguridad:", error);
        nav("/student/exams");
      }
    }
  }, [
    attemptId,
    isExamActive,
    submitting,
    tabSwitchCount,
    securityWarningShown,
    submitExam,
    nav,
  ]);

  // 🔥 SOLUCIÓN CRÍTICA: Cargar examen - COMPLETAMENTE REESCRITO
  useEffect(() => {
    let isMounted = true;

    const loadExam = async () => {
      if (!examId || !auth.currentUser) {
        console.log("❌ ExamId o usuario no disponible:", {
          examId,
          user: auth.currentUser,
        });
        setLoading(false);
        return;
      }

      try {
        console.log("🔄 Iniciando carga del examen:", examId);
        setLoading(true);

        // 1. Cargar datos del examen
        const examSnap = await getDoc(doc(db, "exams", examId));
        if (!examSnap.exists()) {
          throw new Error("Examen no encontrado");
        }

        const examData = { id: examSnap.id, ...examSnap.data() };
        console.log("📋 Datos del examen cargados:", examData.title);

        // 2. Verificar si el examen está disponible
        const now = new Date();
        const deadline = examData.deadline?.toDate
          ? examData.deadline.toDate()
          : new Date(examData.deadline);

        if (deadline <= now) {
          if (isMounted) {
            await Swal.fire({
              icon: "error",
              title: "Examen vencido",
              text: "Este examen ya no está disponible.",
              confirmButtonColor: "#3B82F6",
            });
            nav("/student/exams");
          }
          return;
        }

        if (!isMounted) return;
        setExam(examData);

        // 3. Verificar intentos previos
        const attempts = await getUserAttempts(auth.currentUser.uid, examId);
        setUserAttempts(attempts);

        const finishedAttempts = attempts.filter(
          (att) => att.status === "finished",
        ).length;
        if (finishedAttempts >= (examData.maxAttempts || 1)) {
          if (isMounted) {
            await Swal.fire({
              icon: "warning",
              title: "Límite de intentos alcanzado",
              text: `Ya has completado el máximo de ${
                examData.maxAttempts || 1
              } intento(s) para este examen.`,
              confirmButtonColor: "#3B82F6",
            });
            nav("/student/exams");
          }
          return;
        }

        // 4. Cargar preguntas con datos completos y normalizados
        console.log("📚 Cargando preguntas...");
        const questionsData = await Promise.all(
          (examData.questionRefs || []).map(async (questionId) => {
            try {
              const questionSnap = await getDoc(
                doc(db, "questions", questionId),
              );
              if (!questionSnap.exists()) {
                console.warn(`⚠️ Pregunta no encontrada: ${questionId}`);
                return null;
              }

              const questionData = questionSnap.data();

              // Obtener nombre de la materia
              let subjectName = "Materia no encontrada";
              if (questionData.subject) {
                try {
                  const subjectDoc = await getDoc(
                    doc(db, "subjects", questionData.subject),
                  );
                  if (subjectDoc.exists()) {
                    subjectName = subjectDoc.data().name;
                  }
                } catch (subjectError) {
                  console.warn(
                    `⚠️ Error cargando materia ${questionData.subject}:`,
                    subjectError,
                  );
                }
              }

              // NORMALIZAR opciones: asegurar { id, text } por opción
              const rawOptions = Array.isArray(questionData.options)
                ? questionData.options
                : [];
              const normalizedOptions = rawOptions.map((opt, i) => {
                if (opt && typeof opt === "object") {
                  // si ya tiene id/text
                  return {
                    id: opt.id || opt._id || `${questionSnap.id}_opt_${i}`,
                    text: opt.text ?? opt.label ?? String(opt.value ?? opt),
                    imageUrl: opt.imageUrl || null,
                  };
                }
                // si es string o número
                return {
                  id: `${questionSnap.id}_opt_${i}`,
                  text: String(opt),
                  imageUrl: null,
                };
              });

              // Normalizar respuestas correctas a ids (para multiple/icfes/image/video)
              let normalizedCorrectAnswers = questionData.correctAnswers;
              if (questionData.type === "true-false") {
                // mantener como "Verdadero"/"Falso"
                if (Array.isArray(normalizedCorrectAnswers)) {
                  normalizedCorrectAnswers = normalizedCorrectAnswers[0];
                }
                if (
                  normalizedCorrectAnswers === true ||
                  normalizedCorrectAnswers === "true"
                ) {
                  normalizedCorrectAnswers = "Verdadero";
                } else if (
                  normalizedCorrectAnswers === false ||
                  normalizedCorrectAnswers === "false"
                ) {
                  normalizedCorrectAnswers = "Falso";
                }
              } else if (
                ["multiple-choice", "icfes", "image", "video"].includes(
                  questionData.type,
                )
              ) {
                // Convertir índices o textos a option.ids
                if (Array.isArray(normalizedCorrectAnswers)) {
                  normalizedCorrectAnswers = normalizedCorrectAnswers
                    .map((ca) => {
                      // si es número, mapa por índice
                      if (typeof ca === "number") {
                        const opt = normalizedOptions[ca];
                        return opt ? opt.id : null;
                      }
                      // si coincide con texto, buscar id por texto
                      const byText = normalizedOptions.find(
                        (o) => o.text === ca,
                      );
                      if (byText) return byText.id;
                      // si coincide con id ya
                      if (
                        normalizedOptions.find((o) => o.id === ca) !== undefined
                      )
                        return ca;
                      return null;
                    })
                    .filter(Boolean);
                } else if (typeof normalizedCorrectAnswers === "number") {
                  const opt = normalizedOptions[normalizedCorrectAnswers];
                  normalizedCorrectAnswers = opt
                    ? [opt.id]
                    : [String(normalizedCorrectAnswers)];
                } else if (typeof normalizedCorrectAnswers === "string") {
                  const byText = normalizedOptions.find(
                    (o) => o.text === normalizedCorrectAnswers,
                  );
                  normalizedCorrectAnswers = byText
                    ? [byText.id]
                    : [normalizedCorrectAnswers];
                } else {
                  normalizedCorrectAnswers = [];
                }
              }

              return {
                id: questionSnap.id,
                ...questionData,
                subjectName,
                options: normalizedOptions,
                correctAnswers: normalizedCorrectAnswers,
              };
            } catch (error) {
              console.error(`❌ Error cargando pregunta ${questionId}:`, error);
              return null;
            }
          }),
        );

        const validQuestions = questionsData.filter(Boolean);
        if (validQuestions.length === 0) {
          throw new Error(
            "No se encontraron preguntas válidas para este examen",
          );
        }

        // Mezclar preguntas aleatoriamente
        const shuffledQuestions = validQuestions.sort(
          () => Math.random() - 0.5,
        );

        if (!isMounted) return;
        setQuestions(shuffledQuestions);
        console.log(
          "✅ Preguntas cargadas correctamente:",
          shuffledQuestions.length,
        );

        // 5. Mostrar instrucciones de seguridad
        const result = await Swal.fire({
          icon: "info",
          title: "🔒 Instrucciones de Seguridad",
          html: `
          <div class="text-left">
            <p class="mb-3">Para garantizar la integridad del examen:</p>
            <div class="bg-blue-50 p-4 rounded-lg mb-3">
              <ul class="text-sm text-blue-800">
                <li>• 🖥️ <strong>Mantente en esta pestaña</strong> durante todo el examen</li>
                <li>• ⏰ <strong>Tiempo límite:</strong> ${examData.timeLimit} minutos</li>
                <li>• 🚫 <strong>No cambies de pestaña</strong> - Se registrará como violación</li>
                <li>• 💾 <strong>Se guarda automáticamente</strong> al finalizar</li>
              </ul>
            </div>
            <p class="text-green-600 font-medium">¡Éxito en tu examen! 🎯</p>
          </div>
        `,
          confirmButtonText: "Comenzar Examen",
          confirmButtonColor: "#10B981",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        if (!result.isConfirmed || !isMounted) {
          nav("/student/exams");
          return;
        }

        // 6. Crear intento
        console.log("🆕 Creando nuevo intento...");
        const newAttemptId = await createAttempt({
          userId: auth.currentUser.uid,
          examId: examId,
        });

        if (isMounted) {
          setAttemptId(newAttemptId);
          setStartTime(new Date());
          setTimeRemaining(examData.timeLimit * 60);
          setIsExamActive(true);
          console.log("✅ Examen iniciado correctamente:", newAttemptId);
        }
      } catch (error) {
        console.error("❌ Error loading exam:", error);
        if (isMounted) {
          await Swal.fire({
            icon: "error",
            title: "Error al cargar el examen",
            text:
              error.message ||
              "Hubo un problema al cargar el examen. Inténtalo de nuevo.",
            confirmButtonColor: "#3B82F6",
          });
          nav("/student/exams");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadExam();

    return () => {
      isMounted = false;
    };
  }, [examId, nav]);

  // Timer del examen
  useEffect(() => {
    if (!timeRemaining || timeRemaining <= 0 || submitting || !isExamActive)
      return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, submitting, isExamActive, handleTimeUp]);

  // Detección de cambio de pestaña
  useEffect(() => {
    if (!isExamActive || submitting) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("🚨 Pestaña oculta detectada");
        handleTabSwitch();
      }
    };

    const handleFocusOut = () => {
      console.log("🚨 Pérdida de foco detectada");
      handleTabSwitch();
    };

    const handleBeforeUnload = (e) => {
      if (isExamActive && !submitting) {
        e.preventDefault();
        e.returnValue =
          "¿Estás seguro de que quieres salir? Tu examen se perderá.";
        return e.returnValue;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleFocusOut);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleFocusOut);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isExamActive, submitting, handleTabSwitch]);

  // Navegar entre preguntas
  const goToQuestion = useCallback(
    (index) => {
      if (index >= 0 && index < questions.length && isExamActive) {
        setCurrrentQuestionIndex(index);
      }
    },
    [questions.length, isExamActive],
  );

  // Confirmar envío del examen
  const confirmSubmitExam = useCallback(async () => {
    if (!isExamActive) return;

    const unanswered = questions.length - Object.keys(answers).length;
    const answered = Object.keys(answers).length;

    const result = await Swal.fire({
      icon: "question",
      title: "📝 Confirmar envío",
      html: `
        <div class="text-left">
          <p class="mb-3"><strong>Resumen de tu examen:</strong></p>
          <div class="bg-gray-50 p-4 rounded-lg mb-3">
            <ul class="text-sm">
              <li>✅ <strong>Respondidas:</strong> ${answered} preguntas</li>
              <li>❓ <strong>Sin responder:</strong> ${unanswered} preguntas</li>
              <li>📊 <strong>Total:</strong> ${questions.length} preguntas</li>
            </ul>
          </div>
          ${
            unanswered > 0
              ? '<p class="text-red-600 font-medium">⚠️ Las preguntas sin responder contarán como incorrectas.</p>'
              : '<p class="text-green-600 font-medium">🎉 ¡Has respondido todas las preguntas!</p>'
          }
          <p class="mt-3">¿Estás seguro de que quieres enviar tu examen?</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "✅ Sí, enviar examen",
      cancelButtonText: "❌ Cancelar",
    });

    if (result.isConfirmed) {
      await submitExam(false, false);
    }
  }, [isExamActive, questions.length, answers, submitExam]);

  // Formatear tiempo
  const formatTime = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Valores calculados memoizados
  const { currentQuestion, progress, answeredCount } = useMemo(() => {
    if (!questions.length)
      return { currentQuestion: null, progress: 0, answeredCount: 0 };

    return {
      currentQuestion: questions[currentQuestionIndex],
      progress: ((currentQuestionIndex + 1) / questions.length) * 100,
      answeredCount: Object.keys(answers).length,
    };
  }, [questions, currentQuestionIndex, answers]);

  // Estados de carga y error
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50">
        <div className="text-center">
          <Spinner size="16" />
          <p className="mt-4 text-gray-600 text-lg">Cargando examen...</p>
          <p className="mt-2 text-gray-500 text-sm">Preparando tu evaluación</p>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Examen no disponible
            </h2>
            <p className="text-gray-600 mb-6">
              No se pudo cargar el examen solicitado.
            </p>
            <button
              onClick={() => nav("/student/exams")}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              Volver a exámenes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50">
      {/* Barra superior fija */}
      <div className="bg-white shadow-lg border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800">{exam.title}</h1>
              <span className="text-sm text-gray-500">
                {currentQuestionIndex + 1} de {questions.length}
              </span>

              {/* Indicador de seguridad */}
              {tabSwitchCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Alertas: {tabSwitchCount}/3</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              {/* Timer */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${
                  timeRemaining <= 300
                    ? "bg-red-100 text-red-700"
                    : timeRemaining <= 900
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                }`}
              >
                <Clock className="w-5 h-5" />
                {formatTime(timeRemaining || 0)}
              </div>

              {/* Progreso */}
              <div className="text-sm text-gray-600">
                <span className="font-medium">{answeredCount}</span>/
                {questions.length} respondidas
              </div>

              {/* Botón enviar */}
              <button
                onClick={confirmSubmitExam}
                disabled={submitting || !isExamActive}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
              >
                {submitting ? "Enviando..." : "Enviar Examen"}
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Panel de navegación lateral */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Navegación
              </h3>

              {/* 🔥 NAVEGACIÓN LATERAL MEJORADA */}
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 mb-6">
                {questions.map((_, index) => {
                  const questionId = questions[index]?.id;
                  let isAnswered = false;

                  if (questionId && answers[questionId]) {
                    if (Array.isArray(answers[questionId])) {
                      // Para arrays (ICFES), verificar que no esté vacío
                      isAnswered = answers[questionId].length > 0;
                    } else {
                      // Para respuestas únicas, verificar que exista y no sea undefined/null
                      isAnswered =
                        answers[questionId] !== undefined &&
                        answers[questionId] !== null;
                    }
                  }

                  const isCurrent = index === currentQuestionIndex;
                  const questionType = questions[index]?.type || "unknown";

                  return (
                    <button
                      key={index}
                      onClick={() => goToQuestion(index)}
                      disabled={!isExamActive}
                      title={`Pregunta ${index + 1} (${questionType}) - ${
                        isAnswered ? "Respondida" : "Sin responder"
                      }`}
                      className={`w-12 h-12 rounded-lg font-bold text-sm transition-all duration-200 relative ${
                        isCurrent
                          ? "bg-blue-600 text-white shadow-lg transform scale-110"
                          : isAnswered
                            ? "bg-green-100 text-green-700 hover:bg-green-200 shadow-md"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {index + 1}

                      {/* Indicador de tipo ICFES */}
                      {questionType === "icfes" && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full"></div>
                      )}

                      {/* Indicador de respuesta múltiple */}
                      {isAnswered &&
                        Array.isArray(answers[questionId]) &&
                        answers[questionId].length > 1 && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center">
                            {answers[questionId].length}
                          </div>
                        )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span>Pregunta actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-200 rounded"></div>
                  <span>Respondida</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded"></div>
                  <span>Sin responder</span>
                </div>
              </div>

              {/* Panel de seguridad */}
              <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Seguridad
                  </span>
                </div>
                <div className="text-xs text-blue-700">
                  <p>Cambios de pestaña: {tabSwitchCount}/3</p>
                  <p className="text-blue-600 mt-1">🔒 Examen protegido</p>
                </div>
              </div>
            </div>
          </div>

          {/* Área principal de la pregunta */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              {/* Header de la pregunta */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    <span className="text-lg font-semibold text-gray-800">
                      {currentQuestion?.subjectName || "Sin materia"}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        currentQuestion?.difficulty === "easy"
                          ? "bg-green-100 text-green-700"
                          : currentQuestion?.difficulty === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {currentQuestion?.difficulty === "easy"
                        ? "Fácil"
                        : currentQuestion?.difficulty === "medium"
                          ? "Medio"
                          : "Difícil"}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {currentQuestion?.type === "icfes"
                        ? "Múltiple selección"
                        : currentQuestion?.type === "true-false"
                          ? "Verdadero/Falso"
                          : "Única selección"}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 font-medium">
                    Pregunta {currentQuestionIndex + 1} de {questions.length}
                  </span>
                </div>

                <h2 className="text-xl text-gray-800 leading-relaxed">
                  {currentQuestion?.text || "Sin texto disponible"}
                </h2>

                {/* Instrucción especial para ICFES */}
                {currentQuestion?.type === "icfes" && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">
                      💡 <strong>Instrucción:</strong> Puedes seleccionar
                      múltiples respuestas para esta pregunta.
                    </p>
                  </div>
                )}
              </div>

              {/* Media (si existe) */}
              {currentQuestion?.mediaUrl && (
                <div className="mb-6 text-center">
                  {currentQuestion.type === "image" && (
                    <img
                      src={currentQuestion.mediaUrl}
                      alt="Imagen de la pregunta"
                      className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                    />
                  )}
                  {currentQuestion.type === "video" && (
                    <video
                      src={currentQuestion.mediaUrl}
                      controls
                      className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                    />
                  )}
                </div>
              )}

              {/* 🔥 OPCIONES DE RESPUESTA COMPLETAMENTE CORREGIDAS */}
              <div className="space-y-3 mb-8">
                {currentQuestion?.type === "true-false"
                  ? // eslint-disable-next-line no-unused-vars
                    ["Verdadero", "Falso"].map((label, idx) => {
                      const isSelected = answers[currentQuestion.id] === label;
                      return (
                        <button
                          key={label}
                          onClick={() => handleAnswer(label)}
                          disabled={!isExamActive}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 text-blue-900 shadow-lg transform scale-[1.02]"
                              : "border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? "border-blue-500 bg-blue-500 shadow-md"
                                  : "border-gray-300 group-hover:border-blue-400"
                              }`}
                            >
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <span className="font-medium text-lg">{label}</span>
                          </div>
                        </button>
                      );
                    })
                  : currentQuestion?.options?.map((option, index) => {
                      // option: { id, text }
                      const optionId = option.id;
                      let isSelected = false;

                      if (currentQuestion.type === "icfes") {
                        const selectedAnswers = Array.isArray(
                          answers[currentQuestion.id],
                        )
                          ? answers[currentQuestion.id]
                          : [];
                        isSelected = selectedAnswers.includes(optionId);
                      } else {
                        isSelected = answers[currentQuestion.id] === optionId;
                      }

                      return (
                        <button
                          key={optionId}
                          onClick={() => {
                            console.log("🖱️ Click en opción:", {
                              optionId,
                              optionText: option.text,
                              type: currentQuestion.type,
                              currentlySelected: isSelected,
                              currentAnswers: answers[currentQuestion.id],
                            });
                            handleAnswer(optionId);
                          }}
                          disabled={!isExamActive}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 text-blue-900 shadow-lg transform scale-[1.02]"
                              : "border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                          } disabled:opacity-50 disabled:cursor-not-allowed group`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 ${
                                currentQuestion.type === "icfes"
                                  ? "rounded-lg"
                                  : "rounded-full"
                              } border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? "border-blue-500 bg-blue-500 shadow-md"
                                  : "border-gray-300 group-hover:border-blue-400"
                              }`}
                            >
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <span className="font-medium flex-1 flex flex-col">
                              <div className="flex items-start">
                                <span className="text-blue-600 font-bold mr-3 text-lg">
                                  {String.fromCharCode(65 + index)}.
                                </span>
                                <span className="text-gray-800">
                                  {option.text}
                                </span>
                              </div>
                              {option.imageUrl && (
                                <div className="ml-8 mt-2">
                                  <LazyImage
                                    src={option.imageUrl}
                                    alt={`Opción ${String.fromCharCode(65 + index)}`}
                                    className="max-h-48 w-auto rounded-lg shadow-sm object-contain"
                                  />
                                </div>
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })}
              </div>

              {/* 🔥 PANEL MEJORADO PARA RESPUESTAS MÚLTIPLES ICFES */}
              {currentQuestion?.type === "icfes" &&
                Array.isArray(answers[currentQuestion.id]) &&
                answers[currentQuestion.id].length > 0 && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm font-bold text-green-800">
                        Respuestas seleccionadas:{" "}
                        {answers[currentQuestion.id].length}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {answers[currentQuestion.id].map(
                        (selectedOption, idx) => {
                          // Encontrar el índice de la opción para mostrar la letra
                          const optionIndex =
                            currentQuestion.options?.indexOf(selectedOption);
                          const optionLetter =
                            optionIndex !== -1
                              ? String.fromCharCode(65 + optionIndex)
                              : "?";

                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-300 shadow-sm"
                            >
                              <span className="font-bold">{optionLetter}.</span>
                              <span
                                className="max-w-[200px] truncate"
                                title={selectedOption}
                              >
                                {selectedOption}
                              </span>
                              <button
                                onClick={() => handleAnswer(selectedOption)}
                                className="ml-1 text-green-600 hover:text-green-800 transition-colors"
                                title="Remover selección"
                              >
                                ×
                              </button>
                            </div>
                          );
                        },
                      )}
                    </div>
                    <p className="text-xs text-green-600 mt-2 italic">
                      💡 Haz clic en una opción seleccionada para
                      deseleccionarla
                    </p>
                  </div>
                )}
              {/* Navegación */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0 || !isExamActive}
                  className="flex items-center gap-2 px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-5 h-5 rotate-180" />
                  Anterior
                </button>
                <div className="text-center">
                  {(() => {
                    const questionId = currentQuestion?.id;
                    let isAnswered = false;

                    if (questionId && answers[questionId]) {
                      if (Array.isArray(answers[questionId])) {
                        // Para arrays (ICFES), verificar que no esté vacío
                        isAnswered = answers[questionId].length > 0;
                      } else {
                        // Para respuestas únicas, verificar que exista
                        isAnswered = true;
                      }
                    }

                    return isAnswered ? (
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="w-8 h-8 text-gray-400 mx-auto" />
                    );
                  })()}
                </div>
                // 🔥 MODIFICACIÓN: Botón "Siguiente" con ordenamiento
                adaptativo
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => {
                      // Evaluar respuesta actual antes de continuar
                      const currentAnswer = answers[currentQuestion?.id];
                      if (currentAnswer !== undefined) {
                        const isCorrect = validateAnswer(
                          currentQuestion,
                          currentAnswer,
                        );
                        updateAdaptiveOrdering(currentQuestion.id, isCorrect);
                      }

                      // Navegar con ordenamiento adaptativo
                      goToNextQuestion();
                    }}
                    disabled={!isExamActive}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={confirmSubmitExam}
                    disabled={submitting || !isExamActive}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {submitting ? "Enviando..." : "Finalizar Examen"}
                    <CheckCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
