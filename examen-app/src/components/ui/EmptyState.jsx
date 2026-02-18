import React from 'react';
import {
  Inbox,
  FileQuestion,
  Users,
  BookOpen,
  ClipboardList,
  Search,
  Calendar,
  BarChart3,
  FolderOpen
} from 'lucide-react';
import Button from './Button';

/**
 * Presets de estados vacíos para diferentes contextos
 */
const presets = {
  default: {
    icon: Inbox,
    title: 'No hay datos',
    description: 'Aún no hay elementos para mostrar.',
  },
  questions: {
    icon: FileQuestion,
    title: 'Sin preguntas',
    description: 'No hay preguntas creadas. Comienza agregando una nueva pregunta al banco.',
    actionLabel: 'Crear pregunta',
  },
  students: {
    icon: Users,
    title: 'Sin estudiantes',
    description: 'No hay estudiantes registrados o que coincidan con tu búsqueda.',
  },
  exams: {
    icon: ClipboardList,
    title: 'Sin exámenes',
    description: 'No hay exámenes disponibles en este momento. Los exámenes aparecerán aquí cuando estén listos.',
  },
  subjects: {
    icon: BookOpen,
    title: 'Sin materias',
    description: 'No hay materias creadas. Crea una materia para poder agregar preguntas.',
    actionLabel: 'Crear materia',
  },
  attempts: {
    icon: ClipboardList,
    title: 'Sin intentos',
    description: 'Aún no has realizado ningún intento de examen. ¡Empieza tu primer examen!',
    actionLabel: 'Ver exámenes disponibles',
  },
  history: {
    icon: Calendar,
    title: 'Sin historial',
    description: 'Tu historial de exámenes aparecerá aquí después de completar tu primer examen.',
  },
  search: {
    icon: Search,
    title: 'Sin resultados',
    description: 'No encontramos resultados para tu búsqueda. Intenta con otros términos.',
    actionLabel: 'Limpiar búsqueda',
  },
  progress: {
    icon: BarChart3,
    title: 'Sin progreso',
    description: 'Completa algunos exámenes para ver tu progreso y estadísticas aquí.',
    actionLabel: 'Ver exámenes',
  },
  folder: {
    icon: FolderOpen,
    title: 'Carpeta vacía',
    description: 'Esta carpeta no tiene contenido todavía.',
  },
};

/**
 * Componente EmptyState para mostrar estados vacíos con acciones
 */
export default function EmptyState({
  preset,
  icon: CustomIcon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  children,
  className = '',
  size = 'md',
}) {
  const config = preset ? (presets[preset] || presets.default) : presets.default;
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActionLabel = actionLabel || config.actionLabel;

  const sizes = {
    sm: {
      container: 'py-8 px-4',
      icon: 'w-12 h-12',
      iconWrapper: 'w-16 h-16 mb-4',
      title: 'text-lg',
      description: 'text-sm max-w-xs',
    },
    md: {
      container: 'py-12 px-6',
      icon: 'w-10 h-10',
      iconWrapper: 'w-20 h-20 mb-6',
      title: 'text-xl',
      description: 'text-base max-w-sm',
    },
    lg: {
      container: 'py-16 px-8',
      icon: 'w-12 h-12',
      iconWrapper: 'w-24 h-24 mb-8',
      title: 'text-2xl',
      description: 'text-lg max-w-md',
    },
  };

  const sizeConfig = sizes[size] || sizes.md;

  return (
    <div
      className={`
        text-center
        bg-gradient-to-b from-gray-50 to-white
        rounded-2xl border-2 border-dashed border-gray-200
        ${sizeConfig.container}
        ${className}
      `}
    >
      <div className={`${sizeConfig.iconWrapper} mx-auto rounded-full bg-gray-100 flex items-center justify-center`}>
        <Icon className={`${sizeConfig.icon} text-gray-400`} aria-hidden="true" />
      </div>

      <h3 className={`${sizeConfig.title} font-bold text-gray-700 mb-2`}>
        {displayTitle}
      </h3>

      <p className={`${sizeConfig.description} text-gray-500 mx-auto mb-6`}>
        {displayDescription}
      </p>

      {(onAction || onSecondaryAction || children) && (
        <div className="flex flex-wrap gap-3 justify-center">
          {onAction && displayActionLabel && (
            <Button onClick={onAction} variant="primary">
              {displayActionLabel}
            </Button>
          )}
          {onSecondaryAction && secondaryActionLabel && (
            <Button onClick={onSecondaryAction} variant="outline">
              {secondaryActionLabel}
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
