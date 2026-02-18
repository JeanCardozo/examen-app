/** @type {import('tailwindcss').Config} */
export const content = ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"];

export const theme = {
  extend: {
    // Colores personalizados
    colors: {
      primaryBlue: "#1E3A8A",
      primaryBlueLight: "#3B82F6",
      primaryBlueDark: "#172554",
      accentYellow: "#FACC15",
      accentYellowLight: "#FEF08A",
      accentYellowDark: "#CA8A04",
      error: "#EF4444",
      success: "#22C55E",
      info: "#2563EB",
      warning: "#F59E0B",
    },

    // Fuentes
    fontFamily: {
      sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
    },

    // Border radius
    borderRadius: {
      xl: "1rem",
      "2xl": "1.5rem",
      "3xl": "2rem",
    },

    // Sombras personalizadas
    boxShadow: {
      card: "0 4px 24px 0 rgba(30, 58, 138, 0.08)",
      "card-hover": "0 8px 32px 0 rgba(30, 58, 138, 0.12)",
      glow: "0 0 20px rgba(59, 130, 246, 0.3)",
      "glow-success": "0 0 20px rgba(34, 197, 94, 0.3)",
      "glow-error": "0 0 20px rgba(239, 68, 68, 0.3)",
    },

    // Animaciones personalizadas
    keyframes: {
      // Fade in desde abajo
      fadeInUp: {
        "0%": {
          opacity: "0",
          transform: "translateY(20px)",
        },
        "100%": {
          opacity: "1",
          transform: "translateY(0)",
        },
      },

      // Fade in desde la derecha
      fadeInRight: {
        "0%": {
          opacity: "0",
          transform: "translateX(20px)",
        },
        "100%": {
          opacity: "1",
          transform: "translateX(0)",
        },
      },

      // Slide in desde la derecha (para toasts)
      slideIn: {
        "0%": {
          opacity: "0",
          transform: "translateX(100%)",
        },
        "100%": {
          opacity: "1",
          transform: "translateX(0)",
        },
      },

      // Slide in desde abajo
      slideUp: {
        "0%": {
          opacity: "0",
          transform: "translateY(100%)",
        },
        "100%": {
          opacity: "1",
          transform: "translateY(0)",
        },
      },

      // Scale in (para modales)
      scaleIn: {
        "0%": {
          opacity: "0",
          transform: "scale(0.95)",
        },
        "100%": {
          opacity: "1",
          transform: "scale(1)",
        },
      },

      // Shimmer (para skeletons)
      shimmer: {
        "0%": {
          backgroundPosition: "-200% 0",
        },
        "100%": {
          backgroundPosition: "200% 0",
        },
      },

      // Bounce suave
      bounceSoft: {
        "0%, 100%": {
          transform: "translateY(0)",
        },
        "50%": {
          transform: "translateY(-5px)",
        },
      },

      // Pulse glow
      pulseGlow: {
        "0%, 100%": {
          boxShadow: "0 0 0 0 rgba(59, 130, 246, 0.4)",
        },
        "50%": {
          boxShadow: "0 0 0 10px rgba(59, 130, 246, 0)",
        },
      },

      // Progress shrink (para toasts)
      shrink: {
        "0%": { width: "100%" },
        "100%": { width: "0%" },
      },

      // Spin con pausa
      spinPause: {
        "0%": { transform: "rotate(0deg)" },
        "50%": { transform: "rotate(180deg)" },
        "100%": { transform: "rotate(360deg)" },
      },

      // Wiggle (para errores)
      wiggle: {
        "0%, 100%": { transform: "translateX(0)" },
        "25%": { transform: "translateX(-4px)" },
        "75%": { transform: "translateX(4px)" },
      },
    },

    // Clases de animación
    animation: {
      fadeInUp: "fadeInUp 0.4s ease-out",
      fadeInRight: "fadeInRight 0.4s ease-out",
      slideIn: "slideIn 0.3s ease-out",
      slideUp: "slideUp 0.3s ease-out",
      scaleIn: "scaleIn 0.2s ease-out",
      shimmer: "shimmer 2s linear infinite",
      bounceSoft: "bounceSoft 2s ease-in-out infinite",
      pulseGlow: "pulseGlow 2s ease-in-out infinite",
      shrink: "shrink linear forwards",
      spinPause: "spinPause 1.5s ease-in-out infinite",
      wiggle: "wiggle 0.3s ease-in-out",
    },

    // Transiciones
    transitionProperty: {
      colors: "background-color, border-color, color, fill, stroke",
      spacing: "margin, padding",
      size: "width, height",
    },

    // Backdrop blur
    backdropBlur: {
      xs: "2px",
    },
  },
};

// Plugins
export const plugins = [];
