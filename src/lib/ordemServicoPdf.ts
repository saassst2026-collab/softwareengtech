import jsPDF from "jspdf";

const CINZA_BANNER: [number, number, number] = [217, 217, 217];
const CINZA_TEXTO: [number, number, number] = [80, 80, 80];
const PRETO: [number, number, number] = [30, 30, 30];
const BORDA: [number, number, number] = [60, 60, 60];

export type OrdemServicoData = {
  empregador_razao_social: string;
  funcionario_nome: string;
  funcionario_cpf?: string | null;
  funcionario_cargo: string;
  funcionario_setor?: string | null;
  data_admissao?: string | null;
  descricao_atividades?: string | null;
  riscos_fisicos?: string | null;
  riscos_quimicos?: string | null;
  riscos_biologicos?: string | null;
  riscos_ergonomicos?: string | null;
  riscos_acidentes?: string | null;
  medidas_preventivas?: string | null;
  treinamentos_obrigatorios?: string | null;
  proibicoes?: string | null;
  responsavel_nome?: string | null;
  responsavel_titulo?: string | null;
  responsavel_registro?: string | null;
  local_emissao?: string | null;
  data_emissao?: string | null;
  revisao?: string | null;
  logo_url?: string | null;
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

function formatDateBR(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_RESERVED = 10;

type Ctx = {
  doc: jsPDF;
  y: number;
  logo: { dataUrl: string; w: number; h: number } | null;
  revisao: string;
};

function drawHeader(ctx: Ctx) {
  const { doc, logo, revisao } = ctx;
  const boxY = MARGIN;
  const boxH = 22;
  const logoW = 40;
  const revW = 28;
  const titleW = CONTENT_W - logoW - revW;

  doc.setDrawColor(...BORDA);
  doc.setLineWidth(0.3);
  // Outer box
  doc.rect(MARGIN, boxY, CONTENT_W, boxH);
  // Inner dividers
  doc.line(MARGIN + logoW, boxY, MARGIN + logoW, boxY + boxH);
  doc.line(MARGIN + logoW + titleW, boxY, MARGIN + logoW + titleW, boxY + boxH);

  // Logo
  if (logo) {
    const maxH = boxH - 4;
    const maxW = logoW - 4;
    const ratio = logo.w / logo.h;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    try {
      doc.addImage(logo.dataUrl, "JPEG", MARGIN + (logoW - w) / 2, boxY + (boxH - h) / 2, w, h);
    } catch {
      /* ignore */
    }
  }

  // Title area
  const titleCx = MARGIN + logoW + titleW / 2;
  doc.setTextColor(...PRETO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("REGISTRO", titleCx, boxY + 7, { align: "center" });
  doc.setFontSize(15);
  doc.text("ORDEM DE SERVIÇO", titleCx, boxY + 16, { align: "center" });

  // Rev
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`REV:${revisao}`, MARGIN + logoW + titleW + revW / 2, boxY + 12, {
    align: "center",
  });

  ctx.y = boxY + boxH;
}

function drawFooter(doc: jsPDF) {
  doc.setTextColor(...CINZA_TEXTO);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const total = doc.getNumberOfPages();
  const cur = doc.getCurrentPageInfo().pageNumber;
  doc.text(`EngTech SST  ·  Página ${cur} de ${total}`, PAGE_W / 2, PAGE_H - 5, {
    align: "center",
  });
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y + needed > PAGE_H - FOOTER_RESERVED) {
    ctx.doc.addPage();
    drawHeader(ctx);
  }
}

function forcePageBreak(ctx: Ctx) {
  ctx.doc.addPage();
  drawHeader(ctx);
}

function sectionBanner(ctx: Ctx, title: string, minContent = 16) {
  // Evita banner órfão no fim da página: garante espaço para o conteúdo seguinte
  ensureSpace(ctx, 8 + minContent);
  const { doc } = ctx;
  const h = 6.5;
  doc.setFillColor(...CINZA_BANNER);
  doc.setDrawColor(...BORDA);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, ctx.y, CONTENT_W, h, "FD");
  doc.setTextColor(...PRETO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(title.toUpperCase(), PAGE_W / 2, ctx.y + 4.6, { align: "center" });
  ctx.y += h;
}

function paragraphCell(
  ctx: Ctx,
  text: string,
  opts?: { size?: number; padX?: number; padY?: number },
) {
  const { doc } = ctx;
  const size = opts?.size ?? 9;
  const padX = opts?.padX ?? 2;
  const padY = opts?.padY ?? 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(...PRETO);
  const lineH = size * 0.42;
  const lines = doc.splitTextToSize(text, CONTENT_W - padX * 2) as string[];
  const h = lines.length * lineH + padY * 2;
  ensureSpace(ctx, h);
  doc.setDrawColor(...BORDA);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, ctx.y, CONTENT_W, h);
  lines.forEach((l, i) => {
    doc.text(l, MARGIN + padX, ctx.y + padY + lineH * (i + 0.8));
  });
  ctx.y += h;
}

