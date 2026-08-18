import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

interface ReportData {
  marketForecasting: MarketForecastReportItem[];
}

export interface ReportPdfOptions {
  periodLabel: string;
  monthNumber?: number;
  year: number;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const CONTENT_WIDTH = 210 - MARGIN_LEFT - MARGIN_RIGHT;

const sanitize = (text: string): string =>
  text
    .replace(/&amp;/g, "&")
    .replace(/[^\x20-\xFF]/g, "")
    .trim();

const formatDate = (date: Date): string =>
  `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

export function generateReportPdf(data: ReportData, options: ReportPdfOptions): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageHeight = doc.internal.pageSize.getHeight();

  const dateText = formatDate(new Date());

  let y = 20;

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text("PT BAHTERA ADI JAYA", 105, y, { align: "center" });

  y += 6;
  doc.setDrawColor(0);
  doc.setFillColor(0, 0, 0);
  doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 0.8, "F");
  doc.rect(MARGIN_LEFT, y + 2.2, CONTENT_WIDTH, 0.35, "F");

  y += 10;

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(dateText, 190, y, { align: "right" });

  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    tableWidth: CONTENT_WIDTH,
    styles: {
      font: "times",
      fontSize: 8,
      textColor: [0, 0, 0],
      lineColor: [60, 60, 60],
      lineWidth: 0.2,
      cellPadding: 1.8,
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 36 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 26, halign: "center" },
      5: { cellWidth: 40 },
    },
    head: [["Business Unit Category", "Extracted Product Focus (NLP NER)", "Current Volume", "Forecast Volume", "ML Trend Status", "Actionable Recommendation"]],
    body: data.marketForecasting.map((f) => [
      f.unit,
      f.productsList.map((p) => `${sanitize(p.name)} (${p.count})`).join("\n") || "-",
      sanitize(f.currentVolume),
      sanitize(f.forecastedVolume),
      sanitize(f.trendStatus),
      sanitize(f.recommendation),
    ]),
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.text(`Halaman ${i} dari ${pageCount}`, 105, pageHeight - 8, { align: "center" });
  }

  return doc.output("blob");
}