import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Variantes de estilo del botón
 */
const variants = {
  primary: 'bg-primaryBlue hover:bg-primaryBlueLight text-white shadow-md hover:shadow-lg',
  secondary: 'bg-white text-primaryBlue border-2 border-primaryBlue hover:bg-blue-50',
  danger: 'bg-error hover:bg-red-600 text-white shadow-md hover:shadow-lg',
  success: 'bg-success hover:bg-green-600 text-white shadow-md hover:shadow-lg',
  warning: 'bg-accentYellow hover:bg-accentYellowDark text-primaryBlue shadow-md hover:shadow-lg',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
  outline: 'bg-transparent border-2 border-gray-300 text-gray-700 hover:border-primaryBlue hover:text-primaryBlue',
};

/**
 * Tamaños del botón
 */
const sizes = {
  xs: 'px-2.5 py-1.5 text-xs',
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl',
};

/**
 * Componente Button mejorado con variantes, tamaños y estados
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-xl
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-primaryBlue focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    active:scale-[0.98]
  `;

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={`
        ${baseClasses}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!loading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
