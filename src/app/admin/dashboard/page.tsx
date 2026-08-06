"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface CombinedDashboardData {
  managerView: {
    forecastChart: any[];
    totalTickets: number;
    totalLeads: number;
    leadConversionRate: number;
    buLeadDistribution: any[];
    buProductBranchSummary: { business_unit: string; top_product: string; dominant_branch: string }[];
  };
  salesView: {
    priorityTickets: any[];
    insights: {
      totalAssigned: number;
      totalConverted: number;
      conversionRate: number;
      avgVelocityDays: string;
    };
  };
}

export default function AIDashboardPage() {
  const { data: session } = useSession();
  
  const userRole = session?.user?.role_name?.toLowerCase() ?? "admin";
  const isManagerOrAdmin = userRole.includes("admin") || userRole.includes("manager") || userRole.includes("marcomm");
  const userName = session?.user?.name ?? "User";

  const [dbData, setDbData] = useState<CombinedDashboardData | null>(null);
  const [timeFrame, setTimeFrame] = useState<"monthly" | "yearly">("yearly");
  const [selectedMonth, setSelectedMonth] = useState<string>("7"); // Default Juli
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProcessedData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/analytics/dashboard-data?timeframe=${timeFrame}&month=${selectedMonth}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setDbData(result.data);
        }
      }
    } catch (err) {
      console.error("Gagal sinkronisasi data dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, [timeFrame, selectedMonth]);

  useEffect(() => {
    fetchProcessedData();
  }, [fetchProcessedData]);

  if (isLoading || !dbData) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-sm font-bold animate-pulse text-gray-500">
        Menghubungkan &amp; Memproses Executive Dashboard Analytics...
      </div>
    );
  }

  const businessUnits = [
    { name: "Healthcare & Hygiene", color: "#343694" },
    { name: "Food & Beverages", color: "#81C040" },
    { name: "Agriculture & Animal Nutrition", color: "#F97316" },
    { name: "Industrial Solutions", color: "#EF4444" },
    { name: "Paper Packing & Export", color: "#A855F7" },
    { name: "Personal & Household Care", color: "#06B6D4" }
  ];

  const months = [
    { value: "all", label: "Semua Bulan (Full Year)" },
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli 2026 (Active)" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  return (
    <div className="space-y-6 pb-8" style={{ fontFamily: "Arial, sans-serif" }}>
      
      {/* HEADER BAR CLEAN — TANPA VERBOSE STATUS FILTER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wider text-[#343694]">
            {isManagerOrAdmin ? "EXECUTIVE DASHBOARD" : `MY SALES WORKSPACE — ${userName.toUpperCase()}`}
          </h1>
        </div>

        {/* KONTROL UI SEJAJAR RIGID & SIMETRIS */}
        <div className="flex items-center gap-2.5 shrink-0 self-stretch xl:self-auto justify-end">
          {isManagerOrAdmin && (
            <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-100 p-1 h-10">
              <button
                onClick={() => setTimeFrame("monthly")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer h-full flex items-center whitespace-nowrap ${
                  timeFrame === "monthly" ? "bg-white text-[#343694] shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                📅 Monthly View
              </button>
              <button
                onClick={() => setTimeFrame("yearly")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer h-full flex items-center whitespace-nowrap ${
                  timeFrame === "yearly" ? "bg-white text-[#343694] shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                📈 Yearly &amp; Forecast
              </button>
            </div>
          )}

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-bold border border-gray-300 rounded-lg px-3 h-10 bg-white text-gray-700 focus:outline-none shadow-sm cursor-pointer whitespace-nowrap"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <button
            onClick={fetchProcessedData}
            className="px-4 h-10 bg-[#343694] hover:bg-opacity-90 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ================= 🏢 POV 1: SALES MANAGER & ADMIN VIEW ================= */}
      {isManagerOrAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 1. CHART TREN 6 BU & FORECASTING */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="text-xs font-bold text-[#343694] uppercase tracking-wide">
                1. Business Unit Trends &amp; AI Forecasting Outlook ({timeFrame === "monthly" ? "Monthly Trends by Date" : "Yearly Trends & Predictions"})
              </h3>
            </div>

            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl flex flex-col gap-4">
              {/* LEGEND BU */}
              <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[10px] font-bold text-gray-600 bg-white p-2.5 border border-gray-200 rounded-lg shadow-sm">
                {businessUnits.map((bu, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-3 h-1 inline-block rounded-sm" style={{ backgroundColor: bu.color }}></span> {bu.name}
                  </div>
                ))}
              </div>

              {/* SVG LINE CHART ENGINE */}
              <div className="relative pl-8 pr-4">
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] font-bold text-gray-400">
                  <span>20 Tkt</span>
                  <span>15 Tkt</span>
                  <span>10 Tkt</span>
                  <span>5 Tkt</span>
                  <span>0 Tkt</span>
                </div>

                <svg viewBox="0 0 1000 220" className="w-full h-56 overflow-visible">
                  <line x1="0" y1="20" x2="1000" y2="20" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="65" x2="1000" y2="65" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="110" x2="1000" y2="110" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="155" x2="1000" y2="155" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="200" x2="1000" y2="200" stroke="#9CA3AF" strokeWidth="2" />

                  {businessUnits.map((bu, idx) => {
                    const chartData = dbData.managerView.forecastChart.find(f => f.business_unit === bu.name) || { points: [2, 4, 6, 8, 10] };
                    const pts = chartData.points || [2, 4, 6, 8, 10];
                    
                    if (timeFrame === "monthly") {
                      const xCoords = [50, 350, 650, 950];
                      const yCoords = pts.map((p: number) => Math.max(200 - (p * 9), 20));

                      const pathD = `M ${xCoords[0]} ${yCoords[0]} L ${xCoords[1]} ${yCoords[1]} L ${xCoords[2]} ${yCoords[2]} L ${xCoords[3]} ${yCoords[3]}`;

                      return (
                        <g key={idx}>
                          <path d={pathD} fill="none" stroke={bu.color} strokeWidth="3" />
                          {xCoords.map((x, pIdx) => (
                            <circle key={pIdx} cx={x} cy={yCoords[pIdx]} r="4" fill={bu.color} />
                          ))}
                        </g>
                      );
                    } else {
                      const xCoords = [40, 260, 480, 720, 960];
                      const yCoords = pts.map((p: number) => Math.max(200 - (p * 9), 20));

                      const solidPath = `M ${xCoords[0]} ${yCoords[0]} L ${xCoords[1]} ${yCoords[1]} L ${xCoords[2]} ${yCoords[2]}`;
                      const dashedPath = `M ${xCoords[2]} ${yCoords[2]} L ${xCoords[3]} ${yCoords[3]} L ${xCoords[4]} ${yCoords[4]}`;

                      return (
                        <g key={idx}>
                          <path d={solidPath} fill="none" stroke={bu.color} strokeWidth="3" />
                          <path d={dashedPath} fill="none" stroke={bu.color} strokeWidth="3" strokeDasharray="5,5" />
                          {xCoords.map((x, pIdx) => (
                            <circle key={pIdx} cx={x} cy={yCoords[pIdx]} r="4" fill={bu.color} />
                          ))}
                        </g>
                      );
                    }
                  })}
                </svg>

                <div className="w-full flex justify-between text-[10px] font-bold pt-2 text-gray-500">
                  {timeFrame === "monthly" ? (
                    <>
                      <span>Tanggal 01</span>
                      <span>Tanggal 07</span>
                      <span>Tanggal 14</span>
                      <span>Tanggal 21</span>
                      <span className="text-[#343694]">Tanggal 28 (Akhir Bulan)</span>
                    </>
                  ) : (
                    <>
                      <span>Maret 2026</span>
                      <span>Mei 2026</span>
                      <span className="text-[#343694] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Juli (Aktual)</span>
                      <span className="text-[#81C040]">Agustus (Forecast)</span>
                      <span className="text-[#81C040]">Oktober (Forecast Q3)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. TOTAL LEAD CONVERSION */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center justify-between">
            <div className="w-full">
              <h3 className="text-xs font-bold text-[#343694] uppercase tracking-wide mb-1 text-center">
                2. Total Lead Conversion (converted_to_erp = true)
              </h3>
            </div>

            <div className="w-36 h-36 rounded-full border-[15px] border-emerald-500 relative flex items-center justify-center my-2 shadow-inner bg-transparent">
              <div className="absolute text-center">
                <p className="text-2xl font-bold text-emerald-600">{dbData.managerView.leadConversionRate}%</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Leads</p>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 text-[10px] mt-4 pt-3 border-t border-gray-100 font-medium text-gray-700">
              {dbData.managerView.buLeadDistribution.map((bu, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: businessUnits[idx % businessUnits.length]?.color }}></span>
                  <span>{bu.business_unit}: <strong className="text-gray-900">{bu.share}% Share</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. TABEL TOP DEMANDED PRODUCTS & DOMINANT BRANCH PER BU */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div className="w-full mb-3">
              <h3 className="text-xs font-bold text-[#343694] uppercase tracking-wide mb-1 text-center">
                3. Top Demanded Products &amp; Dominant Branch per Business Unit
              </h3>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse border border-gray-100 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[#343694] text-white font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-2.5 text-center w-8">No</th>
                    <th className="p-2.5">Business Unit</th>
                    <th className="p-2.5">Top Demanded Product (Qty)</th>
                    <th className="p-2.5 text-center w-24">Dominant Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {dbData.managerView.buProductBranchSummary.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/60 font-medium text-gray-700">
                      <td className="p-2.5 text-center font-bold text-gray-500 bg-gray-50/50">{index + 1}</td>
                      <td className="p-2.5 font-bold text-gray-900">{item.business_unit}</td>
                      <td className="p-2.5 font-semibold text-[#343694]">{item.top_product}</td>
                      <td className="p-2.5 text-center">
                        <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200">
                          {item.dominant_branch}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (

        /* POV 2: SALES PERSONAL WORKSPACE */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm flex flex-col justify-between">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">⚡ Sales Velocity (Kecepatan Closing)</p>
              <p className="text-3xl font-bold text-[#343694] mt-2">{dbData.salesView.insights.avgVelocityDays}</p>
              <span className="text-[10px] text-gray-400 mt-2">Rata-rata durasi penyelesaian tiket Anda dari penerimaan hingga closed</span>
            </div>

            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm flex flex-col justify-between">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">🎯 ERP Conversion Rate Personal</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{dbData.salesView.insights.conversionRate}% Success</p>
              <span className="text-[10px] text-emerald-600 font-bold mt-2">
                {dbData.salesView.insights.totalConverted} dari {dbData.salesView.insights.totalAssigned} tiket sukses dikonversi ke ERP
              </span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-xs font-bold text-[#343694] uppercase tracking-wide">
                🔥 Priority Follow-Up Queue (Highest ML Score Table)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse border border-gray-100 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[#343694] text-white font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-2.5 text-center w-10">No</th>
                    <th className="p-2.5">Company Name &amp; Product Inquiry</th>
                    <th className="p-2.5">Business Unit</th>
                    <th className="p-2.5">Branch</th>
                    <th className="p-2.5 text-center w-24">Skor ML</th>
                    <th className="p-2.5 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dbData.salesView.priorityTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-xs text-gray-400">
                        Tidak ada antrean tiket prioritas yang menggantung.
                      </td>
                    </tr>
                  ) : (
                    dbData.salesView.priorityTickets.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/60 font-medium text-gray-700">
                        <td className="p-2.5 text-center font-bold text-gray-500 bg-gray-50/50">{idx + 1}</td>
                        <td className="p-2.5 py-3">
                          <p className="font-bold text-gray-900 text-xs">{item.company}</p>
                          <p className="text-[10px] text-gray-600 font-semibold mt-0.5 whitespace-normal leading-relaxed">
                            <span className="text-gray-400 font-normal">Permintaan: </span>{item.product}
                          </p>
                        </td>
                        <td className="p-2.5 whitespace-normal font-medium text-gray-800">{item.business_unit}</td>
                        <td className="p-2.5">
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200">
                            {item.branch_name}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-bold text-red-600">
                          <span className="bg-red-50 text-red-600 text-[9px] font-bold px-2 py-0.5 rounded border border-red-100">
                            {item.lead_score}% HOT
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <a
                            href={`/admin/tickets/${item.ticket_id}`}
                            className="px-3 py-1.5 bg-[#343694] hover:bg-opacity-90 text-white font-bold text-[10px] rounded shadow-sm transition-all inline-block"
                          >
                            Follow Up ➔
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
