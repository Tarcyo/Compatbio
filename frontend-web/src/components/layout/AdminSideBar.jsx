import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./AdminSidebar.css";

import logo from "../../assets/Logo.png";
import { useAdminAuth } from "../../auth/AdminAuthContext";

const API_URL = (import.meta?.env?.VITE_API_URL ?? "http://localhost:3000")
  .toString()
  .trim();

/* Ícones (simples e fáceis de trocar depois) */
function IconDashboard(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M4 13h8V4H4v9Zm0 7h8v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z" />
    </svg>
  );
}
function IconDoc(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M7 2h7l5 5v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5L14 3.5ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z" />
    </svg>
  );
}
function IconBuilding(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M3 21V3h12v18H3Zm2-2h8V5H5v14Zm12 2V8h4v13h-4Zm2-2h0V10h0v9Z"
      />
    </svg>
  );
}
function IconCard(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm2 3h14V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v2Zm0 3v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6H5Z"
      />
    </svg>
  );
}

/* ✅ ícone de Produtos */
function IconBox(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M21 8.5 12 3 3 8.5V15.5L12 21l9-5.5V8.5ZM12 5.3 18.2 9 12 12.7 5.8 9 12 5.3Zm-7 5.2 6 3.5v5.7l-6-3.7v-5.5Zm14 5.5-6 3.7v-5.7l6-3.5v5.5Z"
      />
    </svg>
  );
}

/* ✅ ícone de Reembolso (refund) */
function IconRefund(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      {/* setas circulares + moeda */}
      <path
        fill="currentColor"
        d="M12 3a9 9 0 0 0-9 9H1l3.2 3.2L7.4 12H5a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 12 3Zm1 5h-2v1.1c-1.2.25-2 1.04-2 2.15 0 1.2.8 1.9 2.3 2.22l.7.15c.9.2 1.1.45 1.1.78 0 .4-.4.75-1.25.75-.95 0-1.45-.35-1.55-.95H8.9c.12 1.15.95 1.9 2.1 2.1V19h2v-1.1c1.35-.25 2.15-1.1 2.15-2.25 0-1.25-.8-1.95-2.4-2.3l-.75-.16c-.8-.18-1-.42-1-.72 0-.35.35-.65 1.05-.65.8 0 1.2.3 1.3.8h1.5c-.13-1-.83-1.7-1.95-1.95V8Z"
      />
    </svg>
  );
}

function IconPower(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M11 2h2v10h-2V2Zm7.07 3.93 1.41 1.41A9 9 0 1 1 4.52 7.34l1.41-1.41A7 7 0 1 0 18.07 5.93Z"
      />
    </svg>
  );
}

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { isAdminAuthenticated, adminAuthReady, checkAdminAuth, logoutAdmin } = useAdminAuth();

  const NAV_ITEMS = useMemo(
    () => [
      { to: "/admin/dashboard", label: "Dashboard", icon: IconDashboard },
      { to: "/admin/solicitacoes", label: "Solicitações", icon: IconDoc },
      { to: "/admin/produtos", label: "Produtos", icon: IconBox },
      { to: "/admin/empresas", label: "Empresas", icon: IconBuilding },
      { to: "/admin/planos", label: "Planos", icon: IconCard },
      { to: "/admin/reembolso", label: "Reembolso", icon: IconRefund }, // ✅ AQUI
    ],
    []
  );

  useEffect(() => {
    if (!adminAuthReady) return;
    if (!isAdminAuthenticated) {
      navigate("/loginAdmin", { replace: true, state: { from: location } });
    }
  }, [adminAuthReady, isAdminAuthenticated, navigate, location]);

  const navRef = useRef(null);
  const [pill, setPill] = useState({ y: 0, h: 54, show: false });

  const updatePill = () => {
    const nav = navRef.current;
    if (!nav) return;

    const active = nav.querySelector(".asb-item.is-active");
    if (!active) {
      setPill((p) => ({ ...p, show: false }));
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const actRect = active.getBoundingClientRect();

    setPill({
      y: actRect.top - navRect.top,
      h: actRect.height,
      show: true,
    });
  };

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(updatePill);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useLayoutEffect(() => {
    const onResize = () => updatePill();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProtectedNav = async (e, to) => {
    e.preventDefault();

    if (!adminAuthReady) return;

    const ok = await checkAdminAuth();
    if (!ok) {
      navigate("/loginAdmin", { replace: true, state: { from: location } });
      return;
    }

    navigate(to);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/admin/logout`, { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      await logoutAdmin();
      navigate("/loginAdmin", { replace: true });
      window.location.reload();
    }
  };

  return (
    <aside className="asb" aria-label="Menu Admin">
      <div className="asb-top">
        <div className="asb-brand" aria-label="CompatBio Admin">
          <img className="asb-logo" src={logo} alt="CompatBio" />
        </div>

        <nav ref={navRef} className="asb-nav" aria-label="Navegação Admin">
          <span
            className={`asb-activePill ${pill.show ? "is-show" : ""}`}
            style={{ transform: `translateY(${pill.y}px)`, height: `${pill.h}px` }}
            aria-hidden="true"
          />

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={(e) => handleProtectedNav(e, item.to)}
                className={({ isActive }) => `asb-item ${isActive ? "is-active" : ""}`}
              >
                <span className="asb-itemIcon" aria-hidden="true">
                  <Icon className="asb-icon" />
                </span>
                <span className="asb-itemLabel">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="asb-bottom">
        <button type="button" className="asb-logout" onClick={handleLogout}>
          <span className="asb-logoutIcon" aria-hidden="true">
            <IconPower className="asb-iconPower" />
          </span>
          <span className="asb-logoutLabel">Sair</span>
        </button>
      </div>
    </aside>
  );
}
