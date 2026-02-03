import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AdminAuthContext = createContext(null);

const API_URL = (import.meta?.env?.VITE_API_URL ?? "http://localhost:3000")
  .toString()
  .trim();

export function AdminAuthProvider({ children }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminAuthReady, setAdminAuthReady] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  const checkAdminAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/me`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        setIsAdminAuthenticated(false);
        setAdminUser(null);
        setAdminAuthReady(true);
        return false;
      }

      const data = await res.json().catch(() => ({}));
      setIsAdminAuthenticated(true);
      setAdminUser(data?.admin ?? null);
      setAdminAuthReady(true);
      return true;
    } catch {
      setIsAdminAuthenticated(false);
      setAdminUser(null);
      setAdminAuthReady(true);
      return false;
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    try {
      await fetch(`${API_URL}/admin/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setIsAdminAuthenticated(false);
      setAdminUser(null);
    }
  }, []);

  // bootstrap inicial
  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  // revalidação (igual você faz no cliente)
  useEffect(() => {
    const onFocus = () => checkAdminAuth();

    const onVisibility = () => {
      if (document.visibilityState === "visible") checkAdminAuth();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const intervalId = window.setInterval(() => {
      checkAdminAuth();
    }, 60_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
  }, [checkAdminAuth]);

  const value = useMemo(
    () => ({
      isAdminAuthenticated,
      adminAuthReady,
      adminUser,
      setIsAdminAuthenticated,
      setAdminUser,
      checkAdminAuth,
      logoutAdmin,
    }),
    [isAdminAuthenticated, adminAuthReady, adminUser, checkAdminAuth, logoutAdmin]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth deve ser usado dentro de <AdminAuthProvider>");
  return ctx;
}
