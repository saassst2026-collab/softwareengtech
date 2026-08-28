import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getEngTechLogoDataUrl, getCoverIllustrationFallbackDataUrl } from "@/lib/pgrLogo";
import {
  TEXTO_OBJETIVO,
  TEXTO_CAMPO_APLICACAO,
  REFERENCIAS_LISTA,
  ABREVIATURAS_PARTE_1,
  ABREVIATURAS_PARTE_2,
  ABREVIATURAS_PARTE_3,
  RESPONSABILIDADES_ITENS,
  CAMPOS_DETALHAMENTO_7_2,
} from "@/lib/pgrPdfTextos";
import {
  TABELA_SEVERIDADE,
  TABELA_PROBABILIDADE,
  MATRIZ_6X4_ROWS,
  getPontosProbabilidade,
  getPontosSeveridade,
  getCorTipoRisco,
  getCorClassificacaoRisco,
} from "@/lib/pgrPdfMatriz";
import pgrCoverImg from "@/assets/images/pgr_cover_illustration_1787875571632.jpg";

export type PgrDocumentData = {
  empresa: {
    id: string;
    nome: string;
    razao_social: string | null;
    cnpj: string | null;
    inscricao_estadual?: string | null;
    endereco: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
    cnae: string | null;
    grau_risco?: string | number | null;
    email: string | null;
    contato: string | null;
  };
  vigencia: {
    inicio: string; // DD/MM/YYYY
    fim: string; // DD/MM/YYYY
    revisao: string; // "00"
    localEmissao: string; // "Cidade - UF"
    dataEmissao: string; // DD/MM/YYYY
  };
  responsavel: {
    id: string;
    nome: string;
    cargo: string | null;
    registro: string | null;
    tipo_registro: string | null;
    cpf: string | null;
    email?: string | null;
  };
  gesList: Array<{
    id: string;
    cargo: string;
    setor: string | null;
    unidade: string | null;
    codigo_ges: string | null;
    atividade: string | null;
    descricao_atividade: string | null;
    qtd_colaboradores: number;
    jornada?: string | null;
    turno?: string | null;
    ambiente_trabalho?: string | null;
    observacoes?: string | null;
    funcoes: Array<{
      id: string;
      nome: string;
      descricao_atividades?: string | null;
    }>;
    riscos: Array<{
      id: string;
      nome_risco: string;
      tipo_risco: string;
      codigo_esocial?: string | null;
      fontes_geradoras?: string | null;
      trajetoria?: string | null;
      freq_exposicao?: string | null;
      metodologia?: string | null;
      severidade?: string | null;
      probabilidade?: string | null;
      classificacao?: string | null;
      tipo_avaliacao?: string | null;
      avaliacao?: string | null;
      data_avaliacao?: string | null;
      intensidade?: string | null;
      equipamento?: string | null;
      recomendacao_medidas?: string | null;
      utiliza_epc?: string | null;
      epc_eficaz?: string | null;
      utiliza_epi?: string | null;
      gerar_pgr_pcmso?: string | null;
      obs_pgr?: string | null;
      insalubre?: string | null;
      anexo_nr15?: string | null;
      periculoso?: string | null;
      anexo_nr16?: string | null;
      aposentadoria_especial?: string | null;
      codigo_gfip?: string | null;
    }>;
    medidas: Array<{
      id: string;
      nome_medida: string;
      tipo: string;
      ca?: string | null;
      fabricante?: string | null;
      observacao?: string | null;
    }>;
  }>;
  totalTrabalhadores: number;
  logoUrl?: string | null;
  appName?: string;
};

const MARGIN = 14;
const PAGE_W_PORTRAIT = 210;
const PAGE_H_PORTRAIT = 297;
const CONTENT_W_PORTRAIT = PAGE_W_PORTRAIT - MARGIN * 2; // 182mm

const PAGE_W_LANDSCAPE = 297;
const PAGE_H_LANDSCAPE = 210;
const CONTENT_W_LANDSCAPE = PAGE_W_LANDSCAPE - MARGIN * 2; // 269mm

const VERDE_ENGTECH: [number, number, number] = [30, 126, 52]; // #1e7e34

function safeText(v: unknown, fallback = "—"): string {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s === "" ? fallback : s;
}

function getMesAno(dataStr?: string): string {
  const meses = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ];
  if (dataStr) {
    const parts = dataStr.split("/");
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10) - 1;
      const y = parts[2];
      if (m >= 0 && m < 12) {
        return `${meses[m]} ${y}`;
      }
    }
  }
  const d = new Date();
  return `${meses[d.getMonth()]} ${d.getFullYear()}`;
}

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** CABEÇALHO PADRÃO ENGTECH (Tabela de 3 colunas idêntica ao modelo) */
function drawModelHeader(
  doc: jsPDF,
  data: PgrDocumentData,
  logoUrl: string,
  isLandscape: boolean,
): number {
  const pageW = isLandscape ? PAGE_W_LANDSCAPE : PAGE_W_PORTRAIT;
  const contentW = isLandscape ? CONTENT_W_LANDSCAPE : CONTENT_W_PORTRAIT;
  const headerH = 20;
  const headerY = 9;

  // Dimensões das 3 colunas
  const col1W = isLandscape ? 52 : 44;
  const col3W = isLandscape ? 58 : 42;
  const col2W = contentW - col1W - col3W;

  const col1X = MARGIN;
  const col2X = col1X + col1W;
  const col3X = col2X + col2W;

  // Borda externa e linhas divisórias pretas sólidas
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(col1X, headerY, contentW, headerH);
  doc.line(col2X, headerY, col2X, headerY + headerH);
  doc.line(col3X, headerY, col3X, headerY + headerH);

  // Coluna 1: Logo EngTech
  try {
    doc.addImage(logoUrl, "PNG", col1X + 2, headerY + 2, col1W - 4, headerH - 4);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 126, 52);
    doc.text("EngTech", col1X + col1W / 2, headerY + 11, { align: "center" });
  }

  // Coluna 2: Título do Documento e Razão Social
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("INVENTÁRIO DE RISCOS OCUPACIONAIS E PLANO DE AÇÃO", col2X + col2W / 2, headerY + 7.5, {
    align: "center",
  });

  const empNome = (data.empresa.razao_social || data.empresa.nome || "EMPRESA").toUpperCase();
  const maxChars = isLandscape ? 55 : 34;
  const truncatedEmp = empNome.length > maxChars ? empNome.slice(0, maxChars) + "..." : empNome;
  doc.setFontSize(8.5);
  doc.text(truncatedEmp, col2X + col2W / 2, headerY + 14.5, { align: "center" });

  // Coluna 3: Metadados (Revisão, Código, Data, Vigência)
  const vigenciaAno = data.vigencia.fim ? data.vigencia.fim.split("/").pop() || "2028" : "2028";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(0, 0, 0);

  const textX = col3X + 3;
  doc.text(`Revisão: ${data.vigencia.revisao || "00"}`, textX, headerY + 5);
  doc.text("Código: PGR-01", textX, headerY + 9.5);
  doc.text(`Data: ${data.vigencia.dataEmissao}`, textX, headerY + 14);
  doc.text(`Vigência: ${vigenciaAno}`, textX, headerY + 18.5);

  return headerY + headerH + 6; // Próximo Y disponível (aprox 35mm)
}

