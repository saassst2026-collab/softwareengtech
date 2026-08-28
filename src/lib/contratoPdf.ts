import jsPDF from "jspdf";
import { parseLocalDate } from "./dateUtils";

export type ContratoPdfData = {
  // CONTRATADA (EngTech)
  contratada_razao_social: string;
  contratada_endereco: string;
  contratada_cnpj: string;
  contratada_representante: string;
  contratada_representante_cpf: string;
  contratada_whatsapp?: string | null;
  contratada_email?: string | null;
  // CONTRATANTE (cliente)
  cliente_razao_social: string;
  cliente_endereco: string;
  cliente_documento_tipo: "CNPJ" | "CPF";
  cliente_documento: string;
  cliente_representante: string;
  // Contrato
  servicos: string[];
  valor_mensal_texto: string;
  forma_pagamento?: string | null;
  prazo_meses: number;
  foro_comarca: string;
  cidade_assinatura: string;
  data_contrato: string; // YYYY-MM-DD
  observacoes?: string | null;
  logo_url?: string | null;
  numero_proposta?: number | null;
};

const VERDE: [number, number, number] = [34, 120, 60];
const CINZA: [number, number, number] = [80, 80, 80];
const MARGIN = 18;
const LINE_H = 4.8;

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

function formatDateExtenso(iso: string): string {
  const d = parseLocalDate(iso) ?? new Date();
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  return `${String(d.getDate()).padStart(2, "0")} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export function gerarContratoPdf(data: ContratoPdfData): Promise<jsPDF> {
  return build(data);
}

async function build(data: ContratoPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const bottom = pageH - 20;
  const logo = data.logo_url ? await loadImage(data.logo_url) : null;

  const drawHeader = (): number => {
    doc.setFillColor(...VERDE);
    doc.rect(0, 0, pageW, 3.5, "F");
    if (logo) {
      const maxH = 14;
      const maxW = 42;
      const ratio = logo.w / logo.h;
      let lw = maxH * ratio;
      let lh = maxH;
      if (lw > maxW) {
        lw = maxW;
        lh = maxW / ratio;
      }
      doc.addImage(logo.dataUrl, "PNG", MARGIN, 7, lw, lh);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...CINZA);
    const rx = pageW - MARGIN;
    let ry = 10;
    doc.setFont("helvetica", "bold");
    doc.text("ENGTECH Serviços e Consultorias", rx, ry, { align: "right" });
    doc.setFont("helvetica", "normal");
    if (data.contratada_whatsapp) {
      ry += 3.6;
      doc.text(`${data.contratada_whatsapp} · whatsapp`, rx, ry, { align: "right" });
    }
    if (data.contratada_email) {
      ry += 3.6;
      doc.text(data.contratada_email, rx, ry, { align: "right" });
    }
    doc.setTextColor(...VERDE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS DE SAÚDE E SEGURANÇA", pageW / 2, 26.5, {
      align: "center",
    });
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 30, pageW - MARGIN, 30);
    return 38;
  };

  const drawFooter = () => {
    doc.setFillColor(...VERDE);
    doc.rect(0, pageH - 8, pageW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `ENGTECH Serviços e Consultorias  ·  Página ${doc.getCurrentPageInfo().pageNumber} de ${doc.getNumberOfPages()}`,
      pageW / 2,
      pageH - 3,
      { align: "center" },
    );
  };

  let y = drawHeader();

  const ensure = (h: number) => {
    if (y + h > bottom) {
      doc.addPage();
      y = drawHeader();
    }
  };

  const clausula = (titulo: string) => {
    ensure(16);
    y += 3;
    doc.setFillColor(233, 243, 236);
    doc.rect(MARGIN, y, contentW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...VERDE);
    doc.text(titulo, MARGIN + 3, y + 4.9);
    y += 11;
  };

  const par = (text: string, opts?: { bold?: boolean; size?: number; justify?: boolean }) => {
    const setStyle = () => {
      doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
      doc.setFontSize(opts?.size ?? 10);
      doc.setTextColor(40, 40, 40);
    };
    setStyle();
    const lines: string[] = doc.splitTextToSize(text, contentW);
    for (const ln of lines) {
      ensure(LINE_H);
      setStyle();
      doc.text(ln, MARGIN, y, opts?.justify === false ? undefined : { maxWidth: contentW });
      y += LINE_H;
    }
    y += 2;
  };

  const item = (label: string, text: string) => {
    const setStyle = () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
    };
    setStyle();
    const lines: string[] = doc.splitTextToSize(text, contentW - 9);
    ensure(lines.length * LINE_H);
    setStyle();
    doc.text(label, MARGIN, y);
    doc.text(lines, MARGIN + 9, y);
    y += lines.length * LINE_H + 1.5;
  };

  // Preâmbulo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...VERDE);
  ensure(8);
  doc.text("CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS DE SAÚDE E SEGURANÇA", MARGIN, y, {
    maxWidth: contentW,
  });
  y += 9;

  par(
    `Pelo presente Instrumento Particular de Contrato de Prestação de Serviços, de um lado, ` +
      `${data.contratada_razao_social}, ${data.contratada_endereco}, inscrita no CNPJ sob o nº ` +
      `${data.contratada_cnpj}, neste ato representada por seu representante legal, o Sr. ` +
      `${data.contratada_representante}, CPF ${data.contratada_representante_cpf}, doravante denominada ENGTECH e, ` +
      `do outro lado, ${data.cliente_razao_social}, ${data.cliente_endereco}, inscrita no ` +
      `${data.cliente_documento_tipo} sob o nº ${data.cliente_documento}, doravante denominada CONTRATANTE, ` +
      `nos termos que se seguem:`,
  );

  // Cláusula I
  clausula("CLÁUSULA I - DO SERVIÇO");
  par(
    `O objeto do presente contrato é a prestação de serviços de saúde e segurança ocupacional pela ` +
      `${data.contratada_razao_social}, conforme itens abaixo:`,
  );
  data.servicos.forEach((s, i) => item(`${i + 1}.`, s));
  y += 2;

  // Cláusula II
  clausula("CLÁUSULA II - DA FORMA DE PRESTAÇÃO DO SERVIÇO");
  par("Os serviços ora contratados serão prestados mediante as condições abaixo determinadas:");
  [
    "Todos os relatórios gerenciais ou estatísticos decorrentes do acompanhamento dos Programas de Saúde e Segurança serão emitidos em conformidade com a legislação vigente;",
    "As avaliações de higiene ocupacional serão realizadas na frente de trabalho da CONTRATANTE, por profissionais habilitados e capacitados, utilizando equipamentos com manutenção e calibração de acordo com a legislação pertinente;",
    "Os programas PGR/PGRTR, LTCAT, LTI, LTP e PCMSO, bem como os registros de PPP e CAT, serão elaborados conforme as normas regulamentadoras pertinentes;",
    `As consultas médicas e os exames serão realizados nas instalações das clínicas parceiras da ${data.contratada_razao_social}, com data e hora marcada, ou nas instalações da CONTRATANTE, desde que em comum acordo entre as partes;`,
    `Envio dos eventos S-2210, S-2220 e S-2240 do eSocial feito pela ${data.contratada_razao_social} através de procuração digital emitida pela CONTRATANTE, exclusivamente para este fim.`,
  ].forEach((t, i) => item(`${i + 1}.`, t));

  // Cláusula III
  clausula("CLÁUSULA III - DO PAGAMENTO");
  par(
    `A ${data.contratada_razao_social} poderá utilizar a rede bancária para efetuar a cobrança de suas faturas, ` +
      `observando que, caso o boleto bancário não tenha sido recebido pela CONTRATANTE no prazo estabelecido, ` +
      `a mesma deverá contatar o setor de cobrança da CONTRATADA para a devida regularização dos pagamentos.`,
  );
  const pagamentoItens = [
    "Demais serviços contratados, fora do escopo deste contrato, poderão ser cobrados junto aos pagamentos mensais, de comum acordo entre as partes.",
    "A fatura será emitida no último dia útil de cada mês, com prazo para pagamento de até 10 (dez) dias após a emissão. A CONTRATADA enviará a fatura por e-mail no máximo até o segundo dia útil após a emissão.",
    "Em caso de atraso no pagamento, a CONTRATANTE pagará à CONTRATADA multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês.",
    "Em caso de atraso no pagamento de 2 (duas) parcelas consecutivas, os serviços serão suspensos e somente voltarão a ser prestados com o pagamento total dos valores em atraso.",
    "A suspensão dos serviços não exime a CONTRATANTE do pagamento dos valores acordados no presente instrumento.",
    `Pela prestação dos serviços contratados, a CONTRATANTE pagará à CONTRATADA (${data.contratada_razao_social}) o valor de ${data.valor_mensal_texto}.` +
      (data.forma_pagamento ? ` Forma de pagamento: ${data.forma_pagamento}.` : ""),
    "Em caso de reajuste, a CONTRATADA deverá comunicar formalmente à CONTRATANTE o novo valor, com antecedência em relação à data de vencimento da primeira mensalidade reajustada.",
  ];
  const letras = "abcdefghij".split("");
  pagamentoItens.forEach((t, i) => item(`${letras[i]})`, t));

  // Cláusula IV
  clausula("CLÁUSULA IV - DO PRAZO DE VALIDADE DESTE CONTRATO");
  [
    `O presente contrato é firmado pelo prazo de ${data.prazo_meses} meses, com início a partir da data de sua assinatura, sendo renovado automática e sucessivamente por períodos de ${data.prazo_meses} meses, não havendo manifestação em contrário.`,
    "Ao término do período inicial, o contrato será automaticamente renovado por iguais e sucessivos períodos, salvo manifestação expressa de qualquer das partes, mediante aviso prévio por escrito com antecedência mínima de 30 (trinta) dias.",
    `Em caso de rescisão antecipada por iniciativa da CONTRATANTE antes do término do período mínimo de vigência de ${data.prazo_meses} (${data.prazo_meses === 12 ? "doze" : String(data.prazo_meses)}) meses, ficará esta obrigada ao pagamento integral dos valores correspondentes às parcelas vincendas até o término do contrato.`,
    `Em caso de rescisão contratual, por qualquer que seja o motivo, a ${data.contratada_razao_social} se compromete a entregar à CONTRATANTE todos os documentos referentes à assistência prestada aos seus trabalhadores, sem nenhum tipo de pagamento ou indenização, desde que cumpridas as demais cláusulas e condições contratuais estabelecidas.`,
  ].forEach((t, i) => item(`${letras[i]})`, t));

  // Cláusula V
  clausula("CLÁUSULA V - RESPONSABILIDADES DA CONTRATADA");
  [
    "Realizar os serviços conforme o escopo contratado;",
    "Atender às normas internas da CONTRATANTE;",
    "Ser imparcial na conclusão dos programas e laudos, respeitando as normas técnicas e as leis vigentes;",
    "Apresentar o programa/laudo ao responsável indicado pela CONTRATANTE;",
    "Manter a confidencialidade das informações recebidas e dos laudos elaborados;",
    "Realizar a elaboração dos documentos conforme as normas e legislação vigentes.",
  ].forEach((t, i) => item(`${i + 1}.`, t));

  // Cláusula VI
  clausula("CLÁUSULA VI - DAS RESPONSABILIDADES FISCAIS");
  par(
    `Não se estabelece, por força deste contrato, nenhum tipo de sociedade, associação, consórcio, agência, ` +
      `mandato, representação ou responsabilidade solidária e subsidiária entre a ${data.contratada_razao_social} e a CONTRATANTE.`,
  );

  // Cláusula VII
  clausula("CLÁUSULA VII - DO FORO");
  par(
    `As partes elegem o Foro da Comarca de ${data.foro_comarca} para a solução de eventuais litígios decorrentes ` +
      `deste instrumento, renunciando expressamente a qualquer outro, por mais privilegiado que seja ou venha a ser.`,
  );

  if (data.observacoes?.trim()) {
    clausula("CLÁUSULA VIII - DISPOSIÇÕES GERAIS");
    par(data.observacoes.trim());
  }

  par(
    "E, por estarem justos e acertados, os partícipes firmam o presente instrumento em 02 (duas) vias de igual teor.",
  );
  y += 2;
  ensure(8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${data.cidade_assinatura}, ${formatDateExtenso(data.data_contrato)}.`, MARGIN, y);
  y += 14;

  // Assinaturas
  const bloco = (titulo: string, nome: string, sub?: string) => {
    ensure(26);
    const cx = pageW / 2;
    doc.setDrawColor(...CINZA);
    doc.setLineWidth(0.3);
    doc.line(cx - 45, y, cx + 45, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(titulo, cx, y + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    if (nome) doc.text(nome, cx, y + 10, { align: "center" });
    if (sub) {
      doc.setTextColor(...CINZA);
      doc.text(sub, cx, y + 14.5, { align: "center" });
    }
    y += 26;
  };

  ensure(90);
  bloco("ENGTECH", data.contratada_representante, `CPF ${data.contratada_representante_cpf}`);
  bloco(
    "CONTRATANTE",
    data.cliente_representante || data.cliente_razao_social,
    `${data.cliente_documento_tipo} ${data.cliente_documento}`,
  );
  bloco("1ª TESTEMUNHA", "", "Nome / CPF");
  bloco("2ª TESTEMUNHA", "", "Nome / CPF");

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    drawFooter();
  }
  return doc;
}

export function downloadContratoPdf(doc: jsPDF, clienteNome: string) {
  const slug = (clienteNome || "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
  const filename = `CONTRATO_PRESTACAO_SERVICOS_${slug}.pdf`;
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
