import React from "react";
import { Outlet, Link } from "react-router-dom";
import { useAdminAuth } from "../../auth/AdminAuthContext";

export default function AdminLayout() {
  const { adminUser, logoutAdmin } = useAdminAuth();

  return (
    <div style={{ minHeight: "100vh", padding: 20 }}>
      <header style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <strong>CompatBio Admin</strong>
        <nav style={{ display: "flex", gap: 12 }}>
          <Link to="/admin">Início</Link>
          <Link to="/admin/health">Health</Link>
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>{adminUser?.email || adminUser?.EMAIL}</span>
          <button onClick={logoutAdmin}>Sair</button>
        </div>
      </header>

      <main style={{ marginTop: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}