function bulletCell(ctx: Ctx, items: string[], opts?: { size?: number }) {
  const { doc } = ctx;
  const size = opts?.size ?? 9;
  const padX = 3;
  const padY = 2;
  const lineH = size * 0.42;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  const cleaned = items.map((s) => s.trim()).filter(Boolean);
  const wrapped = cleaned.map((it) => doc.splitTextToSize(it, CONTENT_W - padX - 6) as string[]);
  const totalLines = wrapped.reduce((a, w) => a + w.length, 0);
  const h = totalLines * lineH + padY * 2;
  ensureSpace(ctx, h);
  doc.setDrawColor(...BORDA);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, ctx.y, CONTENT_W, h);
  doc.setTextColor(...PRETO);
  let y = ctx.y + padY + lineH * 0.8;
  wrapped.forEach((lines) => {
    doc.text("•", MARGIN + padX, y);
    lines.forEach((l, i) => {
      doc.text(l, MARGIN + padX + 4, y + i * lineH);
    });
    y += lines.length * lineH;
  });
  ctx.y += h;
}

function labelValueRow(ctx: Ctx, pairs: Array<{ label: string; value: string }>) {
  const { doc } = ctx;
  const cols = pairs.length;
  const colW = CONTENT_W / cols;
  const size = 9;
  const lineH = 4.4;
  const padX = 2;
  const padY = 2;
  doc.setFontSize(size);
  const prepared = pairs.map((p) => {
    doc.setFont("helvetica", "bold");
    const labelW = doc.getTextWidth(`${p.label}: `);
    doc.setFont("helvetica", "normal");
    const remaining = colW - labelW - padX * 2;
    const val = p.value || "";
    const lines = val ? (doc.splitTextToSize(val, Math.max(remaining, 20)) as string[]) : [""];
    return { p, labelW, lines };
  });
  const maxLines = Math.max(1, ...prepared.map((x) => x.lines.length));
  const rowH = maxLines * lineH + padY * 2 - 1.5;
  ensureSpace(ctx, rowH);
  doc.setDrawColor(...BORDA);
  doc.setLineWidth(0.3);
  // Outer row rect
  doc.rect(MARGIN, ctx.y, CONTENT_W, rowH);
  prepared.forEach(({ p, labelW, lines }, i) => {
    const x = MARGIN + colW * i;
    if (i > 0) doc.line(x, ctx.y, x, ctx.y + rowH);
    const baseY = ctx.y + padY + lineH * 0.6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRETO);
    doc.text(`${p.label}:`, x + padX, baseY);
    doc.setFont("helvetica", "normal");
    lines.forEach((l, idx) => {
      doc.text(l, x + padX + labelW, baseY + idx * lineH);
    });
  });
  ctx.y += rowH;
}

