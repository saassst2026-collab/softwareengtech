/**
 * Matriz 6x4 qualitativa simplificada (probabilidades adaptadas da AIHA).
 * Gravidade da consequência x Probabilidade de ocorrência.
 */
export const SEVERIDADES_MATRIZ = [
  { label: "Catastrófico", peso: 9, lesao: "Morte" },
  { label: "Crítico", peso: 6, lesao: "Incapacidade / Lesão / Doença Irreversível" },
  { label: "Marginal", peso: 3, lesao: "Lesão Leve / Doença Irreversível" },
  { label: "Irrelevante", peso: 1, lesao: "Sem Lesão / Doença" },
] as const;

export const PROBABILIDADES_MATRIZ = [
  { label: "Improvável", peso: 0, definicao: "Fisicamente impossível de ocorrer" },
  { label: "Raro", peso: 1, definicao: "Provável que ocorra uma vez por ano" },
  { label: "Incomum", peso: 2, definicao: "Provável que ocorra uma vez por mês" },
  { label: "Ocasional", peso: 4, definicao: "Provável que ocorra uma vez por semana" },
  { label: "Frequente", peso: 6, definicao: "Provável que ocorra uma vez por dia" },
  { label: "Contínuo", peso: 8, definicao: "Provável que ocorra" },
] as const;

export function pesoSeveridade(label: string): number | null {
  return SEVERIDADES_MATRIZ.find((s) => s.label === label)?.peso ?? null;
}

export function pesoProbabilidade(label: string): number | null {
  return PROBABILIDADES_MATRIZ.find((p) => p.label === label)?.peso ?? null;
}

export type ClassificacaoRisco = "irrelevante" | "baixo" | "moderado" | "alto" | "critico";

/** Nível de risco = gravidade x probabilidade. */
export function calcularNivelRisco(severidade: string, probabilidade: string): number | null {
  const s = pesoSeveridade(severidade);
  const p = pesoProbabilidade(probabilidade);
  if (s == null || p == null) return null;
  return s * p;
}

export function classificarNivel(nivel: number | null): ClassificacaoRisco | null {
  if (nivel == null) return null;
  if (nivel === 0) return "irrelevante";
  if (nivel <= 12) return "baixo";
  if (nivel < 36) return "moderado";
  if (nivel < 54) return "alto";
  return "critico";
}

export const CLASSIFICACAO_LABEL: Record<ClassificacaoRisco, string> = {
  irrelevante: "Irrelevante",
  baixo: "Baixo (aceitável)",
  moderado: "Moderado (atenção)",
  alto: "Alto (crítico)",
  critico: "Crítico (intolerável)",
};

export function classificarRisco(severidade: string, probabilidade: string) {
  const nivel = calcularNivelRisco(severidade, probabilidade);
  const classificacao = classificarNivel(nivel);
  return { nivel, classificacao };
}
