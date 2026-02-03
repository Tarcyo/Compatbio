import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import "./AdminLayoutDashboard.css";

import background from "../../assets/background.png";

export default function AdminDashboardLayout() {
  const location = useLocation();

  return (
    <div className="ad-page" style={{ backgroundImage: `url(${background})` }}>
      <div className="ad-overlay" aria-hidden="true" />

      <div className="ad-shell">
        <AdminSidebar />

        <main className="ad-main">
          <div key={location.pathname} className="ad-routeAnim">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
