import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const VERDE: [number, number, number] = [34, 120, 60];
const VERDE_CLARO: [number, number, number] = [220, 240, 225];
const CINZA: [number, number, number] = [80, 80, 80];

export type ReportColumn = {
  header: string;
  /** Largura em mm; se omitido o autotable calcula. */
  width?: number;
  align?: "left" | "center" | "right";
};

export type ReportTotal = { label: string; value: string };

export type ReportData = {
  titulo: string;
  filtrosAplicados?: string[];
  usuario?: string | null;
  colunas: ReportColumn[];
  linhas: Array<Array<string | number>>;
  totalizadores?: ReportTotal[];
  /** Texto auxiliar no início do documento (descrição/contagens). */
  resumo?: string;
  logoUrl?: string | null;
  appName?: string;
};

async function loadImage(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => {
        const dataUrl = r.result as string;
        const img = new Image();
        img.onload = () => resolve({ dataUrl, w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      };
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatNow() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

function drawHeader(
  doc: jsPDF,
  data: ReportData,
  logo: { dataUrl: string; w: number; h: number } | null,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(...VERDE);
  doc.rect(0, 0, pageW, 4, "F");

  let logoH = 0;
  if (logo) {
    const maxH = 18;
    const ratio = logo.w / logo.h;
    logoH = maxH;
    const logoW = maxH * ratio;
    try {
      doc.addImage(logo.dataUrl, "PNG", margin, 8, logoW, logoH);
    } catch {
      // ignora se imagem inválida
    }
  }

  doc.setTextColor(...VERDE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const headerRightX = pageW - margin;
  doc.text(data.appName || "EngTech SST", headerRightX, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...CINZA);
  doc.text("Saúde e Segurança do Trabalho", headerRightX, 19, { align: "right" });

  const baseY = Math.max(8 + logoH, 22) + 4;
  doc.setDrawColor(...VERDE);
  doc.setLineWidth(0.5);
  doc.line(margin, baseY, pageW - margin, baseY);
  return baseY + 6;
}

function drawFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...VERDE);
  doc.rect(0, pageH - 8, pageW, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const total = doc.getNumberOfPages();
  const current = doc.getCurrentPageInfo().pageNumber;
  doc.text(`EngTech SST  ·  Página ${current} de ${total}`, pageW / 2, pageH - 3, {
    align: "center",
  });
}

export async function gerarRelatorioPDF(data: ReportData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logo = data.logoUrl ? await loadImage(data.logoUrl) : null;

  let y = drawHeader(doc, data, logo);
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Título
  doc.setFillColor(...VERDE_CLARO);
  doc.rect(margin, y, pageW - margin * 2, 8, "F");
  doc.setTextColor(...VERDE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.titulo.toUpperCase(), margin + 3, y + 5.5);
  y += 12;

  // Metadados
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  doc.text(`Emitido em: ${formatNow()}`, margin, y);
  if (data.usuario) {
    doc.text(`Por: ${data.usuario}`, pageW - margin, y, { align: "right" });
  }
  y += 5;

  if (data.filtrosAplicados && data.filtrosAplicados.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Filtros:", margin, y);
    doc.setFont("helvetica", "normal");
    const txt = data.filtrosAplicados.join("  ·  ");
    const lines = doc.splitTextToSize(txt, pageW - margin * 2 - 16) as string[];
    lines.forEach((l, i) => doc.text(l, margin + 16, y + i * 4));
    y += lines.length * 4 + 2;
  }

  if (data.resumo) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(data.resumo, pageW - margin * 2) as string[];
    lines.forEach((l, i) => doc.text(l, margin, y + i * 4));
    y += lines.length * 4 + 2;
  }

  y += 2;

  // Tabela
  const columnStyles: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number }> =
    {};
  data.colunas.forEach((c, i) => {
    columnStyles[i] = {};
    if (c.align) columnStyles[i].halign = c.align;
    if (c.width) columnStyles[i].cellWidth = c.width;
  });

  autoTable(doc, {
    startY: y,
    head: [data.colunas.map((c) => c.header)],
    body: data.linhas.map((row) => row.map((cell) => (cell == null ? "" : String(cell)))),
    theme: "grid",
    headStyles: {
      fillColor: VERDE,
      textColor: 255,
      fontSize: 9,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [40, 40, 40],
      valign: "middle",
    },
    alternateRowStyles: { fillColor: [248, 250, 248] },
    columnStyles,
    margin: { left: margin, right: margin, bottom: 14 },
    showHead: "everyPage",
    didDrawPage: () => {
      // Cabeçalho/rodapé desenhados depois (paginação final)
    },
  });

  // @ts-expect-error lastAutoTable injetado por autoTable
  let cursorY = (doc.lastAutoTable?.finalY ?? y) + 6;

  // Totalizadores
  if (data.totalizadores && data.totalizadores.length > 0) {
    const pageH = doc.internal.pageSize.getHeight();
    if (cursorY > pageH - 30) {
      doc.addPage();
      cursorY = drawHeader(doc, data, logo);
    }
    doc.setFillColor(...VERDE_CLARO);
    doc.rect(margin, cursorY, pageW - margin * 2, 7, "F");
    doc.setTextColor(...VERDE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Totalizadores", margin + 3, cursorY + 5);
    cursorY += 10;
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    data.totalizadores.forEach((t) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${t.label}:`, margin + 3, cursorY);
      doc.setFont("helvetica", "normal");
      doc.text(String(t.value), margin + 60, cursorY);
      cursorY += 5;
    });
  }

  // Cabeçalho em todas as páginas (a partir da 2ª, já que a 1ª já tem)
  // e rodapé em todas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) {
      // o autoTable já reservou a área superior; redesenhamos o header de forma compacta
      const pageWi = doc.internal.pageSize.getWidth();
      doc.setFillColor(...VERDE);
      doc.rect(0, 0, pageWi, 4, "F");
    }
    drawFooter(doc);
  }

  return doc;
}

export function downloadRelatorioPDF(doc: jsPDF, titulo: string) {
  const safe = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const d = new Date();
  const data = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  const filename = `Relatorio_${safe || "EngTech"}_${data}.pdf`;
  try {
    const dataUri = doc.output("datauristring", { filename });
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    doc.save(filename);
  }
}
