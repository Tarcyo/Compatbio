import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CompatBioLogin.css";

import background from "../../assets/background.png";
import logo from "../../assets/Logo.png";
import googleIcon from "../../assets/google-icon.png";

export default function CompatBioLogin({ onGoogleClick }) {
  const [isLoading, setIsLoading] = useState(false);

  const AUTH_URL = useMemo(() => {
    const fromEnv = (import.meta?.env?.VITE_GOOGLE_AUTH_URL ?? "").toString().trim();
    return fromEnv || "http://localhost:3000/login";
  }, []);

  const startGoogleAuth = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true);

    if (typeof onGoogleClick === "function") onGoogleClick();

    window.location.assign(AUTH_URL);
  }, [AUTH_URL, isLoading, onGoogleClick]);

  return (
    <main
      className="cb-page"
      style={{ backgroundImage: `url(${background})` }}
      aria-label="CompatBio - Login"
    >
      <section className="cb-card" role="dialog" aria-label="Login CompatBio">
        <img className="cb-logo" src={logo} alt="CompatBio" />
        <div className="cb-divider" />

        <button
          type="button"
          className="cb-google-btn"
          onClick={startGoogleAuth}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          <img className="cb-google-icon" src={googleIcon} alt="" />
          <span className="cb-google-text">
            {isLoading ? "Conectando ao Google..." : "Entrar com o Google"}
          </span>
        </button>

        <p className="cb-legal">
          Ao continuar, você concorda com nossos{" "}
          <Link className="cb-link" to="/termos" target="_blank" rel="noopener noreferrer">
            Termos de Serviço
          </Link>{" "}
          e{" "}
          <Link className="cb-link" to="/privacidade" target="_blank" rel="noopener noreferrer">
            Política de Privacidade
          </Link>
          .
        </p>

        <p className="cb-help">
          Precisa de ajuda? Fale com o{" "}
          <Link className="cb-link cb-link-strong" to="/suporte" target="_blank" rel="noopener noreferrer">
            Suporte
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
