"use client";

import { useEffect, useState } from "react";

export default function ReportPage() {
  const [mounted, setMounted] = useState(false);

  const [currentUser, setCurrentUser] = useState({
    role_name: "",
    user_id: "",
    industry: "",
    branch: "",
  });

  useEffect(() => {
    setMounted(true);

    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      const user = JSON.parse(savedUser);

      setCurrentUser({
        role_name: user.role_name || "",
        user_id: user.user_id || "",
        industry: user.industry || "",
        branch: user.branch || "",
      });
    }
  }, []);

  if (!mounted) return null;

  const role = currentUser.role_name.toLowerCase().trim();

  // ==========================
  // ROLE CHECK
  // ==========================
  const isSales =
    role === "sales" ||
    role === "sales staff";

  // ==========================
  // LOOKER DASHBOARD
  // ==========================
  const executiveDashboard =
    "https://datastudio.google.com/embed/reporting/308f9086-b5bc-4312-9689-01f0eff27f60/page/QpoqF";

  const salesDashboard =
    "https://datastudio.google.com/embed/reporting/308f9086-b5bc-4312-9689-01f0eff27f60/page/p_p0wrwuso3d";

  const dashboardUrl = isSales
    ? salesDashboard
    : executiveDashboard;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "20px",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            color: "#1e293b",
          }}
        >
          Dashboard Report
        </h1>

        <p
          style={{
            color: "#64748b",
            marginTop: "8px",
          }}
        >
          Logged in as <b>{currentUser.role_name}</b>
        </p>
      </div>

      <iframe
        src={dashboardUrl}
        width="100%"
        height="900"
        style={{
          border: "none",
          borderRadius: "16px",
          background: "white",
        }}
        allowFullScreen
      />
    </div>
  );
}