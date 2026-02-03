import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";

export default function RequireAdminAuth() {
  const location = useLocation();
  const { isAdminAuthenticated, adminAuthReady } = useAdminAuth();

  if (!adminAuthReady) return null; // ou spinner

  if (!isAdminAuthenticated) {
    return <Navigate to="/loginAdmin" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
