import React, { useState, useRef, useEffect } from 'react';
import { Play, VideoOff, Loader2 } from 'lucide-react';

/**
 * Componente de video con lazy loading
 * Muestra un thumbnail con botón de play antes de cargar el video real
 */
export default function LazyVideo({
  src,
  className = '',
  poster = null,
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
  rootMargin = '50px'
}) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showVideo, setShowVideo] = useState(autoPlay);
  const [error, setError] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);

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
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  const handlePlay = () => {
    setShowVideo(true);
  };

  const handleLoaded = () => {
    setIsLoaded(true);
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay puede ser bloqueado por el navegador
      });
    }
  };

  const handleError = () => {
    setError(true);
  };

  // Estado de error
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 rounded-xl p-6 ${className}`}>
        <VideoOff className="w-12 h-12 text-gray-400 mb-2" />
        <span className="text-gray-500 text-sm text-center">Error al cargar video</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {!showVideo ? (
        // Thumbnail con botón de play
        <div
          className="relative cursor-pointer group rounded-xl overflow-hidden"
          onClick={handlePlay}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && handlePlay()}
          aria-label="Reproducir video"
        >
          {poster ? (
            <img
              src={poster}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full min-h-[200px] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <span className="text-gray-500 text-lg font-medium">Video</span>
            </div>
          )}

          {/* Overlay con botón de play */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all duration-200">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
              <Play className="w-8 h-8 text-blue-600 ml-1" />
            </div>
          </div>
        </div>
      ) : (
        // Video real
        isInView && (
          <div className="relative rounded-xl overflow-hidden">
            {/* Loading spinner */}
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
            )}

            <video
              ref={videoRef}
              src={src}
              controls={controls}
              muted={muted}
              loop={loop}
              className={`
                w-full rounded-xl
                ${isLoaded ? 'opacity-100' : 'opacity-0'}
                transition-opacity duration-300
              `}
              onLoadedData={handleLoaded}
              onError={handleError}
              preload="metadata"
              playsInline
            />
          </div>
        )
      )}
    </div>
  );
}
