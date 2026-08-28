export type ImportRow = {
  empresa?: string;
  cnpj?: string;
  cidade?: string;
  uf?: string;
  contabilidade?: string;
  responsavel?: string;
  contato?: string;
  tipo_documento?: string;
  titulo?: string;
  data_conclusao?: string | null;
  data_vencimento?: string | null;
  situacao?: string;
  status?: string;
  observacoes?: string;
};

const TIPOS_VALIDOS = new Set([
  "PGR",
  "PGRTR",
  "PCMSO",
  "LTCAT",
  "LTI",
  "LTP",
  "AET",
  "AEP",
  "PPP",
  "OS_SST",
  "FICHA_EPI",
  "TREINAMENTO",
  "S_2240",
  "S_2220",
  "S_2210",
]);

const SITUACOES_VALIDAS = new Set([
  "em_dia",
  "proximo_vencimento",
  "vencido",
  "pendente",
  "concluido",
]);

export function normalizeTipo(raw?: string): string | null {
  if (!raw) return null;
  const v = raw
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[\s./-]+/g, "_")
    .replace(/_+/g, "_");
  const map: Record<string, string> = {
    OS_DE_SST: "OS_SST",
    OSSST: "OS_SST",
    FICHA_DE_EPI: "FICHA_EPI",
    EPI: "FICHA_EPI",
    TREINAMENTOS: "TREINAMENTO",
    S2240: "S_2240",
    S2220: "S_2220",
    S2210: "S_2210",
    CAT: "S_2210",
  };
  const candidate = map[v] ?? v;
  return TIPOS_VALIDOS.has(candidate) ? candidate : null;
}

export function normalizeSituacao(raw?: string, vencimento?: string | null): string {
  if (raw) {
    const v = raw
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s.-]+/g, "_")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const map: Record<string, string> = {
      em_dia: "em_dia",
      ok: "em_dia",
      proximo: "proximo_vencimento",
      proximo_vencimento: "proximo_vencimento",
      proximo_de_vencer: "proximo_vencimento",
      atencao: "proximo_vencimento",
      vencido: "vencido",
      atrasado: "vencido",
      pendente: "pendente",
      concluido: "concluido",
      finalizado: "concluido",
    };
    if (map[v] && SITUACOES_VALIDAS.has(map[v])) return map[v];
  }

  if (vencimento) {
    const d = new Date(vencimento);
    if (!Number.isNaN(d.getTime())) {
      const diff = Math.floor((d.getTime() - Date.now()) / 86400000);
      if (diff < 0) return "vencido";
      if (diff <= 60) return "proximo_vencimento";
      return "em_dia";
    }
  }

  return "pendente";
}

export function normalizeDate(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.toString().trim();
  if (!s) return null;

  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return null;
}
