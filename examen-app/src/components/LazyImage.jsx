import React, { useState, useRef, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * Componente de imagen con lazy loading usando IntersectionObserver
 * Mejora el rendimiento cargando imágenes solo cuando entran al viewport
 */
export default function LazyImage({
  src,
  alt = '',
  className = '',
  placeholder = null,
  onLoad = () => {},
  onError = () => {},
  rootMargin = '100px',
  threshold = 0.01
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad();
  };

  const handleError = () => {
    setError(true);
    onError();
  };

  // Placeholder por defecto con animación pulse
  const defaultPlaceholder = (
    <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-center h-full min-h-[150px]">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  );

  // Estado de error
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 rounded-lg p-4 ${className}`}>
        <ImageOff className="w-10 h-10 text-gray-400 mb-2" />
        <span className="text-gray-500 text-sm text-center">Error al cargar imagen</span>
      </div>
    );
  }

  return (
    <div ref={imgRef} className="relative">
      {/* Placeholder mientras carga */}
      {!isLoaded && (placeholder || defaultPlaceholder)}

      {/* Imagen real - solo se carga cuando está en viewport */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`
            ${className}
            ${isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}
            transition-opacity duration-300 ease-in-out
          `}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}
