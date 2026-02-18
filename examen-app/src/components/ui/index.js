/**
 * @fileoverview Barrel export para componentes UI
 * Facilita la importación de componentes desde un solo lugar
 */

// Componentes base
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Card } from './Card';
export { default as Badge } from './Badge';

// Estados
export { default as EmptyState } from './EmptyState';
export { default as ErrorState } from './ErrorState';

// Skeletons
export {
  default as Skeleton,
  SkeletonExamCard,
  SkeletonExamList,
  SkeletonStatCard,
  SkeletonStatsGrid,
  SkeletonHistoryItem,
  SkeletonHistoryList,
  SkeletonTable,
  SkeletonQuestion,
  SkeletonDashboard,
} from './Skeleton';

// Navegación
export { default as Pagination, PaginationInfo } from './Pagination';
