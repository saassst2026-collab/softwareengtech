import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { parseLocalDate } from "./dateUtils";
import {
  ordenarServicos,
  PROFISSIONAL_FIXO,
  TEXTOS_FIXOS,
  type ServicoItem,
} from "./propostaServicos";

export type PropostaPdfData = {
  numero?: number | null;
  cliente_nome: string;
  cliente_responsavel?: string | null;
  cliente_cidade?: string | null;
  cliente_uf?: string | null;
  data_proposta: string; // YYYY-MM-DD
  servicos: ServicoItem[];
  total_texto?: string | null;
  logo_url?: string | null;
  assinatura_url?: string | null;
  assinatura_largura_mm?: number | null;
  assinatura_altura_max_mm?: number | null;
  assinatura_offset_y_mm?: number | null;
  empresa_header?: {
    nome: string;
    subtitulo: string;
    whatsapp?: string | null;
    emails?: string | null;
  };
};

export type ServicoCompleto = {
  nome: string;
  descricao_curta?: string | null;
  objetivo?: string | null;
  quantidade: number;
  valor_unitario: number;
  /** Se preenchido, sobrescreve quantidade x valor_unitario no total da linha. */
  valor_total_manual?: number | null;
};

export type PropostaCompletaPdfData = Omit<PropostaPdfData, "servicos" | "total_texto"> & {
  servicos: ServicoCompleto[];
  desconto?: number;
  /** Se preenchido, sobrescreve o total geral calculado. */
  total_manual?: number | null;
  forma_pagamento?: string | null;
  validade_dias?: number | null;
  informacoes_complementares?: string | null;
  cliente_cnpj?: string | null;
  cliente_razao_social?: string | null;
  cliente_nome_fantasia?: string | null;
  cliente_contato?: string | null;
};

const VERDE: [number, number, number] = [34, 120, 60];
const VERDE_CLARO: [number, number, number] = [220, 240, 225];
const CINZA: [number, number, number] = [80, 80, 80];

