import React, { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../auth/AdminAuthContext";
import "./LoginAdmin.css";

import background from "../../assets/background.png";
import logo from "../../assets/Logo.png";

const API_URL = (import.meta?.env?.VITE_API_URL ?? "http://localhost:3000")
  .toString()
  .trim();

export default function LoginAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { checkAdminAuth } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/admin";

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      if (isLoading) return;

      const em = email.trim();
      if (!em) return setError("Informe seu e-mail.");
      if (!/^\S+@\S+\.\S+$/.test(em)) return setError("E-mail inválido.");
      if (!password) return setError("Informe sua senha.");

      setError("");
      setIsLoading(true);

      try {
        const res = await fetch(`${API_URL}/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: em, password }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Credenciais inválidas.");
        }

        // garante que o cookie foi reconhecido e /admin/me está ok
        await checkAdminAuth();

        navigate(from, { replace: true });
      } catch (err) {
        setError(err?.message || "Não foi possível entrar. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    },
    [API_URL, email, password, isLoading, checkAdminAuth, navigate, from]
  );

  return (
    <main className="cb-page" style={{ backgroundImage: `url(${background})` }}>
      <section className="cb-card" role="dialog" aria-label="Login Admin CompatBio">
        <img className="cb-logo" src={logo} alt="CompatBio" />
        <div className="cb-divider" />

        <h1 className="cb-title">Login Admin</h1>
        <p className="cb-subtitle">Acesso restrito para administradores.</p>

        <form className="cb-form" onSubmit={submit}>
          <div className="cb-field">
            <label className="cb-label" htmlFor="admin-email">E-mail</label>
            <input
              id="admin-email"
              className="cb-input"
              type="email"
              autoComplete="email"
              placeholder="admin@empresa.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="cb-field">
            <label className="cb-label" htmlFor="admin-password">Senha</label>

            <div className="cb-input-wrap">
              <input
                id="admin-password"
                className="cb-input cb-input--password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={isLoading}
              />

              <button
                type="button"
                className="cb-eye-btn"
                onClick={() => setShowPass((v) => !v)}
                disabled={isLoading}
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                title={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>

            {error ? <p className="cb-error">{error}</p> : null}
          </div>

          <button type="submit" className="cb-primary-btn" disabled={isLoading}>
            <span className="cb-primary-text">{isLoading ? "Entrando..." : "Continuar!"}</span>
          </button>
        </form>

        <p className="cb-help">
          Precisa de ajuda? Fale com o{" "}
          <a className="cb-link cb-link-strong" href="#" onClick={(e) => e.preventDefault()}>
            Suporte
          </a>
          .
        </p>
      </section>
    </main>
  );
}
