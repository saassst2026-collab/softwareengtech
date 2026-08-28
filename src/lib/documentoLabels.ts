/**
 * Mapeamento entre os enums internos do banco (documento_tipo) e os
 * rótulos oficiais usados na planilha SST de origem.
 *
 * Use `tipoLabel(tipo)` em qualquer parte da UI para exibir o nome
 * exatamente como aparece na planilha.
 */
export const DOC_TIPO_LABELS: Record<string, string> = {
  PGR: "PGR",
  PGRTR: "PGRTR",
  PCMSO: "PCMSO",
  LTCAT: "LTCAT",
  LTI: "LTI",
  LTP: "LTP",
  AET: "AET",
  AEP: "AEP",
  PPP: "PPP",
  FICHA_EPI: "FICHA DE EPI",
  OS_SST: "ORDEM DE SERVIÇO",
  TREINAMENTO: "TREINAMENTO",
  S_2240: "S-2240",
  S_2220: "S-2220",
  S_2210: "S-2210",
};

export const DOCUMENTOS_SEM_VALIDADE = new Set([
  "LTCAT",
  "LTI",
  "LTP",
  "FICHA_EPI",
  "OS_SST",
  "PPP",
]);

/** Tipos com validade padrão de 2 anos (730 dias). Demais tipos usam 1 ano. */
export const TIPOS_VALIDADE_2_ANOS = new Set(["PGR", "PGRTR"]);

export function getValidadePadraoDias(tipo: string): number {
  return TIPOS_VALIDADE_2_ANOS.has(tipo) ? 730 : 365;
}

export const DOCUMENTO_ORDEM: Record<string, number> = {
  PGR: 0,
  PGRTR: 1,
  PCMSO: 2,
  LTCAT: 3,
  LTI: 4,
  LTP: 5,
  AEP: 6,
  FICHA_EPI: 7,
  OS_SST: 8,
  PPP: 9,
  AET: 10,
  TREINAMENTO: 11,
  S_2240: 12,
  S_2220: 13,
  S_2210: 14,
};

export function tipoLabel(tipo: string | null | undefined): string {
  if (!tipo) return "—";
  return DOC_TIPO_LABELS[tipo] ?? tipo.replace(/_/g, " ");
}

/** Lista canônica de tipos exibida nos filtros da UI */
export const DOC_TIPOS_ORDENADOS: Array<keyof typeof DOC_TIPO_LABELS> = [
  "PGR",
  "PGRTR",
  "PCMSO",
  "LTCAT",
  "LTI",
  "LTP",
  "AEP",
  "FICHA_EPI",
  "OS_SST",
  "PPP",
  "AET",
  "TREINAMENTO",
  "S_2240",
  "S_2220",
  "S_2210",
];
