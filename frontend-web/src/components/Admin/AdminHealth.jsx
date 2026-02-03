import React, { useEffect, useState } from "react";

const API_URL = (import.meta?.env?.VITE_API_URL ?? "http://localhost:3000")
  .toString()
  .trim();

export default function AdminHealth() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/admin/api/health-admin`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ ok: false }));
  }, []);

  return (
    <pre style={{ background: "#111", color: "#ddd", padding: 12, borderRadius: 8 }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
