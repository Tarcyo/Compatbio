import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import CompatBioLogin from "./components/Login/CompatBioLogin";
import LoginAdmin from "./components/LoginAdmin/LoginAdmin";

import DashboardLayout from "./components/layout/DashboardLayout";
import ProfilePage from "./components/Painel/ProfilePage";
import RequestAnalysisPage from "./components/RequestAnalisis/RequestAnalyses";
import ResultsPage from "./components/Result/ResultPage";
import PlansCreditsPage from "./components/Planos/PlansPage";
import AnalysisDetailsPage from "./components/AnalysisDetail/AnalysesDetails";
import CheckoutConfirmPage from "./components/Checkout/Checkout";

import RequireAuth from "./auth/RequireAuth";
import RequireAdminAuth from "./auth/RequireAdminAuth";

import AdminDashboardLayout from "./components/layout/AdminDashboardLayout";
import AdminDashboardPage from "./components/AdminPages/AdminDashboardPage";
import AdminSolicitacoesPage from "./components/AdminPages/AdminSolicitacaoPage";
import AdminEmpresasPage from "./components/AdminPages/AdminEmpresaPage";
import AdminPlanosPage from "./components/AdminPages/AdminPlanosPage";
import AdminProdutosPage from "./components/AdminPages/AdminProdutosPage";

import { useAuth } from "./auth/AuthContext";
import { useAdminAuth } from "./auth/AdminAuthContext";

function LoginRoute() {
  const { isAuthenticated, authReady } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  if (!authReady) return null;
  if (isAuthenticated) return <Navigate to={from} replace />;

  return <CompatBioLogin />;
}

function LoginAdminRoute() {
  const { isAdminAuthenticated, adminAuthReady } = useAdminAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin/dashboard";

  if (!adminAuthReady) return null;
  if (isAdminAuthenticated) return <Navigate to={from} replace />;

  return <LoginAdmin />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PÚBLICAS */}
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/loginAdmin" element={<LoginAdminRoute />} />

        {/* ADMIN (PROTEGIDO POR ADMIN AUTH) */}
        <Route element={<RequireAdminAuth />}>
          <Route path="/admin" element={<AdminDashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="solicitacoes" element={<AdminSolicitacoesPage />} />
            <Route path="empresas" element={<AdminEmpresasPage />} />
            <Route path="planos" element={<AdminPlanosPage />} />
            <Route path="produtos" element={<AdminProdutosPage />} />

          </Route>

          {/* qualquer rota errada em /admin cai no dashboard */}
          <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* APP CLIENTE (PROTEGIDO POR CLIENT AUTH) */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Navigate to="/app" replace />} />

          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Navigate to="perfil" replace />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="solicitar-analise" element={<RequestAnalysisPage />} />
            <Route path="resultados" element={<ResultsPage />} />
            <Route path="detalhes-analise" element={<AnalysisDetailsPage />} />
            <Route path="planos" element={<PlansCreditsPage />} />
            <Route path="confirmar-compra" element={<CheckoutConfirmPage />} />
          </Route>
        </Route>

        {/* fallback GLOBAL (fora dos guards) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
