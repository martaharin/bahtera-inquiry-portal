"use client";

import React, { useEffect, useState, useCallback } from "react";
import { generateReportPdf } from "@/lib/pdf/reportPdf";

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

interface ReportDataResponse {
  marketForecasting: MarketForecastReportItem[];
}

export default function AIReportPage() {
  // Mengambil informasi tanggal saat ini secara dinamis
  const currentDate = new Date();
  const currentMonthNum = currentDate.getMonth() + 1; // 1 - 12

  const [reportData, setReportData] = useState<ReportDataResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthNum.toString());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State untuk menyimpan index Business Unit yang sedang di-Expand Dropdown-nya
  const [expandedBU, setExpandedBU] = useState<Record<number, boolean>>({});

  const toggleExpand = (index: number) => {
    setExpandedBU(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Daftar opsi bulan dinamis untuk filter
  const months = [
    { value: "all", label: "Semua Bulan (Full Year)" },
    ...monthNames.map((name, idx) => {
      const mNum = idx + 1;
      const isActive = mNum === currentMonthNum;
      return {
        value: mNum.toString(),
        label: `${name} ${currentDate.getFullYear()}${isActive ? " (Active)" : ""}`
      };
    })
  ];

  // FETCH DATA AKTUAL POSTGRESQL BERDASARKAN BULAN TERPILIH
  const fetchReportData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/analytics/report-data?month=${selectedMonth}`);
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
  }, [selectedMonth]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Penentuan nama bulan terpilih untuk KOP Print
  const selectedMonthInt = parseInt(selectedMonth, 10);
  const activeMonthLabel = !isNaN(selectedMonthInt) && selectedMonthInt >= 1 && selectedMonthInt <= 12
    ? `${monthNames[selectedMonthInt - 1]} ${currentDate.getFullYear()}`
    : "Full Year 2026";

  // State loading untuk proses Export PDF
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");

  const handleExportPdf = () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      const blob = generateReportPdf(reportData, {
        periodLabel: activeMonthLabel,
        monthNumber: !isNaN(selectedMonthInt) && selectedMonthInt >= 1 && selectedMonthInt <= 12
          ? selectedMonthInt
          : undefined,
        year: currentDate.getFullYear(),
      });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
      setPdfFileName(`Laporan-Market-Intelligence-${activeMonthLabel.replace(/ /g, "-")}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const closePdfPreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white min-h-screen" style={{ fontFamily: "Arial, sans-serif" }}>
      
      {/* HEADER CONTROL BAR DENGAN FILTER BULAN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl print:hidden shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-[#343694] uppercase tracking-wider">
            Market Intelligence &amp; Product Entity Report
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Laporan analitis prediksi pasar &amp; ekstraksi entitas produk NLP terfilter per bulan.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-bold border border-gray-300 rounded-lg px-3 h-9 bg-white text-gray-700 focus:outline-none shadow-sm cursor-pointer whitespace-nowrap"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <button
            onClick={fetchReportData}
            className="px-4 h-9 bg-[#343694] hover:bg-opacity-90 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            🔄 Refresh
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExporting || isLoading || !reportData}
            className="px-4 h-9 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {isExporting ? "⏳ Menyiapkan PDF..." : "📄 Preview PDF"}
          </button>
        </div>
      </div>

      {/* KOP ACCREDITATION PRINT */}
      <div className="hidden print:block border-b-2 border-black pb-4 text-center mb-6">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-[#343694]">PT Bahtera Adi Jaya</h1>
        <p className="text-sm text-gray-600 mt-1 font-semibold">
          Actionable Recommendation Document — Periode Laporan: <span className="text-orange-500">{activeMonthLabel}</span>
        </p>
      </div>

      {isLoading || !reportData ? (
        <div className="py-12 text-center text-sm text-gray-500 font-bold animate-pulse">
          Memuat Data Laporan &amp; Ekstraksi Entitas Produk NLP dari PostgreSQL...
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm print:border-none">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#343694] text-white font-bold border-b border-gray-300 print:bg-gray-100 print:text-black">
                <th className="p-3 border border-gray-200 w-36">Business Unit Category</th>
                <th className="p-3 border border-gray-200 w-48">Extracted Product Focus (NLP NER)</th>
                <th className="p-3 text-center border border-gray-200 w-24">Current Volume</th>
                <th className="p-3 text-center border border-gray-200 w-28">Forecast Volume</th>
                <th className="p-3 text-center border border-gray-200 w-28">ML Trend Status (% Growth)</th>
                <th className="p-3 border border-gray-200">Actionable Product Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {reportData.marketForecasting.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-semibold">
                    Tidak ada data transaksi atau ekstraksi produk untuk periode bulan ini.
                  </td>
                </tr>
              ) : (
                reportData.marketForecasting.map((f, idx) => {
                  const isExpanded = !!expandedBU[idx];
                  const totalProducts = f.productsList.length;
                  const top3Products = f.productsList.slice(0, 3);

                  return (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50/50 page-break-inside-avoid align-top">
                      <td className="p-3 font-bold text-gray-900 border border-gray-200 bg-gray-50/30">{f.unit}</td>
                      
                      {/* KOLOM PRODUK INTERAKTIF DROPDOWN HIDE / SHOW */}
                      <td className="p-3 border border-gray-200 text-[10px] align-top">

                        {/* DUA MODE TAMPILAN: EXPANDED vs COLLAPSED */}
                        {!isExpanded ? (
                          <div>
                            <ul className="space-y-1">
                              {top3Products.map((p, pIdx) => (
                                <li key={pIdx} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                  <span className="truncate max-w-[100px] font-medium text-gray-800">{p.name}</span>
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
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PRATINJAU PDF */}
      {pdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="text-xs font-bold text-gray-700 truncate">
                📄 Pratinjau Dokumen — {pdfFileName}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={pdfUrl}
                  download={pdfFileName}
                  className="px-4 h-8 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  ⬇ Download PDF
                </a>
                <button
                  onClick={closePdfPreview}
                  className="px-3 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  ✕ Tutup
                </button>
              </div>
            </div>
            <iframe src={pdfUrl} title="Pratinjau Laporan PDF" className="w-full flex-1 bg-white" />
          </div>
        </div>
      )}

    </div>
  );
}