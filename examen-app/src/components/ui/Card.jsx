import React from 'react';

/**
 * Variantes de estilo de la card
 */
const variants = {
  default: 'bg-white border border-gray-100',
  elevated: 'bg-white shadow-lg border border-gray-100',
  outlined: 'bg-white border-2 border-gray-200',
  gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-100',
  primary: 'bg-gradient-to-br from-primaryBlue to-blue-700 text-white',
  success: 'bg-gradient-to-br from-success to-green-600 text-white',
  warning: 'bg-gradient-to-br from-accentYellow to-yellow-500 text-primaryBlue',
};

/**
 * Componente Card base para contenedores
 */
export default function Card({
  children,
  variant = 'elevated',
  hover = false,
  className = '',
  padding = 'p-6',
  onClick,
  ...props
}) {
  const baseClasses = 'rounded-2xl transition-all duration-300';

  const hoverClasses = hover
    ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'
    : '';

  const clickableClasses = onClick
    ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primaryBlue focus:ring-offset-2'
    : '';

  return (
    <div
      className={`
        ${baseClasses}
        ${variants[variant] || variants.default}
        ${hoverClasses}
        ${clickableClasses}
        ${padding}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Header de la Card
 */
Card.Header = function CardHeader({ children, className = '' }) {
  return (
    <div className={`border-b border-gray-100 pb-4 mb-4 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Footer de la Card
 */
Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={`border-t border-gray-100 pt-4 mt-4 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Título de la Card
 */
Card.Title = function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-xl font-bold text-gray-800 ${className}`}>
      {children}
    </h3>
  );
};

/**
 * Descripción de la Card
 */
Card.Description = function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-gray-600 mt-1 ${className}`}>
      {children}
    </p>
  );
};