function riscosBlock(ctx: Ctx, pairs: Array<[string, string]>) {
  const { doc } = ctx;
  const size = 9;
  const lineH = 4.4;
  const padX = 2;
  const padY = 2;
  doc.setFontSize(size);
  const prepared = pairs.map(([label, value]) => {
    doc.setFont("helvetica", "bold");
    const labelW = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal");
    const val = value || "Não aplicável.";
    const lines = doc.splitTextToSize(val, CONTENT_W - padX * 2 - labelW) as string[];
    return { label, labelW, lines };
  });
  prepared.forEach(({ label, labelW, lines }) => {
    const h = lines.length * lineH + padY * 2 - 1.5;
    ensureSpace(ctx, h);
    doc.setDrawColor(...BORDA);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, ctx.y, CONTENT_W, h);
    const baseY = ctx.y + padY + lineH * 0.6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRETO);
    doc.text(`${label}:`, MARGIN + padX, baseY);
    doc.setFont("helvetica", "normal");
    lines.forEach((l, i) => {
      doc.text(l, MARGIN + padX + labelW, baseY + i * lineH);
    });
    ctx.y += h;
  });
}

function splitLines(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n|;\s*/)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

// Textos fixos do modelo institucional EngTech
const OBRIGACOES_EMPREGADO = [
  "Cumprir todas as normas expedidas pelo empregador, inclusive esta ordem de serviço;",
  "Comunicar todas as condições inseguras presentes no ambiente ao supervisor imediato;",
  "Manter a ordem, disciplina, higiene e segurança no trabalho;",
  "Participar de treinamentos relacionados a segurança e saúde ocupacional;",
  "Executar as tarefas que lhe forem delegadas após treinamento específico para execução da mesma;",
  "Acompanhar as atividades realizadas em seu ambiente de trabalho e orientar os empregados que estiverem em situação de risco;",
  "Colaborar com a empresa na aplicação das Normas Regulamentadoras – NR's.",
];

const MEDIDAS_PADRAO = [
  "Treinamentos de segurança;",
  "Manter as vias de acesso limpas;",
  "Ficar atento aos desníveis de superfície;",
  "Não mexer em equipamentos sem autorização prévia;",
  "Comunique ao superior imediato toda e qualquer anormalidade, que possa interferir na sua atividade ou de terceiros;",
  "Todo acidente independente de sua gravidade deverá ser comunicado à chefia imediata;",
  "Respeitar a sinalização de segurança;",
  "Não carregar peso em excesso;",
  "Não acessar áreas de acesso restrito sem autorização;",
  "Realize inspeções visuais nos locais de trabalho, mantenha limpo e organizado;",
  "Não correr nas áreas de trabalho;",
  "Fumar somente nas áreas delimitadas;",
  "Não fazer uso de drogas e bebidas alcoólicas;",
  "Respeitar os procedimentos de segurança estabelecidos pelo empregador;",
  "Quando detectado algum animal peçonhento (cobras, escorpiões, marimbondos e abelhas), contatar o serviço de emergência local;",
  "Não obstruir o acesso aos equipamentos de combate a incêndio;",
  "Manter distância de segurança para os trabalhos com ferramentas manuais.",
];

const TREINAMENTOS_PADRAO = [
  "Participar dos treinamentos de ambientação de segurança do trabalho;",
  "Participar dos DSS – Diálogo de Segurança e Saúde Ocupacional;",
  "Treinamento conforme matriz de treinamento e cronograma dos programas legais;",
  "Participar de treinamentos de primeiros socorros.",
];

const PROIBICOES_PADRAO = [
  "Apresentar-se ao trabalho embriagado, ou beber durante a jornada de trabalho;",
  "Portar arma de fogo durante a jornada de trabalho;",
  "Operar equipamentos defeituosos;",
  "Fumar em locais proibidos;",
  "Descumprir as Normas de Segurança e Medicina da Empresa;",
  "Descumprir procedimentos operacionais e de segurança e saúde ocupacionais internos;",
  "Brincar em serviço;",
  "Correr no local de trabalho;",
  "Improvisar consertos em máquinas / equipamentos;",
  "Executar serviços em instalações elétricas;",
  "Retirar proteção de máquinas, equipamentos ou áreas de trabalho oferecendo risco de acidente;",
  "Utilizar cabos elétricos de ferramentas, máquinas, equipamentos com emendas;",
  "Jogar água em equipamentos elétricos, tais como: motores, tomadas, painéis e transformadores.",
];

