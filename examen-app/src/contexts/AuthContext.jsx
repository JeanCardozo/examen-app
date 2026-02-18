import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../services/firebase";
// eslint-disable-next-line no-unused-vars
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { logout } from "../services/authService";

const AuthContext = createContext({
  user: null,
  role: null,
  userData: null,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userDataUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await firebaseUser.reload();
        setUser(firebaseUser);

        try {
          userDataUnsubscribe = onSnapshot(
            doc(db, "users", firebaseUser.uid),
            (doc) => {
              if (doc.exists()) {
                const data = doc.data();
                setUserData(data);
                setRole(data?.role || "student");

                // 🔥 MODIFICACIÓN: No cerrar sesión si es un registro nuevo
                if (data?.blocked === true && !data?.pendingApproval) {
                  logout()
                    .then(() => {
                      console.log(
                        "Usuario bloqueado - sesión cerrada automáticamente"
                      );
                    })
                    .catch(console.error);
                  return;
                }
              } else {
                logout().catch(console.error);
                return;
              }
            },
            (error) => {
              console.error("Error escuchando cambios del usuario:", error);
              setRole("student");
              setUserData(null);
            }
          );
        } catch (error) {
          console.error("Error configurando listener del usuario:", error);
          setRole("student");
          setUserData(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setUserData(null);

        if (userDataUnsubscribe) {
          userDataUnsubscribe();
          userDataUnsubscribe = null;
        }
      }
    });

    return () => {
      unsubscribe();
      if (userDataUnsubscribe) {
        userDataUnsubscribe();
      }
    };
  }, []);

  // loading solo es false cuando user y role están definidos (o ambos null)
  useEffect(() => {
    if ((user && role) || (!user && !role)) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [user, role]);

  const value = React.useMemo(
    () => ({ user, role, userData, loading }),
    [user, role, userData, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
