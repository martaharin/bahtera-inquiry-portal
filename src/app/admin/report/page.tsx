"use client";

import React, { useEffect, useState, useCallback } from "react";

interface ProductItem {
  name: string;
  count: number;
}

interface MarketForecastReportItem {
  unit: string;
  productsList: ProductItem[];
  currentVolume: string;
  forecastedVolume: string;
  trendStatus: string;
  recommendation: string;
}

interface SalesRoutingReportItem {
  name: string;
  branch: string;
  conversion: string;
  urgent: string;
}

interface ReportDataResponse {
  marketForecasting: MarketForecastReportItem[];
  salesRouting: SalesRoutingReportItem[];
}

type TabType = "MARKET FORECASTING" | "SALES ROUTING";

export default function AIReportPage() {
  const [activeTab, setActiveTab] = useState<TabType>("MARKET FORECASTING");
  const [reportData, setReportData] = useState<ReportDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State untuk menyimpan index Business Unit yang sedang di-Expand Dropdown-nya
  const [expandedBU, setExpandedBU] = useState<Record<number, boolean>>({});

  const toggleExpand = (index: number) => {
    setExpandedBU(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // FETCH DATA AKTUAL POSTGRESQL
  const fetchReportData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/analytics/report-data");
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setReportData(result.data);
        }
      }
    } catch (error) {
      console.error("Gagal sinkronisasi data laporan dari backend:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white min-h-screen" style={{ fontFamily: "Arial, sans-serif" }}>
      
      {/* HEADER CONTROL */}
      <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl print:hidden shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-gray-700">AI Intelligence Executive Report Center (100% PostgreSQL Connected)</h2>
          <p className="text-xs text-gray-500">Laporan analitis prediksi pasar &amp; ekstraksi entitas produk NLP. Siap diexport ke PDF A4.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-[#343694] text-white hover:bg-opacity-95 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
        >
          🖨️ GENERATE AI REPORT (PDF)
        </button>
      </div>

      {/* TABS CONTROLS */}
      <div className="flex border-b border-gray-200 mb-6 print:hidden">
        {(["MARKET FORECASTING", "SALES ROUTING"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 font-bold text-xs uppercase tracking-wider rounded-t-xl transition-all cursor-pointer ${
              activeTab === tab ? "bg-orange-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-600 bg-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* KOP ACCREDITATION PRINT */}
      <div className="hidden print:block border-b-2 border-black pb-4 text-center mb-6">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-[#343694]">PT Bahtera Adi Jaya</h1>
        <p className="text-sm text-gray-600 mt-1 font-semibold">
          AI Actionable Recommendation Document — Sub Modul: <span className="text-orange-500">{activeTab}</span>
        </p>
      </div>

      {isLoading || !reportData ? (
        <div className="py-12 text-center text-sm text-gray-500 font-bold animate-pulse">
          Memuat Data Laporan &amp; Ekstraksi Entitas Produk NLP dari PostgreSQL...
        </div>
      ) : (
        <>
          {/* TAB 1 TABLE: MARKET FORECASTING DENGAN INTERACTIVE DROPDOWN PRODUK */}
          {activeTab === "MARKET FORECASTING" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm print:border-none">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#343694] text-white font-bold border-b border-gray-300 print:bg-gray-100 print:text-black">
                    <th className="p-3 border border-gray-200 w-40">Business Unit Category</th>
                    <th className="p-3 border border-gray-200 w-64">Extracted Product Focus (NLP NER)</th>
                    <th className="p-3 text-center border border-gray-200 w-24">Current Volume</th>
                    <th className="p-3 text-center border border-gray-200 w-28">Forecast Volume</th>
                    <th className="p-3 text-center border border-gray-200 w-32">ML Trend Status (% Growth)</th>
                    <th className="p-3 border border-gray-200">AI Actionable Product Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.marketForecasting.map((f, idx) => {
                    const isExpanded = !!expandedBU[idx];
                    const totalProducts = f.productsList.length;
                    const top3Products = f.productsList.slice(0, 3);

                    return (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50/50 page-break-inside-avoid align-top">
                        <td className="p-3 font-bold text-gray-900 border border-gray-200 bg-gray-50/30">{f.unit}</td>
                        
                        {/* KOLOM PRODUK INTERAKTIF DROPDOWN HIDE / SHOW */}
                        <td className="p-3 border border-gray-200 text-[10px]">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[#343694] font-bold">📦 Entitas Produk ({totalProducts}):</span>
                          </div>

                          {/* DUA MODE TAMPILAN: EXPANDED vs COLLAPSED */}
                          {!isExpanded ? (
                            <div>
                              <ul className="space-y-1">
                                {top3Products.map((p, pIdx) => (
                                  <li key={pIdx} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                    <span className="truncate max-w-[150px] font-medium text-gray-800">{p.name}</span>
                                    <span className="bg-[#343694] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                                      {p.count}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              {totalProducts > 3 && (
                                <button
                                  onClick={() => toggleExpand(idx)}
                                  className="mt-2 text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 print:hidden cursor-pointer"
                                >
                                  <span>🔍 Lihat Semua ({totalProducts} Produk)</span>
                                  <span>▾</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="max-h-48 overflow-y-auto pr-1 space-y-1 border-t pt-1 border-gray-200">
                                {f.productsList.map((p, pIdx) => (
                                  <div key={pIdx} className="flex justify-between items-center bg-blue-50/50 px-2 py-1 rounded border border-blue-100">
                                    <span className="font-medium text-gray-800">{p.name}</span>
                                    <span className="bg-[#343694] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-2">
                                      {p.count}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => toggleExpand(idx)}
                                className="mt-2 text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-1 print:hidden cursor-pointer"
                              >
                                <span>▲ Sembunyikan Detail</span>
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-center text-gray-700 font-bold border border-gray-200">{f.currentVolume}</td>
                        <td className="p-3 text-center font-bold text-gray-900 border border-gray-200">{f.forecastedVolume}</td>
                        <td className="p-3 text-center border border-gray-200 font-bold text-orange-600">{f.trendStatus}</td>
                        <td className="p-3 text-gray-800 border border-gray-200 font-medium leading-relaxed bg-gray-50/30 text-[11px]">
                          {f.recommendation}
                          <span className="block text-[9px] text-gray-400 mt-1 italic">Extracted Live via Python NLP NER Pipeline</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2 TABLE: SALES ROUTING CLEAN */}
          {activeTab === "SALES ROUTING" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm print:border-none">
              <table className="w-full text-left text-[12px] border-collapse">
                <thead>
                  <tr className="bg-[#343694] text-white font-bold border-b border-gray-300 print:bg-gray-100 print:text-black">
                    <th className="p-3 border border-gray-200">Sales Person Name (Branch)</th>
                    <th className="p-3 text-center border border-gray-200">ERP Conversion Rate</th>
                    <th className="p-3 text-center border border-gray-200">Total Urgent Leads Pipeline</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.salesRouting.map((s, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50/50 page-break-inside-avoid">
                      <td className="p-3 font-bold text-gray-900 border border-gray-200">{s.name} ({s.branch})</td>
                      <td className="p-3 text-center font-bold text-gray-900 border border-gray-200">{s.conversion}</td>
                      <td className="p-3 text-center border border-gray-200 font-semibold text-red-600">{s.urgent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </div>
  );
}