const MEDICINA_TEXTO =
  "Deverá o empregado submeter-se aos exames médicos previstos nas Normas Regulamentadoras. Fica o Médico do Trabalho da empresa encarregado de comunicar por escrito ao empregado o resultado dos exames médicos e complementares de diagnósticos aos quais os próprios trabalhadores forem submetidos.";

const PROC_ACIDENTES = [
  "Informar imediatamente à chefia imediata;",
  "Colaborar com o SESMT da empresa informando o que aconteceu para os devidos registros;",
  "Em nenhuma circunstância deverá o empregado tentar esconder qualquer tipo de incidente/acidente, sendo considerado pela empresa como falta grave, passível de medidas administrativas.",
];

export const OS_DEFAULTS = {
  medidas: MEDIDAS_PADRAO.join("\n"),
  treinamentos: TREINAMENTOS_PADRAO.join("\n"),
  proibicoes: PROIBICOES_PADRAO.join("\n"),
};

export async function gerarOrdemServicoPDF(data: OrdemServicoData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logo = data.logo_url ? await loadImage(data.logo_url) : null;
  const ctx: Ctx = { doc, y: 0, logo, revisao: data.revisao || "00" };
  drawHeader(ctx);

  // Introdução
  paragraphCell(
    ctx,
    "Pela presente Ordem de Serviço objetivamos informar os trabalhadores que executam suas atividades laborais nesse setor, sobre as condições de segurança e saúde, conforme estabelece a NR-01, item 1.4, bem como aos riscos ocupacionais aos quais estão expostos e também as medidas de prevenção, tendo como parâmetro os agentes físicos, químicos, biológicos, ergonômicos e de acidentes, citados nas NR's 01, 09, 17, 18 e 22 da lei nº 6.514/77 na portaria nº 3.214/78, bem como os procedimentos de aplicação da NR-06, de forma a padronizar comportamentos para prevenir acidentes e/ou doenças ocupacionais.",
  );

  // Dados do funcionário (sem banner, imitando o modelo)
  labelValueRow(ctx, [{ label: "NOME", value: data.funcionario_nome }]);
  labelValueRow(ctx, [
    { label: "SETOR", value: data.funcionario_setor || "" },
    { label: "DATA DE ADMISSÃO", value: formatDateBR(data.data_admissao) },
  ]);
  labelValueRow(ctx, [
    { label: "CARGO", value: data.funcionario_cargo },
    { label: "CPF", value: data.funcionario_cpf || "" },
  ]);
  labelValueRow(ctx, [{ label: "EMPRESA", value: data.empregador_razao_social }]);

  // Obrigações do empregado
  sectionBanner(ctx, "Obrigações do Empregado");
  bulletCell(ctx, OBRIGACOES_EMPREGADO);

  // Descrição das atividades
  sectionBanner(ctx, "Descrição das Atividades (conforme PGR)");
  paragraphCell(ctx, data.descricao_atividades || "—");

  // Riscos
  sectionBanner(ctx, "Riscos das Atividades");
  riscosBlock(ctx, [
    ["Riscos Físicos", data.riscos_fisicos || "Não aplicável."],
    ["Riscos Químicos", data.riscos_quimicos || "Não aplicável."],
    ["Riscos Biológicos", data.riscos_biologicos || "Não aplicável."],
    ["Riscos Ergonômicos", data.riscos_ergonomicos || "Não aplicável."],
    ["Riscos de Acidentes", data.riscos_acidentes || "Não aplicável."],
  ]);

  // Medidas preventivas
  sectionBanner(ctx, "Medidas Preventivas para Realização das Atividades");
  const medidas = splitLines(data.medidas_preventivas);
  bulletCell(ctx, medidas.length ? medidas : MEDIDAS_PADRAO);

  // Treinamentos
  forcePageBreak(ctx);
  sectionBanner(ctx, "Treinamentos Obrigatórios");
  const treins = splitLines(data.treinamentos_obrigatorios);
  bulletCell(ctx, treins.length ? treins : TREINAMENTOS_PADRAO);
  paragraphCell(
    ctx,
    "1.4.2 Cabe ao trabalhador: a) cumprir as disposições legais e regulamentares sobre segurança e saúde no trabalho, inclusive as ordens de serviço expedidas pelo empregador; b) submeter-se aos exames médicos previstos nas NR; c) colaborar com a organização na aplicação das NR; d) usar o equipamento de proteção individual fornecido pelo empregador.",
  );

  // Proibições
  sectionBanner(ctx, "Proibições");
  const proib = splitLines(data.proibicoes);
  bulletCell(ctx, proib.length ? proib : PROIBICOES_PADRAO);

  // Medicina do trabalho
  sectionBanner(ctx, "Medicina do Trabalho");
  paragraphCell(ctx, MEDICINA_TEXTO);

  // Procedimentos em caso de acidentes
  sectionBanner(ctx, "Procedimentos em Caso de Acidentes");
  bulletCell(ctx, PROC_ACIDENTES);
  paragraphCell(
    ctx,
    'Conforme estabelecido no item 1.4, alínea "C", NR-01 da Portaria 3.214/78 do Ministério do Trabalho e Emprego, cabe ao empregador elaborar Ordem de Serviço (OS) sobre Segurança e Medicina do Trabalho, dando ciência aos empregados.',
  );

  // Termo e assinaturas
  forcePageBreak(ctx);
  sectionBanner(ctx, "Termo de Recebimento e Compromisso");
  paragraphCell(
    ctx,
    `Recebi da empresa ${data.empregador_razao_social}, esta Ordem de Serviço de mesmo teor desta que agora assino referente à minha função, que foi elaborada atendendo a legislação trabalhista em vigor, a qual cumprirei. Tomo ciência também, que o não cumprimento de qualquer item desta OS implica em punição de acordo com a legislação trabalhista e normas da empresa.`,
  );

  sectionBanner(ctx, "Responsável pelo Treinamento na O.S.");
  labelValueRow(ctx, [
    { label: "NOME", value: data.responsavel_nome || "" },
    { label: "TÍTULO", value: data.responsavel_titulo || "" },
    { label: "REGISTRO", value: data.responsavel_registro || "" },
  ]);

  sectionBanner(ctx, "Dados do Funcionário e Assinatura");
  labelValueRow(ctx, [{ label: "NOME", value: data.funcionario_nome }]);
  labelValueRow(ctx, [
    {
      label: "LOCAL E DATA",
      value: [data.local_emissao, formatDateBR(data.data_emissao)].filter(Boolean).join(" — "),
    },
  ]);
  ensureSpace(ctx, 44);
  ctx.y += 22;
  const sigY = ctx.y;
  const half = CONTENT_W / 2;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 8, sigY, MARGIN + half - 8, sigY);
  doc.line(MARGIN + half + 8, sigY, MARGIN + CONTENT_W - 8, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PRETO);
  doc.text("Assinatura do Responsável", MARGIN + half / 2, sigY + 5, { align: "center" });
  doc.text("Assinatura do Empregado", MARGIN + half + half / 2, sigY + 5, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...CINZA_TEXTO);
  doc.text(data.responsavel_nome || "", MARGIN + half / 2, sigY + 10, { align: "center" });
  doc.text(data.funcionario_nome || "", MARGIN + half + half / 2, sigY + 10, { align: "center" });
  ctx.y = sigY + 14;

  // Rodapé em todas as páginas
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc);
  }

  return doc;
}

export function downloadOrdemServicoPDF(doc: jsPDF, nome: string) {
  const safe = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const d = new Date();
  const data = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  const filename = `OS_${safe || "EngTech"}_${data}.pdf`;
  try {
    const dataUri = doc.output("datauristring", { filename });
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    doc.save(filename);
  }
}
