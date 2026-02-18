import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ allowedRoles, children }) {
  const { user, role, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;

  if (!user || !user.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
