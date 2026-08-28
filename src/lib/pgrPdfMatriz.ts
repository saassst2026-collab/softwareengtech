/**
 * Matriz de Riscos 6x4 (AIHA Adaptada) e Tabelas de Severidade e Probabilidade
 * Conforme Modelo PGR EngTech
 */

export const TABELA_SEVERIDADE = {
  head: [["Categoria", "Lesão/Doença"]],
  body: [
    ["Catastrófico", "Morte"],
    ["Crítico", "Incapacidade / Lesão / Doença Irreversível"],
    ["Marginal", "Lesão Leve / Doença Irreversível"],
    ["Irrelevante", "Sem Lesão / Doença"],
  ],
};

export const TABELA_PROBABILIDADE = {
  head: [["Categoria", "Definição"]],
  body: [
    ["Impossível", "Fisicamente impossível de ocorrer"],
    ["Raro", "Provável que ocorra uma vez por ano"],
    ["Incomum", "Provável que ocorra uma vez por mês"],
    ["Ocasional", "Provável que ocorra uma vez por semana"],
    ["Frequente", "Provável que ocorra uma vez por dia"],
    ["Contínuo", "Provável que ocorra"],
  ],
};

export type MatrizCell = {
  valor: number;
  cor: [number, number, number]; // RGB
  textColor: [number, number, number];
};

export const COR_VERDE: [number, number, number] = [46, 125, 50]; // #2e7d32
export const COR_VERDE_CLARO: [number, number, number] = [139, 195, 74]; // #8bc34a
export const COR_AMARELO: [number, number, number] = [253, 216, 53]; // #fdd835
export const COR_VERMELHO: [number, number, number] = [229, 57, 53]; // #e53935

// Estrutura das 4 linhas da Matriz 6x4
export const MATRIZ_6X4_ROWS = [
  {
    nome: "Catastrófico",
    pts: "9",
    cols: [
      { val: "0", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "9", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "18", bg: COR_AMARELO, text: [30, 30, 30] },
      { val: "36", bg: COR_VERMELHO, text: [255, 255, 255] },
      { val: "54", bg: COR_VERMELHO, text: [255, 255, 255] },
      { val: "72", bg: COR_VERMELHO, text: [255, 255, 255] },
    ],
  },
  {
    nome: "Crítico",
    pts: "6",
    cols: [
      { val: "0", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "6", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "12", bg: COR_VERDE_CLARO, text: [30, 30, 30] },
      { val: "24", bg: COR_AMARELO, text: [30, 30, 30] },
      { val: "36", bg: COR_VERMELHO, text: [255, 255, 255] },
      { val: "48", bg: COR_VERMELHO, text: [255, 255, 255] },
    ],
  },
  {
    nome: "Marginal",
    pts: "3",
    cols: [
      { val: "0", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "3", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "6", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "12", bg: COR_VERDE_CLARO, text: [30, 30, 30] },
      { val: "18", bg: COR_AMARELO, text: [30, 30, 30] },
      { val: "24", bg: COR_AMARELO, text: [30, 30, 30] },
    ],
  },
  {
    nome: "Irrelevante",
    pts: "1",
    cols: [
      { val: "0", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "1", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "2", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "4", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "6", bg: COR_VERDE, text: [255, 255, 255] },
      { val: "8", bg: COR_VERDE, text: [255, 255, 255] },
    ],
  },
];

/** Retorna pontuação de probabilidade para a Matriz 6x4 */
export function getPontosProbabilidade(prob?: string | null): number {
  if (!prob) return 2;
  const p = prob.toLowerCase();
  if (p.includes("improv")) return 0;
  if (p.includes("raro")) return 1;
  if (p.includes("incomum") || p.includes("baixa")) return 2;
  if (p.includes("ocasional") || p.includes("média") || p.includes("media")) return 4;
  if (p.includes("frequente") || p.includes("alta")) return 6;
  if (p.includes("contínuo") || p.includes("continuo")) return 8;
  return 2;
}

/** Retorna pontuação de severidade para a Matriz 6x4 */
export function getPontosSeveridade(sev?: string | null): number {
  if (!sev) return 3;
  const s = sev.toLowerCase();
  if (s.includes("irrelevante") || s.includes("baixa") || s.includes("leve")) return 1;
  if (s.includes("marginal") || s.includes("média") || s.includes("media")) return 3;
  if (s.includes("crítico") || s.includes("critico") || s.includes("alta") || s.includes("grave")) return 6;
  if (s.includes("catastrófico") || s.includes("catastrofico") || s.includes("morte")) return 9;
  return 3;
}

/** Retorna cores do tipo de risco para o Inventário de Riscos */
export function getCorTipoRisco(tipo?: string | null): {
  bg: [number, number, number];
  text: [number, number, number];
} {
  const t = (tipo || "").toLowerCase();
  if (t.includes("fisic")) {
    return { bg: [200, 230, 201], text: [27, 94, 32] }; // Verde suave
  }
  if (t.includes("quimic")) {
    return { bg: [255, 205, 210], text: [183, 28, 28] }; // Vermelho suave
  }
  if (t.includes("biolog")) {
    return { bg: [215, 204, 200], text: [62, 39, 35] }; // Marrom suave
  }
  if (t.includes("ergonom")) {
    return { bg: [255, 249, 196], text: [130, 119, 23] }; // Amarelo suave
  }
  // Acidentes / Mecânico
  return { bg: [187, 222, 251], text: [13, 71, 161] }; // Azul suave
}

/** Retorna cores da Classificação do Risco (CR) */
export function getCorClassificacaoRisco(cr: number): {
  bg: [number, number, number];
  text: [number, number, number];
  label: string;
} {
  if (cr <= 12) {
    return { bg: COR_VERDE, text: [255, 255, 255], label: `${cr} (Baixo)` };
  }
  if (cr <= 24) {
    return { bg: COR_AMARELO, text: [30, 30, 30], label: `${cr} (Médio)` };
  }
  return { bg: COR_VERMELHO, text: [255, 255, 255], label: `${cr} (Alto)` };
}