/** RODAPÉ PADRÃO ENGTECH (Linha verde, dados da consultoria e número de página no badge) */
function drawModelFooter(doc: jsPDF, pageNum: number, isLandscape: boolean) {
  const pageW = isLandscape ? PAGE_W_LANDSCAPE : PAGE_W_PORTRAIT;
  const pageH = isLandscape ? PAGE_H_LANDSCAPE : PAGE_H_PORTRAIT;
  const footerY = pageH - 12;

  // Linha verde separadora
  doc.setDrawColor(...VERDE_ENGTECH);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, footerY, pageW - MARGIN, footerY);

  // Endereço e contato EngTech centralizado
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...VERDE_ENGTECH);
  const infoText =
    "EngTech Rua Exuperio Pereira s/n Barra da Estiva, Ba – Cep:46650-000 Whatsapp (77)98119 0869";
  doc.text(infoText, pageW / 2, footerY + 5, { align: "center" });

  // Badge verde com número da página no canto direito
  const badgeW = 9;
  const badgeH = 5.5;
  const badgeX = pageW - MARGIN - badgeW;
  const badgeY = footerY + 1.5;

  doc.setFillColor(...VERDE_ENGTECH);
  doc.rect(badgeX, badgeY, badgeW, badgeH, "F");

  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(String(pageNum), badgeX + badgeW / 2, badgeY + 4, { align: "center" });
}

/** 1. CAPA (PÁGINA 1) */
function drawPageCapa(
  doc: jsPDF,
  data: PgrDocumentData,
  logoGrandeUrl: string,
  coverIllustrationUrl: string,
) {
  // Logo EngTech no topo
  try {
    doc.addImage(logoGrandeUrl, "PNG", PAGE_W_PORTRAIT / 2 - 40, 20, 80, 26);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...VERDE_ENGTECH);
    doc.text("EngTech", PAGE_W_PORTRAIT / 2, 35, { align: "center" });
  }

  // Título: PGR
  doc.setFont("helvetica", "bold");
  doc.setFontSize(48);
  doc.setTextColor(...VERDE_ENGTECH);
  doc.text("PGR", PAGE_W_PORTRAIT / 2, 72, { align: "center" });

  // Subtítulo: Programa de Gerenciamento de Risco
  doc.setFontSize(18);
  doc.text("Programa de Gerenciamento de Risco", PAGE_W_PORTRAIT / 2, 85, { align: "center" });

  // Razão Social da Empresa
  const empNome = (data.empresa.razao_social || data.empresa.nome || "EMPRESA").toUpperCase();
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59); // Slate escuro
  const empLines = doc.splitTextToSize(empNome, CONTENT_W_PORTRAIT - 20);
  doc.text(empLines, PAGE_W_PORTRAIT / 2, 100, { align: "center" });

  // Ilustração central
  try {
    doc.addImage(
      coverIllustrationUrl,
      "JPEG",
      PAGE_W_PORTRAIT / 2 - 65,
      120,
      130,
      98,
    );
  } catch {
    // Fallback gracioso caso falhe
  }

  // Mês e Ano no rodapé da capa
  const mesAno = getMesAno(data.vigencia.dataEmissao);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...VERDE_ENGTECH);
  doc.text(mesAno, PAGE_W_PORTRAIT / 2, 265, { align: "center" });
}

