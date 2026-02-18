import React from 'react';

/**
 * Componente base de Skeleton con animación
 */
export default function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  ...props
}) {
  const variants = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded-md h-4',
  };

  return (
    <div
      className={`
        animate-pulse
        bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200
        bg-[length:200%_100%]
        ${variants[variant] || variants.rectangular}
        ${className}
      `}
      style={{ width, height }}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Skeleton para tarjetas de examen
 */
export function SkeletonExamCard() {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-gray-200 to-gray-300">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Skeleton className="h-7 w-3/4 mb-3 bg-gray-300/50" />
            <Skeleton className="h-4 w-1/2 bg-gray-300/50" />
          </div>
          <Skeleton className="w-12 h-12 rounded-xl bg-gray-300/50" variant="rectangular" />
        </div>
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-6 w-24 rounded-full bg-gray-300/50" />
          <Skeleton className="h-6 w-20 rounded-full bg-gray-300/50" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton para lista de exámenes
 */
export function SkeletonExamList({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonExamCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton para tarjetas de estadísticas
 */
export function SkeletonStatCard() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="w-14 h-14 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton para grid de estadísticas
 */
export function SkeletonStatsGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton para items del historial
 */
export function SkeletonHistoryItem() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <Skeleton className="h-3 w-12 mb-2" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <Skeleton className="w-24 h-24 rounded-2xl mb-2" />
          <Skeleton className="h-4 w-16 mx-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para lista del historial
 */
export function SkeletonHistoryList({ count = 3 }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonHistoryItem key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton para tablas
 */
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-5 flex-1" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="p-4">
            <div className="flex gap-4 items-center">
              {Array.from({ length: cols }).map((_, colIdx) => (
                <Skeleton key={colIdx} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton para preguntas de examen
 */
export function SkeletonQuestion() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6 rounded" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-3/4" />
      </div>

      {/* Opciones */}
      <div className="space-y-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border-2 border-gray-200">
            <div className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-5 flex-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Navegación */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-12 w-28 rounded-xl" />
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-12 w-28 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton para dashboard completo
 */
export function SkeletonDashboard() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Stats */}
      <SkeletonStatsGrid count={4} />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
        <div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
