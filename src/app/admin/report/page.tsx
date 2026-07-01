"use client";

import { useSession } from "next-auth/react";

export default function ReportPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  const currentUser = session?.user as any;

  if (!currentUser) {
    return null;
  }

  const role = currentUser.role_name?.toLowerCase().trim();

  const isSales =
    role === "sales" ||
    role === "sales staff";

  // ==========================
  // EXECUTIVE DASHBOARD
  // ==========================
  const executiveDashboard =
    "https://datastudio.google.com/embed/reporting/308f9086-b5bc-4312-9689-01f0eff27f60/page/QpoqF";

  // ==========================
  // SALES FILTER PARAM
  // ==========================
  const filterParams = encodeURIComponent(
    JSON.stringify({
      df29: `include0IN${currentUser.user_name}`,
    })
  );

  // ==========================
  // SALES DASHBOARD
  // ==========================
  const salesDashboard =
    `https://datastudio.google.com/embed/reporting/308f9086-b5bc-4312-9689-01f0eff27f60/page/p_p0wrwuso3d?params=${filterParams}`;

  const dashboardUrl = isSales
    ? salesDashboard
    : executiveDashboard;

  console.log("========= REPORT DEBUG =========");
  console.log("Role :", currentUser.role_name);
  console.log("Sales :", currentUser.user_name);
  console.log("Dashboard :", dashboardUrl);
  console.log("===============================");

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
          Logged in as{" "}
          <b>
            {currentUser.user_name} ({currentUser.role_name})
          </b>
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