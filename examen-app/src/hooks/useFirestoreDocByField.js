import { useState, useEffect, useRef } from "react";
import { db } from "../services/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export function useFirestoreDocByField(
  collectionName,
  field,
  value,
  { enabled = true, ...additionalFilters } = {}
) {
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Usar useRef para evitar recreaciones innecesarias
  const optionsRef = useRef({ field, value, additionalFilters, enabled });

  useEffect(() => {
    optionsRef.current = { field, value, additionalFilters, enabled };
  }, [field, value, additionalFilters, enabled]);

  useEffect(() => {
    if (!enabled || !value) {
      setDocData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Construir la query con filtros adicionales
      let conditions = [
        [field, "==", field === "email" ? value.toLowerCase() : value],
      ];

      // Añadir filtros adicionales si existen
      if (additionalFilters.role) {
        conditions.push(["role", "==", additionalFilters.role]);
      }

      const q = query(
        collection(db, collectionName),
        ...conditions.map(([f, op, v]) => where(f, op, v))
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            setDocData(null);
          } else {
            const doc = snapshot.docs[0];
            setDocData({ id: doc.id, ...doc.data() });
          }
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Error fetching doc:", err);
          setError(err.message);
          setDocData(null);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up query:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [additionalFilters.role, collectionName, enabled, field, value]);

  return { docData, loading, error };
}
