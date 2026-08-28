/**
 * Utilidades monetárias pt-BR.
 *
 * Aceita entradas variadas do usuário ("1000", "1.000", "1.000,00",
 * "99,90", "R$ 1.250,30") e converte com segurança para número decimal,
 * sem nunca interpretar ponto de milhar como decimal.
 */

/** Converte string monetária (formato livre pt-BR) em número decimal. */
export function parseBRLToNumber(input: string | number | null | undefined): number {
  if (input == null) return 0;
  if (typeof input === "number") return isFinite(input) ? input : 0;
  const s = String(input).trim();
  if (!s) return 0;
  // remove tudo que não for dígito, ponto, vírgula ou sinal
  const cleaned = s.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized: string;
  if (hasComma) {
    // vírgula é o separador decimal; pontos são separadores de milhar
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    const parts = cleaned.split(".");
    const last = parts[parts.length - 1];
    // se houver mais de um ponto OU o último grupo tiver exatamente 3
    // dígitos, tratamos os pontos como milhar (ex.: "1.000", "1.234.567")
    if (parts.length > 2 || last.length === 3) {
      normalized = cleaned.replace(/\./g, "");
    } else {
      // único ponto com !=3 dígitos depois → tratado como decimal (ex.: "10.5")
      normalized = cleaned;
    }
  } else {
    normalized = cleaned;
  }
  const n = Number(normalized);
  return isFinite(n) ? n : 0;
}

/** Formata número como "1.250,30" (sem prefixo R$). */
export function formatBRL(n: number): string {
  const v = isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata número como "R$ 1.250,30". */
export function formatBRLCurrency(n: number): string {
  const v = isFinite(n) ? n : 0;
  if (v === 0) return "---";
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
