import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../services/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";

export function useFirestoreCollection(
  collectionName,
  { filters = [], sorting = [], limitDocs, enabled = true } = {}
) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Usar useRef para mantener una referencia estable a las opciones
  const optionsRef = useRef({ filters, sorting, limitDocs, enabled });

  // Actualizar la referencia cuando cambian las props
  useEffect(() => {
    optionsRef.current = { filters, sorting, limitDocs, enabled };
  }, [filters, sorting, limitDocs, enabled]);

  // Memoizar la query key para evitar recreaciones innecesarias
  const queryKey = useMemo(() => {
    return JSON.stringify({
      filters: optionsRef.current.filters,
      sorting: optionsRef.current.sorting,
      limitDocs: optionsRef.current.limitDocs,
      enabled: optionsRef.current.enabled,
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let q = collection(db, collectionName);

      // Aplicar filtros
      if (filters?.length) {
        filters.forEach(([field, operator, value]) => {
          q = query(q, where(field, operator, value));
        });
      }

      // Aplicar ordenamiento
      if (sorting?.length) {
        sorting.forEach(([field, direction]) => {
          q = query(q, orderBy(field, direction));
        });
      }

      // Aplicar límite
      if (limitDocs) {
        q = query(q, limit(limitDocs));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setData(docs);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error(`Error en colección ${collectionName}:`, err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error configurando query:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [collectionName, queryKey]); // Solo depende del nombre de colección y queryKey

  return { data, loading, error };
}