async function loadImage(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => resolve({ dataUrl, w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  const d = parseLocalDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("pt-BR");
}

function drawHeader(
  doc: jsPDF,
  data: { empresa_header?: PropostaPdfData["empresa_header"] },
  logo: { dataUrl: string; w: number; h: number } | null,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  doc.setFillColor(...VERDE);
  doc.rect(0, 0, pageW, 4, "F");

  let logoH = 0;
  if (logo) {
    const maxH = 22;
    const ratio = logo.w / logo.h;
    logoH = maxH;
    const logoW = maxH * ratio;
    doc.addImage(logo.dataUrl, "PNG", margin, 10, logoW, logoH);
  }

  const header = data.empresa_header;
  const rightX = pageW - margin;
  let y = 12;
  doc.setTextColor(...VERDE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(header?.nome ?? "EngTech Serviços e Consultorias", rightX, y, { align: "right" });
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  doc.setFont("helvetica", "normal");
  doc.text(header?.subtitulo ?? "Saúde e Segurança do Trabalho", rightX, y, { align: "right" });
  y += 5;
  if (header?.whatsapp) {
    doc.text(`WhatsApp: ${header.whatsapp}`, rightX, y, { align: "right" });
    y += 4;
  }
  if (header?.emails) {
    doc.text(header.emails, rightX, y, { align: "right" });
    y += 4;
  }

  const baseY = Math.max(10 + logoH, y) + 4;
  doc.setDrawColor(...VERDE);
  doc.setLineWidth(0.6);
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
  doc.text(
    `EngTech Serviços e Consultorias  ·  Página ${current} de ${total}`,
    pageW / 2,
    pageH - 3,
    { align: "center" },
  );
}

function sectionTitle(doc: jsPDF, text: string, y: number) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...VERDE_CLARO);
  doc.rect(15, y, pageW - 30, 7, "F");
  doc.setTextColor(...VERDE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(text, 18, y + 5);
  return y + 11;
}

function paragraph(doc: jsPDF, text: string, y: number, redraw?: () => number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const lines: string[] = doc.splitTextToSize(text, pageW - 30);
  const lineH = 4.5;
  for (const line of lines) {
    if (redraw && y + lineH > pageH - 18) {
      doc.addPage();
      y = redraw();
    }
    doc.text(line, 15, y);
    y += lineH;
  }
  return y + 2;
}

function bulletList(doc: jsPDF, text: string, y: number, redraw?: () => number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const items = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lineH = 4.5;
  for (const item of items) {
    const lines: string[] = doc.splitTextToSize(item, pageW - 35);
    const blockH = lines.length * lineH + 1;
    if (redraw && y + blockH > pageH - 18) {
      doc.addPage();
      y = redraw();
    }
    doc.text("•", 17, y);
    doc.text(lines, 22, y);
    y += blockH;
  }
  return y + 2;
}

export async function gerarPropostaPdf(data: PropostaPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = data.logo_url ? await loadImage(data.logo_url) : null;
  const assinatura = data.assinatura_url ? await loadImage(data.assinatura_url) : null;

  let y = drawHeader(doc, data, logo);

  // Identificação
  y = sectionTitle(doc, "PROPOSTA COMERCIAL", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const ident: string[] = [];
  ident.push(`Data: ${formatDate(data.data_proposta)}`);
  doc.text(ident.join("    ·    "), 15, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.cliente_nome || "—", 32, y);
  y += 5;
  if (data.cliente_responsavel) {
    doc.setFont("helvetica", "bold");
    doc.text("Responsável:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.cliente_responsavel, 42, y);
    y += 5;
  }
  const local = [data.cliente_cidade, data.cliente_uf].filter(Boolean).join(" / ");
  if (local) {
    doc.setFont("helvetica", "bold");
    doc.text("Local:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(local, 28, y);
    y += 5;
  }
  y += 2;

  // Profissional responsável (FIXO)
  y = sectionTitle(doc, "PROFISSIONAL RESPONSÁVEL", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(PROFISSIONAL_FIXO.nome, 15, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const titulos = doc.splitTextToSize(
    PROFISSIONAL_FIXO.titulos,
    doc.internal.pageSize.getWidth() - 30,
  );
  doc.text(titulos, 15, y);
  y += titulos.length * 4 + 1;
  doc.text(PROFISSIONAL_FIXO.crea, 15, y);
  y += 8;

  // Texto introdutório (FIXO)
  y = paragraph(doc, TEXTOS_FIXOS.intro, y);
  y += 2;

  // Apresentação (FIXA)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VERDE);
  doc.text("APRESENTAÇÃO / VALORES", 15, y);
  y += 5;
  doc.setTextColor(40, 40, 40);
  y = paragraph(doc, TEXTOS_FIXOS.apresentacao, y);
  y += 1;

  // Tabela de serviços — sempre na ordem canônica
  const servicosOrdenados = ordenarServicos(data.servicos);
  if (servicosOrdenados.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Serviços", "Qtd.", "Valor"]],
      body: servicosOrdenados.map((s, i) => [
        String(i + 1),
        s.nome,
        s.quantidade || "1",
        s.valor || "----",
      ]),
      foot: data.total_texto
        ? [
            [
              {
                content: "Total geral",
                colSpan: 3,
                styles: { halign: "right", fontStyle: "bold" },
              },
              {
                content: data.total_texto,
                styles: { fontStyle: "bold", halign: "center" },
              },
            ],
          ]
        : undefined,
      theme: "grid",
      headStyles: {
        fillColor: VERDE,
        textColor: 255,
        fontSize: 9,
        halign: "center",
        valign: "middle",
      },
      footStyles: { fillColor: VERDE_CLARO, textColor: VERDE, fontSize: 10 },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40], valign: "middle" },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { halign: "left" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 35, halign: "center" },
      },
      margin: { left: 15, right: 15 },
    });
    // @ts-expect-error lastAutoTable é injetado por autoTable
    y = (doc.lastAutoTable?.finalY ?? y) + 6;
  }

  // Página 2: condições primeiro, depois responsabilidades
  doc.addPage();
  y = drawHeader(doc, data, logo);

  y = sectionTitle(doc, "CONDIÇÕES", y);
  y = bulletList(doc, TEXTOS_FIXOS.condicoes, y);
  y += 2;

  y = sectionTitle(doc, "RESPONSABILIDADES DA CONTRATANTE", y);
  y = bulletList(doc, TEXTOS_FIXOS.responsabilidadesContratante, y);
  y += 2;

  y = sectionTitle(doc, "RESPONSABILIDADES DA CONTRATADA", y);
  y = bulletList(doc, TEXTOS_FIXOS.responsabilidadesContratada, y);
  y += 4;

  // Bloco de assinaturas — duas colunas, conteúdo CENTRALIZADO abaixo da linha
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 80) {
    doc.addPage();
    y = drawHeader(doc, data, logo);
  }
  y = Math.max(y + 10, pageH - 80);

  const colW = 80;
  const leftCenter = 15 + colW / 2;
  const rightCenter = pageW - 15 - colW / 2;

  if (assinatura) {
    // Object-fit: contain dentro de uma área máxima (largura x altura), mantendo proporção
    const maxW = Math.max(10, Math.min(120, Number(data.assinatura_largura_mm) || 72));
    const maxH = Math.max(6, Math.min(60, Number(data.assinatura_altura_max_mm) || 26));
    const offsetY = Number(data.assinatura_offset_y_mm) || 0;
    const ratio = assinatura.w / assinatura.h;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    // Repousa sobre a linha (~55% acima / 45% abaixo) + deslocamento vertical configurável
    const x = leftCenter - w / 2;
    const yImg = y - h * 0.45 + offsetY;
    doc.addImage(assinatura.dataUrl, "PNG", x, yImg, w, h, undefined, "FAST");
  }

  doc.setDrawColor(...CINZA);
  doc.line(15, y, 15 + colW, y);
  doc.line(pageW - 15 - colW, y, pageW - 15, y);

  // Profissional (esquerda) — três linhas centralizadas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(PROFISSIONAL_FIXO.nome, leftCenter, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(PROFISSIONAL_FIXO.tituloAssinatura, leftCenter, y + 10, { align: "center" });
  doc.text(PROFISSIONAL_FIXO.crea, leftCenter, y + 14, { align: "center" });

  // Cliente (direita) — nome centralizado abaixo da linha
  const nomeCliente = data.cliente_responsavel?.trim() || data.cliente_nome;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(nomeCliente, rightCenter, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Assinatura do Cliente", rightCenter, y + 10, { align: "center" });

  // Footer em todas as páginas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    drawFooter(doc);
  }

  return doc;
}

export function downloadPropostaPdf(doc: jsPDF, clienteNome: string) {
  const filename = buildPropostaFilename(clienteNome);

  // Capacitor / APK (WebView Android/iOS) — salvar via Filesystem e compartilhar
  const cap = (
    window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    }
  ).Capacitor;
  const isNative = !!cap?.isNativePlatform?.();

  if (isNative) {
    void saveAndShareNative(doc, filename);
    return;
  }

  try {
    // Usa data URI base64 — sem blob: URLs e sem URL.createObjectURL.
    // Funciona em desktop, Android e iOS (Safari respeita download em <a> com data:).
    const dataUri = doc.output("datauristring", { filename });
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // Último recurso
    doc.save(filename);
  }
}

