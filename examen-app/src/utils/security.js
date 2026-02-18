import Swal from "sweetalert2";

class SecurityManager {
  constructor() {
    // eslint-disable-next-line no-undef
    this.isProduction = process.env.NODE_ENV === "production";
    this.violations = 0;
    this.maxViolations = 5; // Aumentado de 3 a 5
    this.isBlocked = false;
    this.sessionId = this.generateSessionId();
    this.isExamMode = false; // Nueva variable para modo examen

    // Solo activar seguridad básica en producción
    if (this.isProduction) {
      this.initBasicSecurity();
    }
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Seguridad básica (siempre activa en producción)
  initBasicSecurity() {
    this.preventSourceAccess();
    this.disableConsole();
    this.preventTextSelection();
    console.clear();
    console.log("🔒 PI.ICS - Sistema de seguridad activo");
  }

  // Seguridad de examen (solo durante exámenes)
  enableExamMode() {
    if (!this.isProduction) return;

    this.isExamMode = true;
    this.violations = 0; // Resetear violaciones al entrar en modo examen

    // Activar controles estrictos solo para exámenes
    this.preventRightClick();
    this.preventKeyboardShortcuts();
    this.detectDevTools();
    this.monitorVisibility();

    console.warn("🚨 Modo examen activado - Controles de seguridad estrictos");
  }

  // Desactivar modo examen
  disableExamMode() {
    this.isExamMode = false;
    this.violations = 0;

    // Remover event listeners específicos del examen
    this.removeExamListeners();

    console.log("✅ Modo examen desactivado - Navegación libre");
  }

  preventRightClick() {
    if (!this.isExamMode) return;

    this.rightClickHandler = (e) => {
      e.preventDefault();
      this.handleViolation("Clic derecho detectado durante examen");
      return false;
    };

    document.addEventListener("contextmenu", this.rightClickHandler);
  }

  preventKeyboardShortcuts() {
    if (!this.isExamMode) return;

    const blockedKeys = [
      { key: 123 }, // F12
      { key: 67, ctrl: true, shift: true }, // Ctrl+Shift+C
      { key: 73, ctrl: true, shift: true }, // Ctrl+Shift+I
      { key: 74, ctrl: true, shift: true }, // Ctrl+Shift+J
      { key: 85, ctrl: true }, // Ctrl+U
      { key: 116 }, // F5 (solo en examen)
    ];

    this.keydownHandler = (e) => {
      const blocked = blockedKeys.some((combo) => {
        return (
          e.keyCode === combo.key &&
          (!combo.ctrl || e.ctrlKey) &&
          (!combo.shift || e.shiftKey)
        );
      });

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        this.handleViolation(`Tecla bloqueada durante examen: ${e.key}`);
        return false;
      }
    };

    document.addEventListener("keydown", this.keydownHandler);
  }

  detectDevTools() {
    if (!this.isExamMode) return;

    const threshold = 200; // Más tolerante

    this.devToolsInterval = setInterval(() => {
      if (
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
      ) {
        this.handleViolation(
          "Herramientas de desarrollador detectadas en examen"
        );
      }
    }, 2000); // Menos frecuente
  }

