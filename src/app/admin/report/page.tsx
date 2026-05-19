export default function ReportPage() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "20px",
      }}
    >
      <div
        style={{
          marginBottom: "20px",
        }}
      >
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
          Real-time AI generated business insight
        </p>
      </div>

      <iframe
        src="https://datastudio.google.com/embed/reporting/308f9086-b5bc-4312-9689-01f0eff27f60/page/QpoqF"
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