/** Compartilha o PDF (no APK abre o share sheet nativo; no navegador usa Web Share API
 *  com o arquivo, ou cai para download). */
export async function compartilharPropostaPdf(doc: jsPDF, clienteNome: string) {
  const filename = buildPropostaFilename(clienteNome);

  const cap = (
    window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  if (cap?.isNativePlatform?.()) {
    await saveAndShareNative(doc, filename);
    return;
  }

  try {
    const blob = doc.output("blob");
    const file = new File([blob], filename, { type: "application/pdf" });
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: filename, text: "Proposta EngTech" });
      return;
    }
  } catch {
    // ignora e cai para download
  }
  downloadPropostaPdf(doc, clienteNome);
}

export function buildPropostaFilename(clienteNome: string): string {
  const safe = (clienteNome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const d = new Date();
  const data = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  return `Proposta_${safe || "Cliente"}_${data}.pdf`;
}

async function saveAndShareNative(doc: jsPDF, filename: string) {
  // Importação dinâmica para não quebrar o build web
  const [{ Filesystem, Directory }, { Share }, { toast }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
    import("sonner"),
  ]);

  try {
    // jsPDF retorna data URI tipo "data:application/pdf;filename=...;base64,XXXX"
    const dataUri = doc.output("datauristring", { filename });
    const base64 = dataUri.substring(dataUri.indexOf("base64,") + "base64,".length);

    // Tenta Documents primeiro (visível ao usuário); se falhar, cai para Cache
    let savedUri: string | null = null;
    let directoryUsed: typeof Directory.Documents | typeof Directory.Cache = Directory.Documents;
    try {
      const res = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      savedUri = res.uri;
    } catch {
      const res = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });
      savedUri = res.uri;
      directoryUsed = Directory.Cache;
    }

    toast.success("PDF salvo no dispositivo", {
      description:
        directoryUsed === Directory.Documents
          ? "Arquivo salvo em Documentos."
          : "Arquivo salvo no cache do app.",
    });

    // Abre o seletor de compartilhamento (WhatsApp, e-mail, etc.)
    try {
      await Share.share({
        title: filename,
        text: "Proposta EngTech",
        url: savedUri ?? undefined,
        dialogTitle: "Compartilhar proposta",
      });
    } catch {
      // Usuário cancelou — sem erro
    }
  } catch (err) {
    console.error("[propostaPdf] Falha ao salvar no dispositivo", err);
    try {
      const dataUri = doc.output("datauristring", { filename });
      const base64 = dataUri.substring(dataUri.indexOf("base64,") + "base64,".length);
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: filename,
        text: "Proposta EngTech",
        files: [`data:application/pdf;base64,${base64}`],
        dialogTitle: "Compartilhar proposta",
      });
    } catch {
      const { toast } = await import("sonner");
      toast.error("Não foi possível salvar o PDF. Tente compartilhar o arquivo.");
    }
  }
}