  preventTextSelection() {
    // Esta función se aplica siempre en producción pero es menos estricta
    const style = document.createElement("style");
    style.innerHTML = `
      .exam-mode * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      .exam-mode input, .exam-mode textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      /* Prevenir selección solo en producción, pero permitir en inputs */
      body.production-mode input, 
      body.production-mode textarea,
      body.production-mode [contenteditable] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    // Agregar clase a body solo en producción
    if (this.isProduction) {
      document.body.classList.add("production-mode");
    }
  }

  preventSourceAccess() {
    // Detectar view-source
    if (window.location.protocol === "view-source:") {
      this.terminateSession("Intento de ver código fuente");
      return;
    }

    // Prevenir iframe embedding
    if (window !== window.top) {
      this.terminateSession("Intento de cargar en iframe");
      return;
    }
  }

  monitorVisibility() {
    if (!this.isExamMode) return;

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.handleViolation("Cambio de pestaña durante examen");
      }
    };

    this.blurHandler = () => {
      this.showWarning("Mantén el foco en la ventana del examen");
    };

    document.addEventListener("visibilitychange", this.visibilityHandler);
    window.addEventListener("blur", this.blurHandler);
  }

  disableConsole() {
    // Solo en producción y de manera menos agresiva
    if (!this.isProduction) return;

    const methods = ["log", "debug", "info", "warn", "error"];
    const originalMethods = {};

    methods.forEach((method) => {
      if (window.console[method]) {
        originalMethods[method] = window.console[method];
        window.console[method] = () => {}; // Silenciar pero no bloquear completamente
      }
    });

    // Permitir console.error para debugging de producción si es necesario
    window.console.error = originalMethods.error || (() => {});
  }

  handleViolation(type) {
    // Solo contar violaciones en modo examen
    if (!this.isExamMode) {
      console.warn(`⚠️ ${type} (Modo navegación - Sin penalización)`);
      return;
    }

    if (this.isBlocked) return;

    this.violations++;
    console.warn(
      `🚨 Violación ${this.violations}/${this.maxViolations}: ${type}`
    );

    // Solo bloquear si se exceden las violaciones EN MODO EXAMEN
    if (this.violations >= this.maxViolations) {
      this.blockExamAccess(type);
    } else {
      this.showWarning(
        `⚠️ Advertencia ${this.violations}/${this.maxViolations}: ${type}`
      );
    }
  }

  async blockExamAccess(reason = "Violaciones de seguridad durante examen") {
    this.isBlocked = true;

    await Swal.fire({
      icon: "error",
      title: "🚨 EXAMEN BLOQUEADO",
      html: `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 20px;">⛔</div>
          <h3 style="color: #dc3545; margin-bottom: 15px;">Examen Finalizado por Seguridad</h3>
          <p style="margin-bottom: 20px; color: #6c757d;">
            Has excedido el límite de violaciones permitidas durante el examen.
            <br><strong>Razón:</strong> ${reason}
          </p>
          
          <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h4 style="color: #dc3545; margin-bottom: 15px;">📞 Contactar Soporte Técnico</h4>
            <div style="text-align: left;">
              <p style="margin: 5px 0;"><strong>📧 Email:</strong> wlaverde5@gmail.com</p>
              <p style="margin: 5px 0;"><strong>📱 Teléfono:</strong> +57 312 4473537</p>
              <p style="margin: 5px 0;"><strong>🌐 Web:</strong> https://examenes-c84bf.web.app</p>
              <p style="margin: 5px 0;"><strong>🆔 Sesión:</strong> ${this.sessionId.slice(
                -8
              )}</p>
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; color: #856404;">
            <p style="margin: 0;">Serás redirigido a la página principal.</p>
          </div>
        </div>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: true,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#dc3545",
    });

    // Redirigir a página segura pero no terminar sesión completa
    window.location.href = "/student/exams";
  }

  terminateSession(reason = "Violación de seguridad crítica") {
    console.error(`🚨 Sesión terminada: ${reason}`);

    // Redirigir a página de bloqueo temporal
    window.location.replace("/login");
  }

  showWarning(message) {
    // Solo mostrar si está en modo examen
    if (!this.isExamMode) return;

    Swal.fire({
      icon: "warning",
      title: "⚠️ Advertencia de Examen",
      text: message,
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
      background: "#fff3cd",
      color: "#856404",
    });
  }

  removeExamListeners() {
    // Remover todos los event listeners del modo examen
    if (this.rightClickHandler) {
      document.removeEventListener("contextmenu", this.rightClickHandler);
    }
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
    }
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
    if (this.blurHandler) {
      window.removeEventListener("blur", this.blurHandler);
    }
    if (this.devToolsInterval) {
      clearInterval(this.devToolsInterval);
    }
  }

  // Método público para activar/desactivar modo examen
  setExamMode(enabled) {
    if (enabled) {
      this.enableExamMode();
      // Agregar clase CSS para modo examen
      document.body.classList.add("exam-mode");
    } else {
      this.disableExamMode();
      // Remover clase CSS
      document.body.classList.remove("exam-mode");
    }
  }

  // Obtener estadísticas
  getSecurityStats() {
    return {
      violations: this.violations,
      maxViolations: this.maxViolations,
      isBlocked: this.isBlocked,
      isExamMode: this.isExamMode,
      sessionId: this.sessionId,
      isProduction: this.isProduction,
      timestamp: new Date().toISOString(),
    };
  }
}

// Inicializar seguridad automáticamente
const security = new SecurityManager();

// Exportar para uso en componentes
export const enableExamSecurity = () => security.setExamMode(true);
export const disableExamSecurity = () => security.setExamMode(false);
export const getSecurityStats = () => security.getSecurityStats();

// Solo exportar en desarrollo para debugging
// eslint-disable-next-line no-undef
if (process.env.NODE_ENV === "development") {
  window.__security__ = security;
}

export default security;
