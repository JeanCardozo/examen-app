import React, { forwardRef, useId } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Componente Input accesible con soporte para labels, errores, hints e iconos
 */
const Input = forwardRef(({
  label,
  error,
  success,
  hint,
  leftIcon,
  rightIcon,
  className = '',
  containerClassName = '',
  required = false,
  type = 'text',
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const getStateClasses = () => {
    if (error) return 'border-error focus:ring-error/30 focus:border-error';
    if (success) return 'border-success focus:ring-success/30 focus:border-success';
    return 'border-gray-300 focus:ring-primaryBlue/30 focus:border-primaryBlue';
  };

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-gray-700"
        >
          {label}
          {required && (
            <span className="text-error ml-1" aria-hidden="true">*</span>
          )}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-required={required}
          className={`
            w-full px-4 py-3 rounded-xl border-2
            transition-all duration-200
            focus:outline-none focus:ring-4
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
            placeholder:text-gray-400
            ${leftIcon ? 'pl-11' : ''}
            ${rightIcon || error || success ? 'pr-11' : ''}
            ${getStateClasses()}
            ${className}
          `}
          {...props}
        />

        {(rightIcon || error || success) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {error ? (
              <AlertCircle className="w-5 h-5 text-error" aria-hidden="true" />
            ) : success ? (
              <CheckCircle className="w-5 h-5 text-success" aria-hidden="true" />
            ) : rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-sm text-error flex items-center gap-1.5" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