/** 2. FOLHA DE ROSTO / INVENTÁRIO DE RISCOS (PÁGINA 2 - FOOTER 1) */
function drawPageFolhaRosto(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  drawModelHeader(doc, data, logoCompactUrl, false);

  // Caixa verde centralizada com borda grossa verde
  const boxW = 150;
  const boxH = 65;
  const boxX = (PAGE_W_PORTRAIT - boxW) / 2;
  const boxY = 110;

  doc.setDrawColor(...VERDE_ENGTECH);
  doc.setLineWidth(1.2);
  doc.rect(boxX, boxY, boxW, boxH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text("INVENTÁRIO", PAGE_W_PORTRAIT / 2, boxY + 22, { align: "center" });

  doc.setFontSize(14);
  doc.text("DE RISCOS OCUPACIONAIS E", PAGE_W_PORTRAIT / 2, boxY + 36, { align: "center" });

  doc.setFontSize(20);
  doc.text("PLANO DE AÇÃO", PAGE_W_PORTRAIT / 2, boxY + 52, { align: "center" });

  drawModelFooter(doc, 1, false);
}

/** 3. CONTROLE DE REVISÕES E APROVAÇÃO (PÁGINA 3 - FOOTER 2) */
function drawPageRevisoes(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  // Tabela 1: Elaboração e Aprovação
  const respTxt = `Nome: ${safeText(data.responsavel.nome)}${
    data.responsavel.cargo ? ` (${data.responsavel.cargo})` : ""
  }`;
  const empTxt = `Nome: ${safeText(data.empresa.razao_social || data.empresa.nome)}`;

  autoTable(doc, {
    startY: y,
    head: [["ELABORAÇÃO", "APROVAÇÃO"]],
    body: [
      [respTxt, empTxt],
      ["Ass.:", "Ass.:"],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 8,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: CONTENT_W_PORTRAIT / 2 },
      1: { cellWidth: CONTENT_W_PORTRAIT / 2 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // @ts-expect-error lastAutoTable
  y = doc.lastAutoTable.finalY + 12;

  // Título: Lista de Revisões Efetuadas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Lista de Revisões Efetuadas", PAGE_W_PORTRAIT / 2, y, { align: "center" });
  y += 4;

  // Tabela 2: Tabela de Revisões (Redação Inicial + linhas vazias)
  const revisoesBody = [
    ["00", "Redação Inicial", data.vigencia.dataEmissao],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];

  autoTable(doc, {
    startY: y,
    head: [["NÚMERO DA REVISÃO", "DESCRIÇÃO", "DATA"]],
    body: revisoesBody,
    theme: "grid",
    headStyles: {
      fillColor: VERDE_ENGTECH,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      fontSize: 8,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 8,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      minCellHeight: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 38, halign: "center" },
      1: { cellWidth: 104 },
      2: { cellWidth: 40, halign: "center" },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  drawModelFooter(doc, 2, false);
}

/** 4. SUMÁRIO (PÁGINA 4 - FOOTER 3) */
function drawPageSumario(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("SUMÁRIO", PAGE_W_PORTRAIT / 2, y, { align: "center" });
  y += 10;

  const sumarioItens = [
    { titulo: "1. IDENTIFICAÇÃO DA EMPRESA", pag: "4", nivel: 1 },
    { titulo: "2. OBJETIVO", pag: "5", nivel: 1 },
    { titulo: "3. CAMPO DE APLICAÇÃO", pag: "5", nivel: 1 },
    { titulo: "4. REFERÊNCIAS", pag: "5", nivel: 1 },
    { titulo: "5. ABREVIATURAS, TERMOS E DEFINIÇÕES", pag: "5", nivel: 1 },
    { titulo: "6. RESPONSABILIDADES E AUTORIDADES", pag: "7", nivel: 1 },
    { titulo: "7 ESTRUTURA GERAL/ METODOLOGIA", pag: "8", nivel: 1 },
    { titulo: "7.1 PLANEJAMENTO", pag: "8", nivel: 2 },
    { titulo: "7.1.1. CARACTERIZAR E MAPEAR OS PROCESSOS E O AMBIENTE DE TRABALHO", pag: "8", nivel: 3 },
    { titulo: "7.1.2. ANTECIPAR, RECONHECER, AVALIAR E CONTROLAR OS RISCOS OCUPACIONAIS", pag: "9", nivel: 3 },
    { titulo: "7.1.3. LISTAGEM DOS GRUPOS SIMILARES DE EXPOSIÇÃO - GSE", pag: "9", nivel: 3 },
    { titulo: "7.1.4. RECURSOS", pag: "9", nivel: 3 },
    { titulo: "7.1.5. ESTABELECIMENTO DE METAS E OBJETIVOS", pag: "9", nivel: 3 },
    { titulo: "7.1.6. REGISTROS", pag: "9", nivel: 3 },
    { titulo: "7.1.7. INDICADORES DE SEGURANÇA", pag: "9", nivel: 3 },
    { titulo: "7.2. ANTECIPAÇÃO, IDENTIFICAÇÃO, AVALIAÇÃO E CONTROLE DOS RISCOS OCUPACIONAIS", pag: "9", nivel: 2 },
    { titulo: "7.2.1. AVALIAÇÃO DE RISCO", pag: "11", nivel: 3 },
    { titulo: "7.2.2. CONTROLE", pag: "11", nivel: 3 },
    { titulo: "8. IDENTIFICAÇÃO, AVALIAÇÃO E CONTROLE DOS RISCOS OCUPACIONAIS", pag: "12", nivel: 1 },
    { titulo: "SETORES: OPERACIONAL", pag: "12", nivel: 2 },
    { titulo: "9. MATRIZ DE EPI POR FUNÇÃO", pag: "14", nivel: 1 },
    { titulo: "10. PLANO DE AÇÃO", pag: "15", nivel: 1 },
    { titulo: "8. REGISTRO", pag: "16", nivel: 1 },
    { titulo: "9. ANEXO", pag: "16", nivel: 1 },
    { titulo: "10. ASSINATURAS", pag: "16", nivel: 1 },
  ];

  doc.setFontSize(8);
  const dotsMaxX = PAGE_W_PORTRAIT - MARGIN - 12;

  sumarioItens.forEach((item) => {
    const indent = item.nivel === 1 ? 0 : item.nivel === 2 ? 4 : 8;
    const itemX = MARGIN + indent;

    doc.setFont("helvetica", item.nivel === 1 ? "bold" : "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(item.titulo, itemX, y);

    const tituloWidth = doc.getTextWidth(item.titulo);
    const startDots = itemX + tituloWidth + 2;

    // Linha pontilhada
    if (startDots < dotsMaxX) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const dotCount = Math.floor((dotsMaxX - startDots) / 1.8);
      const dotsStr = ".".repeat(Math.max(dotCount, 2));
      doc.text(dotsStr, startDots, y);
    }

    // Número da página
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(item.pag, PAGE_W_PORTRAIT - MARGIN, y, { align: "right" });

    y += 6.5;
  });

  drawModelFooter(doc, 3, false);
}

/** 5. IDENTIFICAÇÃO DA EMPRESA (PÁGINA 5 - FOOTER 4) */
function drawPageIdentificacaoEmpresa(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("1. IDENTIFICAÇÃO DA EMPRESA", MARGIN, y);
  y += 5;

  const emp = data.empresa;
  const resp = data.responsavel;

  // Tabela Dados da Empresa
  const empresaRows: Array<[string, string]> = [
    ["Razão Social:", safeText(emp.razao_social || emp.nome)],
    ["Nome Fantasia:", safeText(emp.nome)],
    ["CNPJ:", safeText(emp.cnpj)],
    ["Endereço:", safeText(emp.endereco)],
    ["Bairro:", safeText(emp.bairro)],
    ["Cidade:", safeText(emp.cidade)],
    ["UF:", safeText(emp.uf)],
    ["CEP:", safeText(emp.cep)],
    ["Telefone:", safeText(emp.contato)],
    ["e-mail:", safeText(emp.email)],
  ];

  const respRows: Array<[string, string]> = [
    ["Nome Completo:", safeText(resp.nome)],
    ["CPF:", safeText(resp.cpf)],
  ];

  const ativRows: Array<[string, string]> = [
    ["CNAE Principal:", safeText(emp.cnae)],
    ["Atividade:", safeText(emp.cnae ? `Atividade sob o CNAE ${emp.cnae}` : "—")],
    ["Grau de Risco:", safeText(emp.grau_risco, "Conforme NR-04")],
  ];

  const tabelaEmpresaBody = [
    [{ content: "DADOS DA EMPRESA", colSpan: 2, styles: { fillColor: VERDE_ENGTECH, textColor: 255, fontStyle: "bold", halign: "center" as const } }],
    ...empresaRows.map(([lbl, val]) => [{ content: lbl, styles: { fontStyle: "bold" as const, fillColor: [240, 248, 240] as [number, number, number] } }, val]),
    [{ content: "DADOS DO RESPONSÁVEL", colSpan: 2, styles: { fillColor: VERDE_ENGTECH, textColor: 255, fontStyle: "bold", halign: "center" as const } }],
    ...respRows.map(([lbl, val]) => [{ content: lbl, styles: { fontStyle: "bold" as const, fillColor: [240, 248, 240] as [number, number, number] } }, val]),
    [{ content: "ATIVIDADE ECONÔMICA PRINCIPAL", colSpan: 2, styles: { fillColor: VERDE_ENGTECH, textColor: 255, fontStyle: "bold", halign: "center" as const } }],
    ...ativRows.map(([lbl, val]) => [{ content: lbl, styles: { fontStyle: "bold" as const, fillColor: [240, 248, 240] as [number, number, number] } }, val]),
  ];

  autoTable(doc, {
    startY: y,
    body: tabelaEmpresaBody,
    theme: "grid",
    styles: { fontSize: 7.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: CONTENT_W_PORTRAIT - 42 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // @ts-expect-error lastAutoTable
  y = doc.lastAutoTable.finalY + 6;

  // Quadro de Funcionários da Empresa
  const funcoesUnicas: Array<{ id: number; setor: string; funcao: string; qtd: number }> = [];
  let contador = 1;

  data.gesList.forEach((g) => {
    const qtdPorFuncao =
      g.funcoes && g.funcoes.length > 0
        ? Math.max(1, Math.round(g.qtd_colaboradores / g.funcoes.length))
        : g.qtd_colaboradores;

    if (g.funcoes && g.funcoes.length > 0) {
      g.funcoes.forEach((f) => {
        funcoesUnicas.push({
          id: contador++,
          setor: safeText(g.setor, "Geral"),
          funcao: f.nome,
          qtd: qtdPorFuncao,
        });
      });
    } else {
      funcoesUnicas.push({
        id: contador++,
        setor: safeText(g.setor, "Geral"),
        funcao: g.cargo,
        qtd: g.qtd_colaboradores,
      });
    }
  });

  const quadroBody = funcoesUnicas.map((item) => [
    String(item.id).padStart(2, "0"),
    item.setor,
    item.funcao,
    String(item.qtd),
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [{ content: "QUADRO DE FUNCIONÁRIOS DA EMPRESA", colSpan: 4, styles: { fillColor: VERDE_ENGTECH, textColor: 255, fontStyle: "bold", halign: "center" as const } }],
      ["ID", "Setor", "Função", "Nº Funcionários"],
    ],
    body: quadroBody,
    theme: "grid",
    headStyles: {
      fillColor: VERDE_ENGTECH,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      fontSize: 7.5,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 7.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: 54 },
      2: { cellWidth: 78 },
      3: { cellWidth: 34, halign: "center" },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  drawModelFooter(doc, 4, false);
}

/** 6. OBJETIVO, CAMPO DE APLICAÇÃO, REFERÊNCIAS E ABREVIATURAS 1 (PÁGINA 6 - FOOTER 5) */
function drawPageObjetivoAbreviaturas1(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  // 2. OBJETIVO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("2. OBJETIVO", MARGIN, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const objLines = doc.splitTextToSize(TEXTO_OBJETIVO, CONTENT_W_PORTRAIT);
  doc.text(objLines, MARGIN, y);
  y += objLines.length * 4.2 + 5;

  // 3. CAMPO DE APLICAÇÃO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("3. CAMPO DE APLICAÇÃO", MARGIN, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const campoLines = doc.splitTextToSize(TEXTO_CAMPO_APLICACAO, CONTENT_W_PORTRAIT);
  doc.text(campoLines, MARGIN, y);
  y += campoLines.length * 4.2 + 5;

  // 4. REFERÊNCIAS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("4. REFERÊNCIAS", MARGIN, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  REFERENCIAS_LISTA.forEach((ref) => {
    doc.text(ref, MARGIN, y);
    y += 4.5;
  });
  y += 4;

  // 5. ABREVIATURAS, TERMOS E DEFINIÇÕES (Parte 1)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("5. ABREVIATURAS, TERMOS E DEFINIÇÕES", MARGIN, y);
  y += 5;

  ABREVIATURAS_PARTE_1.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`- ${item.termo}`, MARGIN, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    const tLines = doc.splitTextToSize(item.texto, CONTENT_W_PORTRAIT);
    doc.text(tLines, MARGIN + 3, y);
    y += tLines.length * 3.8 + 3;
  });

  drawModelFooter(doc, 5, false);
}

/** 7. ABREVIATURAS PARTE 2 (PÁGINA 7 - FOOTER 6) */
function drawPageAbreviaturas2(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  ABREVIATURAS_PARTE_2.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`- ${item.termo}`, MARGIN, y);
    y += 3.8;

    doc.setFont("helvetica", "normal");
    const tLines = doc.splitTextToSize(item.texto, CONTENT_W_PORTRAIT);
    doc.text(tLines, MARGIN + 3, y);
    y += tLines.length * 3.6 + 2.5;
  });

  drawModelFooter(doc, 6, false);
}

/** 8. ABREVIATURAS PARTE 3 & RESPONSABILIDADES 1 (PÁGINA 8 - FOOTER 7) */
function drawPageAbreviaturas3EResponsabilidades1(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  ABREVIATURAS_PARTE_3.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`- ${item.termo}`, MARGIN, y);
    y += 3.8;

    doc.setFont("helvetica", "normal");
    const tLines = doc.splitTextToSize(item.texto, CONTENT_W_PORTRAIT);
    doc.text(tLines, MARGIN + 3, y);
    y += tLines.length * 3.6 + 2.5;
  });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("6. RESPONSABILIDADES E AUTORIDADES", MARGIN, y);
  y += 5;

  // Gerente Geral / Produção (Item a)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("✓ Gerente Geral/Produção", MARGIN, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("a) Prover recursos para que as ações deste programa sejam adotadas;", MARGIN + 4, y);

  drawModelFooter(doc, 7, false);
}

