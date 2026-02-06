import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AuthContext = createContext(null);

const API_URL = (import.meta?.env?.VITE_API_URL ?? "http://localhost:3000")
  .toString()
  .trim()
  .replace(/\/+$/, "");

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // ✅ aqui guardamos o retorno do /me
  const [meData, setMeData] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/me`, {
        method: "GET",
        credentials: "include", // ✅ cookie httpOnly
      });

      if (!res.ok) {
        setIsAuthenticated(false);
        setMeData(null);
        setAuthReady(true);
        return false;
      }

      const json = await res.json().catch(() => null);

      setIsAuthenticated(true);
      setMeData(json);
      setAuthReady(true);
      return true;
    } catch {
      setIsAuthenticated(false);
      setMeData(null);
      setAuthReady(true);
      return false;
    }
  }, []);

  // bootstrap inicial
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // revalidação automática: ao focar a aba + a cada X segundos
  useEffect(() => {
    const onFocus = () => checkAuth();

    const onVisibility = () => {
      if (document.visibilityState === "visible") checkAuth();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const intervalId = window.setInterval(() => {
      checkAuth();
    }, 60_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
  }, [checkAuth]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      authReady,
      meData, // ✅ expose

      // atalhos úteis:
      cliente: meData?.cliente ?? null,
      empresa: meData?.cliente?.empresa ?? null,

      setIsAuthenticated,
      setMeData,
      checkAuth,
    }),
    [isAuthenticated, authReady, meData, checkAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
