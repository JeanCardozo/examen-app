# 📚 **Examen-App**

**Examen-App** es una plataforma avanzada para la gestión de exámenes en línea, diseñada para estudiantes y administradores. Proporciona un entorno seguro, eficiente y personalizable para la creación, administración y evaluación de exámenes.

---

## 🚀 **Características Principales**

### 👩‍🎓 **Para Estudiantes**

- **Panel de Control Personalizado**: Accede a tus exámenes, historial y progreso.
- **Exámenes Adaptativos**: Preguntas ordenadas según tu rendimiento.
- **Soporte para Múltiples Tipos de Preguntas**: Verdadero/Falso, Selección Múltiple, ICFES, entre otros.
- **Historial de Intentos**: Consulta tus resultados y estadísticas.
- **Seguridad Avanzada**: Detección de cambios de pestaña y envío automático al finalizar.

### 👩‍💼 **Para Administradores**

- **Gestión de Usuarios**: Aprobar, bloquear y administrar estudiantes y administradores.
- **Creación de Exámenes**: Diseña exámenes con preguntas personalizadas y asigna materias.
- **Gestión de Preguntas**: Crea y organiza preguntas por grupos y materias.
- **Visualización de Intentos**: Revisa los resultados de los estudiantes en tiempo real.
- **Panel de Control Completo**: Estadísticas y métricas clave para la toma de decisiones.

### 🔒 **Seguridad**

- **Bloqueo de Usuarios**: Controla el acceso de estudiantes.
- **Aprobación de Nuevos Usuarios**: Los estudiantes deben ser aprobados por un administrador antes de acceder.
- **Reglas de Firestore**: Configuración robusta para proteger los datos.

---

## 🛠️ **Tecnologías Utilizadas**

### **Frontend**

- **React**: Framework principal para la interfaz de usuario.
- **React Router**: Navegación entre vistas.
- **Tailwind CSS**: Estilización moderna y responsiva.
- **SweetAlert2**: Alertas y notificaciones interactivas.

### **Backend**

- **Firebase Authentication**: Gestión de usuarios y autenticación segura.
- **Firestore**: Base de datos en tiempo real para almacenar usuarios, exámenes y resultados.
- **Firebase Storage**: Almacenamiento de archivos y recursos.

### **Otros**

- **Lucide Icons**: Iconos modernos y personalizables.
- **Vite**: Herramienta de desarrollo rápida y optimizada.

---

## 📂 **Estructura del Proyecto**

```
src/
├── assets/               # Recursos estáticos (imágenes, íconos, etc.)
├── components/           # Componentes reutilizables (Botones, Navbar, etc.)
├── contexts/             # Contextos de React (AuthContext, etc.)
├── hooks/                # Hooks personalizados
├── pages/                # Vistas principales (Login, Register, Admin, Student)
│   ├── admin/            # Páginas exclusivas para administradores
│   ├── Student/          # Páginas exclusivas para estudiantes
│   │   ├── exams/        # Gestión de exámenes
│   │   ├── history/      # Historial de intentos
│   │   ├── progress/     # Progreso del estudiante
├── services/             # Servicios para interactuar con Firebase
├── utils/                # Utilidades y funciones auxiliares
├── App.jsx               # Componente principal
├── main.jsx              # Punto de entrada de la aplicación
```

---

## ⚙️ **Configuración del Proyecto**

### **Requisitos Previos**

- **Node.js**: Versión 16 o superior.
- **Firebase Project**: Configura un proyecto en Firebase y habilita Authentication, Firestore y Storage.

### **Instalación**

1. Clona este repositorio:
   ```bash
   git clone https://github.com/JeanCardozo/examen-app.git
   cd examen-app
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura Firebase:
   - Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
     ```
     VITE_FIREBASE_API_KEY=TU_API_KEY
     VITE_FIREBASE_AUTH_DOMAIN=TU_AUTH_DOMAIN
     VITE_FIREBASE_PROJECT_ID=TU_PROJECT_ID
     VITE_FIREBASE_STORAGE_BUCKET=TU_STORAGE_BUCKET
     VITE_FIREBASE_MESSAGING_SENDER_ID=TU_MESSAGING_SENDER_ID
     VITE_FIREBASE_APP_ID=TU_APP_ID
     ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

---

## 🧪 **Pruebas**

### **Flujo de Estudiante**

1. Regístrate como estudiante.
2. Intenta iniciar sesión y verifica que se muestre el mensaje de "Pendiente de Aprobación".
3. Una vez aprobado por el administrador, accede al panel de estudiante.

### **Flujo de Administrador**

1. Inicia sesión como administrador.
2. Aprueba o bloquea estudiantes desde el panel de administración.
3. Crea exámenes y asigna preguntas.

---

## 🛡️ **Reglas de Seguridad en Firestore**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isActiveUser() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             !get(/databases/$(database)/documents/users/$(request.auth.uid)).data.blocked &&
             !get(/databases/$(database)/documents/users/$(request.auth.uid)).data.pendingApproval;
    }

    match /users/{userId} {
      allow read: if request.auth.uid == userId || isAdmin();
      allow create: if request.auth != null;
      allow update: if isAdmin();
    }

    match /exams/{examId} {
      allow read: if isActiveUser();
      allow write: if isAdmin();
    }

    match /questions/{questionId} {
      allow read: if isActiveUser();
      allow write: if isAdmin();
    }
  }
}
```

## 📄 **Licencia**

Este proyecto está bajo la licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.

---

## 🌟 **Agradecimientos**

Gracias por usar **Examen-App**. Si tienes alguna pregunta o sugerencia, no dudes en contactarnos. ¡Esperamos que esta plataforma sea de gran utilidad para tu institución educativa!
