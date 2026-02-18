import React from 'react';

/**
 * Variantes de estilo del badge
 */
const variants = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-primaryBlue/10 text-primaryBlue',
  secondary: 'bg-gray-500/10 text-gray-600',
  success: 'bg-success/10 text-success',
  warning: 'bg-accentYellow/20 text-yellow-700',
  danger: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
  outline: 'bg-transparent border-2 border-current',
};

/**
 * Tamaños del badge
 */
const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

/**
 * Componente Badge para etiquetas de estado
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  className = '',
  ...props
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full
        ${variants[variant] || variants.default}
        ${sizes[size] || sizes.md}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {dot && (
        <span
          className={`
            w-2 h-2 rounded-full
            ${variant === 'success' ? 'bg-success' : ''}
            ${variant === 'warning' ? 'bg-yellow-500' : ''}
            ${variant === 'danger' ? 'bg-error' : ''}
            ${variant === 'info' ? 'bg-info' : ''}
            ${variant === 'primary' ? 'bg-primaryBlue' : ''}
            ${variant === 'default' || variant === 'secondary' ? 'bg-gray-400' : ''}
          `}
          aria-hidden="true"
        />
      )}
      {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