/** 9. RESPONSABILIDADES 2 & METODOLOGIA 1 (PÁGINA 9 - FOOTER 8) */
function drawPageResponsabilidades2EMetodologia1(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  // Continuação de Gerente Geral
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("b) Garantir a execução das ações em todos os níveis da organização;", MARGIN + 4, y);
  y += 4;
  doc.text("c) Cumprir e fazer as diretrizes e requisitos deste Programa.", MARGIN + 4, y);
  y += 5;

  // Restante das responsabilidades
  RESPONSABILIDADES_ITENS.slice(1).forEach((bloco) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`✓ ${bloco.cargo}`, MARGIN, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    bloco.itens.forEach((subItem) => {
      const lines = doc.splitTextToSize(subItem, CONTENT_W_PORTRAIT - 4);
      doc.text(lines, MARGIN + 4, y);
      y += lines.length * 3.8 + 1.2;
    });
    y += 2;
  });

  y += 3;
  // 7 ESTRUTURA GERAL/ METODOLOGIA
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("7 ESTRUTURA GERAL/ METODOLOGIA", MARGIN, y);
  y += 5;

  doc.setFontSize(9);
  doc.text("7.1 PLANEJAMENTO", MARGIN, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.text("7.1.1. Caracterizar e mapear os processos e o ambiente de trabalho", MARGIN, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const mapLines = doc.splitTextToSize(
    "Deve-se realizar o mapeamento dos processos, atividades e tarefas por meio de check list, entrevista, verificação in-loco e consulta de documentos para subsidiar o levantamento preliminar de perigos e a avaliação de riscos ocupacionais.",
    CONTENT_W_PORTRAIT,
  );
  doc.text(mapLines, MARGIN, y);

  drawModelFooter(doc, 8, false);
}

/** 10. METODOLOGIA 2, DESCRIÇÃO DO AMBIENTE E 7.2 INICIAL (PÁGINA 10 - FOOTER 9) */
function drawPageMetodologia2EAmbiente(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  const subSecoes = [
    {
      num: "7.1.2. Antecipar, reconhecer, avaliar e controlar os riscos ocupacionais",
      txt: "Os riscos identificados serão consolidados na planilha de Identificação, avaliação e controle dos riscos ocupacionais, em seguida avaliados, aqueles com potencial de causar danos a SST serão estabelecidos no plano de ação com estabelecimento de prioridades e metas.",
    },
    {
      num: "7.1.3. Listagem dos Grupos Similares de Exposição - GSE",
      txt: "Os colaboradores podem ser agrupados em Grupos Similares de Exposição – GSEs. Assim, cada Grupo Similar de Exposição possuirá uma identificação, avaliação e controle dos riscos.",
    },
    {
      num: "7.1.4. Recursos",
      txt: "Será disponibilizado por parte da alta administração os recursos necessários para a execução deste documento.",
    },
    {
      num: "7.1.5. Estabelecimento de Metas e Objetivos",
      txt: "Será estabelecido no plano de ação objetivos e metas, de forma que esteja em congruência com o objetivo de eliminar, minimizar ou neutralizar os riscos ocupacionais.",
    },
    {
      num: "7.1.6. Registros",
      txt: "As evidencias da execução deste documento serão por meio de checklist, lista de treinamento, registro fotográfico e serão arquivados eletronicamente em pasta específica.",
    },
    {
      num: "7.1.7. Indicadores de Segurança",
      txt: "Com a finalidade de aferir os resultados do programa, serão estabelecidos indicadores de segurança.",
    },
  ];

  subSecoes.forEach((sec) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(0, 0, 0);
    doc.text(sec.num, MARGIN, y);
    y += 3.8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    const lines = doc.splitTextToSize(sec.txt, CONTENT_W_PORTRAIT);
    doc.text(lines, MARGIN, y);
    y += lines.length * 3.6 + 2.5;
  });

  y += 2;
  // Descrição do ambiente de trabalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Descrição do ambiente de trabalho", MARGIN, y);
  y += 4;

  const ambienteRows = data.gesList.map((g) => [
    safeText(g.setor, "Operacional"),
    safeText(
      g.ambiente_trabalho || g.descricao_atividade || g.observacoes,
      "Ambiente de trabalho conforme rotina operacional da organização, provido de ventilação e iluminação adequadas.",
    ),
    `GES ${g.codigo_ges ? g.codigo_ges : g.cargo}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Setor", "Descrição", "GES"]],
    body: ambienteRows,
    theme: "grid",
    headStyles: {
      fillColor: VERDE_ENGTECH,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      fontSize: 7.5,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 7.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: 106 },
      2: { cellWidth: 34, halign: "center" },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // @ts-expect-error lastAutoTable
  y = doc.lastAutoTable.finalY + 4;

  // 7.2. Antecipação, identificação, avaliação e controle dos Riscos Ocupacionais
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("7.2. Antecipação, identificação, avaliação e controle dos Riscos Ocupacionais", MARGIN, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text("Planilha de Identificação, avaliação e controle dos riscos ocupacionais:", MARGIN, y);
  y += 3.8;
  doc.text("a) Levantamento preliminar e identificação de perigos", MARGIN, y);
  y += 3.8;

  doc.setFont("helvetica", "bold");
  doc.text("Setor: ", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.text("Inserir o nome do setor para o qual está se realizando o Inventário.", MARGIN + 12, y);
  y += 3.8;

  doc.setFont("helvetica", "bold");
  doc.text("Funções vinculadas e descrição ao GSE: ", MARGIN, y);
  doc.setFont("helvetica", "normal");
  const fLines = doc.splitTextToSize(
    "Elencar todas as funções presentes no respectivo Posto de Trabalho e sua respectiva descrição conforme a Descrição de Função de Recursos Humanos.",
    CONTENT_W_PORTRAIT - 62,
  );
  doc.text(fLines, MARGIN + 62, y);

  drawModelFooter(doc, 9, false);
}

/** 11. DETALHAMENTO DOS CAMPOS 7.2 (PÁGINA 11 - FOOTER 10) */
function drawPageDetalhamentoCampos(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  CAMPOS_DETALHAMENTO_7_2.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(item.campo, MARGIN, y);

    doc.setFont("helvetica", "normal");
    const campoWidth = doc.getTextWidth(item.campo) + 2;
    const descLines = doc.splitTextToSize(item.texto, CONTENT_W_PORTRAIT - campoWidth);
    doc.text(descLines, MARGIN + campoWidth, y);

    y += Math.max(descLines.length * 3.8, 4.5) + 3;
  });

  drawModelFooter(doc, 10, false);
}

/** 12. MATRIZ 6X4 E CONTROLE (PÁGINA 12 - FOOTER 11) */
function drawPageMatriz6x4EControle(
  doc: jsPDF,
  data: PgrDocumentData,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("7.2.1. Avaliação de Risco", MARGIN, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const evalLines = doc.splitTextToSize(
    "Após a identificação dos perigos na etapa de reconhecimento será realizada a avaliação dos riscos que poderá ser medida por técnica qualitativa e/ou quantitativa em função de cada fator de risco.\nPara avaliação do risco será utilizada a matriz abaixo através da combinação da probabilidade de ocorrência de eventos relacionados a exposições perigosas a agentes nocivos e da gravidade das lesões e problemas de saúde que podem ser causados pelo evento ou exposição.",
    CONTENT_W_PORTRAIT,
  );
  doc.text(evalLines, MARGIN, y);
  y += evalLines.length * 3.6 + 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Metodologia – Matriz 6x4", MARGIN, y);
  y += 3.8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Matriz 6x4 qualitativa simplificada com probabilidades adaptadas da AIHA.", MARGIN, y);
  y += 4;

  // Duas tabelas lado a lado: Severidade (esquerda) e Probabilidade (direita)
  const leftTableW = 88;
  const rightTableW = 88;
  const tableGap = CONTENT_W_PORTRAIT - leftTableW - rightTableW;

  const startYTables = y;

  // Tabela Severidade
  autoTable(doc, {
    startY: startYTables,
    head: TABELA_SEVERIDADE.head,
    body: TABELA_SEVERIDADE.body,
    theme: "grid",
    headStyles: {
      fillColor: VERDE_ENGTECH,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 1.2,
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold" },
      1: { cellWidth: 60 },
    },
    margin: { left: MARGIN, right: MARGIN + rightTableW + tableGap },
  });

  // Tabela Probabilidade
  autoTable(doc, {
    startY: startYTables,
    head: [
      [{ content: "Probabilidade da Consequência", colSpan: 2, styles: { fillColor: VERDE_ENGTECH, textColor: 255, fontStyle: "bold", halign: "center" as const } }],
      ["Categoria", "Definição"],
    ],
    body: TABELA_PROBABILIDADE.body,
    theme: "grid",
    headStyles: {
      fillColor: VERDE_ENGTECH,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 1.2,
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: "bold" },
      1: { cellWidth: 62 },
    },
    margin: { left: MARGIN + leftTableW + tableGap, right: MARGIN },
  });

  // @ts-expect-error lastAutoTable
  y = Math.max(doc.lastAutoTable.finalY + 5, startYTables + 42);

  // Tabela Matriz 6x4 Colorida
  const matrizHead = [
    [
      { content: "Gravidade da Consequência", colSpan: 2, styles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: "bold", halign: "center" as const } },
      { content: "Probabilidade da Ocorrência", colSpan: 6, styles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: "bold", halign: "center" as const } },
    ],
    [
      { content: "Gravidade", styles: { halign: "center" as const } },
      { content: "Pts", styles: { halign: "center" as const } },
      { content: "Improvável\n0", styles: { halign: "center" as const } },
      { content: "Raro\n1", styles: { halign: "center" as const } },
      { content: "Incomum\n2", styles: { halign: "center" as const } },
      { content: "Ocasional\n4", styles: { halign: "center" as const } },
      { content: "Frequente\n6", styles: { halign: "center" as const } },
      { content: "Contínuo\n8", styles: { halign: "center" as const } },
    ],
  ];

  const matrizBody = MATRIZ_6X4_ROWS.map((row) => [
    { content: row.nome, styles: { fontStyle: "bold" as const } },
    { content: row.pts, styles: { halign: "center" as const, fontStyle: "bold" as const } },
    ...row.cols.map((col) => ({
      content: col.val,
      styles: {
        fillColor: col.bg,
        textColor: col.text as [number, number, number],
        halign: "center" as const,
        fontStyle: "bold" as const,
      },
    })),
  ]);

  autoTable(doc, {
    startY: y,
    head: matrizHead,
    body: matrizBody,
    theme: "grid",
    headStyles: {
      fillColor: VERDE_ENGTECH,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.8,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 7,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 14 },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: 23 },
      5: { cellWidth: 23 },
      6: { cellWidth: 23 },
      7: { cellWidth: 23 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // @ts-expect-error lastAutoTable
  y = doc.lastAutoTable.finalY + 5;

  // 7.2.2. Controle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("7.2.2. Controle", MARGIN, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const ctrlLines = doc.splitTextToSize(
    "No preenchimento da probabilidade da ocorrência na matriz de riscos deverá ser considerado o conjunto de análises relacionadas a frequência de exposição, histórico de incidentes relacionados ao risco, número de colaboradores expostos aos riscos e eficiência das medidas de controle.",
    CONTENT_W_PORTRAIT,
  );
  doc.text(ctrlLines, MARGIN, y);

  drawModelFooter(doc, 11, false);
}

/** 13. INVENTÁRIO DE RISCOS OCUPACIONAIS - LANDSCAPE (PÁGINAS 13+ - FOOTER 12+) */
function drawPageInventarioGesLandscape(
  doc: jsPDF,
  data: PgrDocumentData,
  gesItem: PgrDocumentData["gesList"][0],
  gesIndex: number,
  pageBadgeNum: number,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "landscape");
  let y = drawModelHeader(doc, data, logoCompactUrl, true);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("8. IDENTIFICAÇÃO, AVALIAÇÃO E CONTROLE DOS RISCOS OCUPACIONAIS", MARGIN, y);
  y += 4.5;

  // Banner do GES
  doc.setFillColor(...VERDE_ENGTECH);
  doc.rect(MARGIN, y, CONTENT_W_LANDSCAPE, 5.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const gesNumStr = String(gesIndex + 1).padStart(2, "0");
  doc.text(`GES ${gesNumStr} - ${gesItem.cargo.toUpperCase()}`, MARGIN + 4, y + 4);
  y += 8;

  // Setor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`SETORES: ${(gesItem.setor || "OPERACIONAL").toUpperCase()}`, MARGIN, y);
  y += 4;

  // Tabela 1: Funções
  const funcoesBody =
    gesItem.funcoes && gesItem.funcoes.length > 0
      ? gesItem.funcoes.map((f) => [
          f.nome,
          String(Math.max(1, Math.round(gesItem.qtd_colaboradores / gesItem.funcoes.length))),
          safeText(f.descricao_atividades, "Atividades operacionais conforme função."),
          safeText(gesItem.ambiente_trabalho || gesItem.descricao_atividade, "Atividades rotineiras inerentes à função."),
        ])
      : [
          [
            gesItem.cargo,
            String(gesItem.qtd_colaboradores),
            safeText(gesItem.descricao_atividade, "Atividades operacionais conforme função."),
            safeText(gesItem.ambiente_trabalho, "Atividades rotineiras inerentes à função."),
          ],
        ];

  autoTable(doc, {
    startY: y,
    head: [
      [
        {
          content: "Identificação, Avaliação e Controle dos Riscos - Funções",
          colSpan: 4,
          styles: { fillColor: VERDE_ENGTECH, textColor: 255, fontStyle: "bold", halign: "center" as const },
        },
      ],
      ["Funções", "N° de Funcionários", "Descrição das atividades realizadas pela função:", "Caracterização das atividades"],
    ],
    body: funcoesBody,
    theme: "grid",
    headStyles: {
      fillColor: VERDE_ENGTECH,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: 26, halign: "center" },
      2: { cellWidth: 100 },
      3: { cellWidth: 93 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // @ts-expect-error lastAutoTable
  y = doc.lastAutoTable.finalY + 5;

  // Tabela 2: Inventário de Riscos (12 colunas)
  const riscos = gesItem.riscos || [];

  const riscosBody =
    riscos.length > 0
      ? riscos.map((r) => {
          const tipoCor = getCorTipoRisco(r.tipo_risco);
          const np = getPontosProbabilidade(r.probabilidade);
          const ns = getPontosSeveridade(r.severidade);
          const crValor = np * ns;
          const crCor = getCorClassificacaoRisco(crValor);

          const medidasArr: string[] = [];
          if (r.utiliza_epi === "Sim") medidasArr.push("Uso de EPI");
          if (r.utiliza_epc === "Sim" || r.epc_eficaz === "Sim") medidasArr.push("Uso de EPC");
          if (r.recomendacao_medidas) medidasArr.push(r.recomendacao_medidas);
          const medidasTexto = medidasArr.length > 0 ? medidasArr.join("; ") : "Controles operacionais e administrativos";

          return [
            {
              content: r.tipo_risco ? r.tipo_risco.toUpperCase() : "FÍSICO",
              styles: {
                fillColor: tipoCor.bg,
                textColor: tipoCor.text as [number, number, number],
                fontStyle: "bold" as const,
                halign: "center" as const,
              },
            },
            safeText(r.nome_risco),
            safeText(r.fontes_geradoras || r.trajetoria, "Exposição ocupacional durante a jornada"),
            safeText(r.trajetoria || r.avaliacao, "Lesões decorrentes do fator de risco"),
            safeText(r.intensidade || r.tipo_avaliacao, "Qualitativa"),
            safeText(r.fontes_geradoras, "Processo de trabalho"),
            medidasTexto,
            safeText(r.freq_exposicao, "Habitual / Intermitente"),
            { content: String(np), styles: { halign: "center" as const } },
            { content: String(ns), styles: { halign: "center" as const } },
            {
              content: crCor.label,
              styles: {
                fillColor: crCor.bg,
                textColor: crCor.text as [number, number, number],
                fontStyle: "bold" as const,
                halign: "center" as const,
              },
            },
            safeText(r.recomendacao_medidas, "Manter medidas de proteção e treinamentos"),
          ];
        })
      : [
          [
            { content: "FÍSICO", styles: { halign: "center" as const } },
            "Ausência de risco específico identificado",
            "—",
            "—",
            "—",
            "—",
            "—",
            "—",
            "0",
            "1",
            "0 (Baixo)",
            "Manutenção das condições higiênicas e seguras",
          ],
        ];

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: "Levantamento preliminar e identificação de perigos", colSpan: 8, styles: { halign: "center" as const, fillColor: [45, 45, 45], textColor: 255 } },
        { content: "Avaliação dos Riscos", colSpan: 3, styles: { halign: "center" as const, fillColor: [35, 35, 35], textColor: 255 } },
        { content: "Controle", colSpan: 1, styles: { halign: "center" as const, fillColor: [45, 45, 45], textColor: 255 } },
      ],
      [
        "Tipo de RO",
        "Descrição do Perigo",
        "Descrição do risco",
        "Possíveis lesões ou agravos a saúde",
        "Intensidade",
        "Identificação das fontes ou circunstâncias",
        "Descrição de medidas de prevenção implementadas",
        "Tempo de Exposição",
        "NP",
        "NS",
        "CR",
        "Implementação de medidas de controle",
      ],
    ],
    body: riscosBody,
    theme: "grid",
    headStyles: {
      fillColor: VERDE_ENGTECH,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.2,
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 6.2,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 1.2,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 26 },
      6: { cellWidth: 28 },
      7: { cellWidth: 18, halign: "center" },
      8: { cellWidth: 10, halign: "center" },
      9: { cellWidth: 10, halign: "center" },
      10: { cellWidth: 20, halign: "center" },
      11: { cellWidth: 46 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // Legenda no rodapé da tabela
  // @ts-expect-error lastAutoTable
  y = doc.lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(60, 60, 60);
  doc.text(
    "Legenda: RO - Risco Ocupacional  NMC - Nível de Medida de Controle  NE - Nível de Exposição  NP - Nível de Probabilidade  NG - Nível de Gravidade  NR - Nível de Risco  CR - Classificação do Risco",
    MARGIN,
    y,
  );

  drawModelFooter(doc, pageBadgeNum, true);
}

/** 14. MATRIZ DE EPI POR FUNÇÃO - LANDSCAPE (PÁGINA 14 - FOOTER 14) */
function drawPageMatrizEpiLandscape(
  doc: jsPDF,
  data: PgrDocumentData,
  pageBadgeNum: number,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "landscape");
  let y = drawModelHeader(doc, data, logoCompactUrl, true);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("9. MATRIZ DE EPI POR FUNÇÃO", MARGIN, y);
  y += 5;

  const epiRows: Array<[string, string, string, string]> = [];
  let contador = 1;

  data.gesList.forEach((g) => {
    const episDoGes = (g.medidas || []).filter(
      (m) => m.tipo && m.tipo.toLowerCase().includes("epi"),
    );

    const episTexto =
      episDoGes.length > 0
        ? episDoGes
            .map((e) => `${e.nome_medida}${e.ca ? ` (C.A ${e.ca})` : ""}`)
            .join("; ")
        : "Não há exigência de EPI específico para a função.";

    if (g.funcoes && g.funcoes.length > 0) {
      g.funcoes.forEach((f) => {
        epiRows.push([
          String(contador++).padStart(2, "0"),
          safeText(g.setor, "Operacional"),
          f.nome,
          episTexto,
        ]);
      });
    } else {
      epiRows.push([
        String(contador++).padStart(2, "0"),
        safeText(g.setor, "Operacional"),
        g.cargo,
        episTexto,
      ]);
    }
  });

  autoTable(doc, {
    startY: y,
    head: [
      [
        {
          content: "QUADRO DE EPI POR FUNÇÃO",
          colSpan: 4,
          styles: { fillColor: VERDE_ENGTECH, textColor: 255, fontStyle: "bold", halign: "center" as const },
        },
      ],
      ["ID", "Setor", "Função", "EPI"],
    ],
    body: epiRows,
    theme: "grid",
    headStyles: {
      fillColor: VERDE_ENGTECH,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: 54 },
      2: { cellWidth: 65 },
      3: { cellWidth: 134 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  drawModelFooter(doc, pageBadgeNum, true);
}

/** 15. PLANO DE AÇÃO 5W2H - LANDSCAPE (PÁGINA 15 - FOOTER 15) */
function drawPagePlanoAcaoLandscape(
  doc: jsPDF,
  data: PgrDocumentData,
  pageBadgeNum: number,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "landscape");
  let y = drawModelHeader(doc, data, logoCompactUrl, true);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("10. PLANO DE AÇÃO", MARGIN, y);
  y += 5;

  // Plano de Ação 5W2H realista extraído dos dados
  const acoes5W2H = [
    [
      "01",
      "Realização de Exames Médicos Ocupacionais (PCMSO)",
      "Monitorar a integridade física e a saúde dos trabalhadores",
      "Todos os setores",
      "Médico do Trabalho / RH",
      "Através de ASO admissional, periódico e demissional",
      "Conforme PCMSO",
      "Em andamento",
    ],
    [
      "02",
      "Fornecimento e Controle de Fichas de EPIs",
      "Neutralizar ou atenuar os riscos ocupacionais existentes",
      "Postos de Trabalho",
      "SESMT / Supervisão",
      "Distribuição com registro formal e fiscalização",
      "Contínuo",
      "Em andamento",
    ],
    [
      "03",
      "Treinamentos de Segurança e Ordens de Serviço (NR-01)",
      "Capacitar os trabalhadores sobre perigos e medidas preventivas",
      "Setores Operacionais",
      "EngTech / SST",
      "Treinamentos presenciais com lista de presença",
      "Na admissão / Anual",
      "Em andamento",
    ],
    [
      "04",
      "Inspeções Periódicas de Segurança e Manutenção",
      "Prevenir condições perigosas em máquinas e instalações",
      "Áreas da Organização",
      "Manutenção / SESMT",
      "Checklists e manutenções preventivas programadas",
      "Mensal",
      "Em andamento",
    ],
  ];

  // Adiciona recomendações específicas dos riscos caso existam
  let extraCount = 5;
  data.gesList.forEach((g) => {
    (g.riscos || []).forEach((r) => {
      if (r.recomendacao_medidas && r.recomendacao_medidas.trim() !== "" && extraCount <= 8) {
        acoes5W2H.push([
          String(extraCount++).padStart(2, "0"),
          r.recomendacao_medidas.slice(0, 50),
          `Mitigar o risco de ${r.nome_risco}`,
          safeText(g.setor, "Operacional"),
          "Supervisão / SESMT",
          "Execução de melhorias de controle técnico",
          "Vigência do PGR",
          "A iniciar",
        ]);
      }
    });
  });

  autoTable(doc, {
    startY: y,
    head: [["Nº", "O QUE?", "POR QUÊ?", "ONDE?", "QUEM?", "COMO?", "QUANDO?", "STATUS"]],
    body: acoes5W2H,
    theme: "grid",
    headStyles: {
      fillColor: VERDE_ENGTECH,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 46 },
      2: { cellWidth: 46 },
      3: { cellWidth: 32 },
      4: { cellWidth: 30 },
      5: { cellWidth: 43 },
      6: { cellWidth: 34, halign: "center" },
      7: { cellWidth: 26, halign: "center" },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  drawModelFooter(doc, pageBadgeNum, true);
}

/** 16. ENCERRAMENTO: 8. REGISTRO, 9. ANEXO E 10. ASSINATURAS - PORTRAIT (FINAL - FOOTER 16) */
function drawPageEncerramentoEAssinaturas(
  doc: jsPDF,
  data: PgrDocumentData,
  pageBadgeNum: number,
  logoCompactUrl: string,
) {
  doc.addPage("a4", "portrait");
  let y = drawModelHeader(doc, data, logoCompactUrl, false);

  // Banner 8. REGISTRO
  doc.setFillColor(...VERDE_ENGTECH);
  doc.rect(MARGIN, y, CONTENT_W_PORTRAIT, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("8. REGISTRO", MARGIN + 4, y + 4.2);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("1. Planilha de identificação, avaliação e controle dos riscos ocupacionais;", MARGIN + 4, y);
  y += 4.5;
  doc.text("2. Planilha do Plano de Ação;", MARGIN + 4, y);
  y += 4.5;
  doc.text("3. Planilha com Indicadores de Segurança.", MARGIN + 4, y);
  y += 8;

  // Banner 9. ANEXO
  doc.setFillColor(...VERDE_ENGTECH);
  doc.rect(MARGIN, y, CONTENT_W_PORTRAIT, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("9. ANEXO", MARGIN + 4, y + 4.2);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("1. Planilha de identificação, avaliação e controle dos riscos ocupacionais;", MARGIN + 4, y);
  y += 4.5;
  doc.text("2. Planilha do Plano de Ação;", MARGIN + 4, y);
  y += 9;

  // Banner 10. ASSINATURAS
  doc.setFillColor(...VERDE_ENGTECH);
  doc.rect(MARGIN, y, CONTENT_W_PORTRAIT, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("10. ASSINATURAS", MARGIN + 4, y + 4.2);
  y += 12;

  // Localidade e Data
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  const localidadeTexto = `${data.vigencia.localEmissao || "Brasil"}, ${data.vigencia.dataEmissao}`;
  doc.text(localidadeTexto, PAGE_W_PORTRAIT / 2, y, { align: "center" });
  y += 32;

  // Linhas e Quadros de Assinatura
  const signW = 75;
  const leftX = MARGIN + 8;
  const rightX = PAGE_W_PORTRAIT - MARGIN - signW - 8;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(leftX, y, leftX + signW, y);
  doc.line(rightX, y, rightX + signW, y);
  y += 4.5;

  // Responsável Técnico
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(safeText(data.responsavel.nome), leftX + signW / 2, y, { align: "center" });

  // Empregador
  doc.text(
    safeText(data.empresa.razao_social || data.empresa.nome),
    rightX + signW / 2,
    y,
    { align: "center" },
  );
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);

  const regStr = data.responsavel.registro
    ? `${data.responsavel.tipo_registro ? data.responsavel.tipo_registro + " " : ""}${data.responsavel.registro}`
    : "Responsável Técnico SST";
  doc.text(regStr, leftX + signW / 2, y, { align: "center" });
  doc.text("Responsável pela implantação", rightX + signW / 2, y, { align: "center" });
  y += 4;

  doc.text(
    safeText(data.responsavel.cargo, "Engenheiro / Técnico de Segurança"),
    leftX + signW / 2,
    y,
    { align: "center" },
  );
  doc.text(`CNPJ: ${safeText(data.empresa.cnpj)}`, rightX + signW / 2, y, { align: "center" });

  drawModelFooter(doc, pageBadgeNum, false);
}

/** GERAÇÃO COMPLETA DO DOCUMENTO PGR EM PDF */
export async function gerarPgrPDF(data: PgrDocumentData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // 1. Gera logos EngTech e ilustrações
  const logoCompactUrl = getEngTechLogoDataUrl(true);
  const logoGrandeUrl = getEngTechLogoDataUrl(false);

  // Tenta carregar ilustração da capa ou usa o gerador Canvas de alta definição
  let coverImgDataUrl = await loadImage(pgrCoverImg);
  if (!coverImgDataUrl) {
    coverImgDataUrl = getCoverIllustrationFallbackDataUrl();
  }

  // 1. Capa (Página 1, sem numeração no rodapé)
  drawPageCapa(doc, data, logoGrandeUrl, coverImgDataUrl);

  // 2. Folha de Rosto (Página 2, footer badge: 1)
  drawPageFolhaRosto(doc, data, logoCompactUrl);

  // 3. Revisões e Aprovação (Página 3, footer badge: 2)
  drawPageRevisoes(doc, data, logoCompactUrl);

  // 4. Sumário (Página 4, footer badge: 3)
  drawPageSumario(doc, data, logoCompactUrl);

  // 5. Identificação da Empresa (Página 5, footer badge: 4)
  drawPageIdentificacaoEmpresa(doc, data, logoCompactUrl);

  // 6. Objetivo, Campo de Aplicação, Referências e Abreviaturas 1 (Página 6, footer badge: 5)
  drawPageObjetivoAbreviaturas1(doc, data, logoCompactUrl);

  // 7. Abreviaturas Parte 2 (Página 7, footer badge: 6)
  drawPageAbreviaturas2(doc, data, logoCompactUrl);

  // 8. Abreviaturas Parte 3 & Responsabilidades 1 (Página 8, footer badge: 7)
  drawPageAbreviaturas3EResponsabilidades1(doc, data, logoCompactUrl);

  // 9. Responsabilidades 2 & Metodologia 1 (Página 9, footer badge: 8)
  drawPageResponsabilidades2EMetodologia1(doc, data, logoCompactUrl);

  // 10. Metodologia 2, Descrição do Ambiente e 7.2 Inicial (Página 10, footer badge: 9)
  drawPageMetodologia2EAmbiente(doc, data, logoCompactUrl);

  // 11. Detalhamento dos Campos 7.2 (Página 11, footer badge: 10)
  drawPageDetalhamentoCampos(doc, data, logoCompactUrl);

  // 12. Matriz 6x4 e Controle (Página 12, footer badge: 11)
  drawPageMatriz6x4EControle(doc, data, logoCompactUrl);

  // 13. Inventário de Riscos Ocupacionais (Landscape - Páginas 13+, footer badge: 12+)
  let currentBadgeNum = 12;
  for (let idx = 0; idx < data.gesList.length; idx++) {
    const gesItem = data.gesList[idx];
    drawPageInventarioGesLandscape(doc, data, gesItem, idx, currentBadgeNum++, logoCompactUrl);
  }

  // 14. Matriz de EPI por Função (Landscape)
  drawPageMatrizEpiLandscape(doc, data, currentBadgeNum++, logoCompactUrl);

  // 15. Plano de Ação 5W2H (Landscape)
  drawPagePlanoAcaoLandscape(doc, data, currentBadgeNum++, logoCompactUrl);

  // 16. Encerramento: 8. Registro, 9. Anexo e 10. Assinaturas (Portrait)
  drawPageEncerramentoEAssinaturas(doc, data, currentBadgeNum++, logoCompactUrl);

  return doc;
}

export function downloadPgrPDF(doc: jsPDF, empresaNome: string, revisao: string) {
  const safe = empresaNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const d = new Date();
  const data = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  const filename = `PGR_${safe || "Empresa"}_Rev${revisao || "00"}_${data}.pdf`;
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