// ===== Proposta Completa =====

function brl(v: number): string {
  if (!isFinite(v) || v === 0) return "---";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ensureSpace(doc: jsPDF, y: number, needed: number, redraw: () => number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 18) {
    doc.addPage();
    return redraw();
  }
  return y;
}

/** Abre uma seção garantindo que o título + um mínimo de conteúdo
 *  caibam na mesma página. Evita títulos órfãos no fim da página. */
function openSection(
  doc: jsPDF,
  title: string,
  y: number,
  minContent: number,
  redraw: () => number,
): number {
  const pageH = doc.internal.pageSize.getHeight();
  // 11mm é a altura do bloco do title + spacing
  const needed = 11 + minContent;
  if (y + needed > pageH - 18) {
    doc.addPage();
    y = redraw();
  }
  return sectionTitle(doc, title, y);
}

export async function gerarPropostaPdfCompleta(data: PropostaCompletaPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = data.logo_url ? await loadImage(data.logo_url) : null;
  const assinatura = data.assinatura_url ? await loadImage(data.assinatura_url) : null;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const redrawHeader = () => drawHeader(doc, data, logo);

  let y = redrawHeader();

  // Identificação da proposta
  y = sectionTitle(doc, "PROPOSTA COMERCIAL", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const ident: string[] = [];
  if (data.numero != null) ident.push(`Nº ${String(data.numero).padStart(4, "0")}`);
  ident.push(`Data: ${formatDate(data.data_proposta)}`);
  if (data.validade_dias) ident.push(`Validade: ${data.validade_dias} dias`);
  doc.text(ident.join("    ·    "), 15, y);
  y += 7;

  // Cliente
  y = openSection(doc, "DADOS DO CLIENTE", y, 30, redrawHeader);
  const linhasCliente: Array<[string, string]> = [];
  linhasCliente.push(["Razão Social:", data.cliente_razao_social || data.cliente_nome || "—"]);
  if (data.cliente_nome_fantasia)
    linhasCliente.push(["Nome Fantasia:", data.cliente_nome_fantasia]);
  if (data.cliente_cnpj) linhasCliente.push(["CNPJ:", data.cliente_cnpj]);
  if (data.cliente_responsavel) linhasCliente.push(["Responsável:", data.cliente_responsavel]);
  const local = [data.cliente_cidade, data.cliente_uf].filter(Boolean).join(" / ");
  if (local) linhasCliente.push(["Local:", local]);
  if (data.cliente_contato) linhasCliente.push(["Contato:", data.cliente_contato]);
  doc.setFontSize(10);
  for (const [label, val] of linhasCliente) {
    y = ensureSpace(doc, y, 6, redrawHeader);
    doc.setFont("helvetica", "bold");
    doc.text(label, 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(val, 15 + doc.getTextWidth(label) + 3, y);
    y += 5;
  }
  y += 3;

  // Apresentação
  y = openSection(doc, "APRESENTAÇÃO", y, 30, redrawHeader);
  y = paragraph(
    doc,
    "Apresentamos a seguir nossa proposta comercial para os serviços de Saúde e Segurança do Trabalho relacionados abaixo. Os serviços serão prestados conforme as normas regulamentadoras vigentes e as melhores práticas técnicas.",
    y,
    redrawHeader,
  );
  const apres = data.servicos.map((s) => s.descricao_curta?.trim() || s.nome).join("\n");
  if (apres) {
    y = bulletList(doc, apres, y, redrawHeader);
  }
  y += 2;

  // Tabela de valores — força tabela + bloco de totais a caberem JUNTOS na mesma página
  const lineTotal = (s: ServicoCompleto) =>
    s.valor_total_manual != null ? s.valor_total_manual : s.quantidade * s.valor_unitario;
  const subtotal = data.servicos.reduce((acc, s) => acc + lineTotal(s), 0);
  const desconto = data.desconto ?? 0;
  const totalCalc = Math.max(subtotal - desconto, 0);
  const total =
    data.total_manual != null && isFinite(Number(data.total_manual))
      ? Number(data.total_manual)
      : totalCalc;
  const rowH = 7;
  const headerH = 8;
  const estTabelaH = headerH + Math.max(1, data.servicos.length) * rowH;
  const estTotaisH = 22; // subtotal + desconto + barra TOTAL GERAL
  const estPagamentoH = data.forma_pagamento ? 14 : 0;
  const sectionH = 11; // título da seção
  const blocoCompleto = sectionH + estTabelaH + 6 + estTotaisH + estPagamentoH;
  if (y + blocoCompleto > pageH - 18) {
    doc.addPage();
    y = redrawHeader();
  }
  y = sectionTitle(doc, "TABELA DE VALORES", y);
  autoTable(doc, {
    startY: y,
    head: [["#", "Serviço", "Qtd.", "Valor unit.", "Total"]],
    body: data.servicos.map((s, i) => [
      String(i + 1),
      s.nome,
      s.valor_total_manual != null ? "—" : String(s.quantidade),
      s.valor_total_manual != null ? "—" : brl(s.valor_unitario),
      brl(lineTotal(s)),
    ]),
    theme: "grid",
    headStyles: { fillColor: VERDE, textColor: 255, fontSize: 9, halign: "center" },
    footStyles: { fillColor: VERDE_CLARO, textColor: VERDE, fontSize: 10 },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 40], valign: "middle" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { halign: "left" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 15, right: 15 },
    rowPageBreak: "avoid",
    pageBreak: "avoid",
  });
  // @ts-expect-error lastAutoTable é injetado por autoTable
  y = (doc.lastAutoTable?.finalY ?? y) + 6;

  // Totais — sempre logo abaixo da tabela, na MESMA página (já garantido acima)
  const tableRight = pageW - 15;
  const labelX = tableRight - 65;
  const valueX = tableRight - 2;
  doc.setDrawColor(...VERDE);
  doc.setLineWidth(0.3);
  doc.line(labelX - 2, y, tableRight, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("Subtotal:", labelX, y);
  doc.setFont("helvetica", "normal");
  doc.text(brl(subtotal), valueX, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Desconto:", labelX, y);
  doc.setFont("helvetica", "normal");
  doc.text(brl(desconto), valueX, y, { align: "right" });
  y += 5;
  doc.setFillColor(...VERDE);
  doc.rect(labelX - 2, y - 4, tableRight - labelX + 2, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL GERAL:", labelX, y + 1);
  doc.text(brl(total), valueX, y + 1, { align: "right" });
  doc.setTextColor(40, 40, 40);
  y += 9;

  if (data.forma_pagamento) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Forma de pagamento:", 15, y);
    doc.setFont("helvetica", "normal");
    const pagText = doc.splitTextToSize(data.forma_pagamento, pageW - 60);
    doc.text(pagText, 15 + 42, y);
    y += pagText.length * 5 + 2;
  }

  // Objetivos dos serviços — quebra de página inteligente, fluindo por
  // várias páginas se necessário, mantendo título + primeiras linhas juntos.
  const comObjetivo = data.servicos.filter((s) => (s.objetivo ?? "").trim());
  if (comObjetivo.length > 0) {
    doc.setFontSize(10);
    const bottom = pageH - 18;
    const lineH = 4.5;
    const blocos = comObjetivo.map((s) => {
      const tit = doc.splitTextToSize(s.nome, pageW - 30) as string[];
      const obj = doc.splitTextToSize(s.objetivo!.trim(), pageW - 30) as string[];
      return { tit, obj };
    });
    // Mantém o título da seção junto com o primeiro bloco (título + 2 linhas).
    const firstMin =
      sectionH + blocos[0].tit.length * lineH + 1 + Math.min(blocos[0].obj.length, 2) * lineH;
    if (y + firstMin > bottom) {
      doc.addPage();
      y = redrawHeader();
    }
    y = sectionTitle(doc, "OBJETIVOS DOS SERVIÇOS", y);

    for (const b of blocos) {
      // Mantém título do serviço junto com pelo menos 2 linhas do objetivo.
      const headMin = b.tit.length * lineH + 1 + Math.min(b.obj.length, 2) * lineH;
      if (y + headMin > bottom) {
        doc.addPage();
        y = redrawHeader();
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...VERDE);
      doc.text(b.tit, 15, y);
      y += b.tit.length * lineH + 1;

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");
      for (const ln of b.obj) {
        if (y + lineH > bottom) {
          doc.addPage();
          y = redrawHeader();
        }
        doc.text(ln, 15, y);
        y += lineH;
      }
      y += 3;
    }
  }

  // Informações complementares
  if (data.informacoes_complementares?.trim()) {
    y = openSection(doc, "INFORMAÇÕES COMPLEMENTARES", y, 20, redrawHeader);
    y = paragraph(doc, data.informacoes_complementares.trim(), y, redrawHeader);
  }

  // Responsabilidades
  y = openSection(doc, "RESPONSABILIDADES DA CONTRATADA", y, 25, redrawHeader);
  y = bulletList(doc, TEXTOS_FIXOS.responsabilidadesContratada, y, redrawHeader);
  y += 2;
  y = openSection(doc, "RESPONSABILIDADES DA CONTRATANTE", y, 25, redrawHeader);
  y = bulletList(doc, TEXTOS_FIXOS.responsabilidadesContratante, y, redrawHeader);

  // Assinaturas
  y = Math.max(y + 14, pageH - 70);
  if (y > pageH - 50) {
    doc.addPage();
    y = redrawHeader();
    y = pageH - 70;
  }
  const colW = 80;
  const leftCenter = 15 + colW / 2;
  const rightCenter = pageW - 15 - colW / 2;
  if (assinatura) {
    const maxW = Math.max(10, Math.min(120, Number(data.assinatura_largura_mm) || 72));
    const maxH = Math.max(6, Math.min(60, Number(data.assinatura_altura_max_mm) || 26));
    const offsetY = Number(data.assinatura_offset_y_mm) || 0;
    const ratio = assinatura.w / assinatura.h;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    const x = leftCenter - w / 2;
    const yImg = y - h * 0.45 + offsetY;
    doc.addImage(assinatura.dataUrl, "PNG", x, yImg, w, h, undefined, "FAST");
  }
  doc.setDrawColor(...CINZA);
  doc.line(15, y, 15 + colW, y);
  doc.line(pageW - 15 - colW, y, pageW - 15, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(PROFISSIONAL_FIXO.nome, leftCenter, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(PROFISSIONAL_FIXO.tituloAssinatura, leftCenter, y + 10, { align: "center" });
  doc.text(PROFISSIONAL_FIXO.crea, leftCenter, y + 14, { align: "center" });
  const nomeCli = data.cliente_responsavel?.trim() || data.cliente_nome;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(nomeCli, rightCenter, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Representante legal — Contratante", rightCenter, y + 10, { align: "center" });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    drawFooter(doc);
  }
  return doc;
}
