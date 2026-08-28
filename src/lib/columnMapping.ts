/**
 * Mapeamento explícito de colunas da planilha SST.
 * - Cabeçalhos aceitos (variações em PT-BR) → chave canônica do sistema.
 * - Coluna obrigatória vs opcional.
 */

export type CanonicalField =
  | "empresa"
  | "cnpj"
  | "cidade"
  | "uf"
  | "contabilidade"
  | "responsavel"
  | "contato"
  | "tipo_documento"
  | "titulo"
  | "data_conclusao"
  | "data_vencimento"
  | "situacao"
  | "status"
  | "observacoes";

export const REQUIRED_COLUMNS: CanonicalField[] = ["empresa", "tipo_documento", "data_vencimento"];

export const COLUMN_DEFINITIONS: {
  field: CanonicalField;
  label: string;
  required: boolean;
  aliases: string[];
}[] = [
  {
    field: "empresa",
    label: "Empresa",
    required: true,
    aliases: ["empresa", "cliente", "razao_social"],
  },
  { field: "cnpj", label: "CNPJ", required: false, aliases: ["cnpj"] },
  { field: "cidade", label: "Cidade", required: false, aliases: ["cidade", "municipio"] },
  { field: "uf", label: "UF", required: false, aliases: ["uf", "estado"] },
  {
    field: "contabilidade",
    label: "Contabilidade",
    required: false,
    aliases: ["contabilidade", "escritorio_contabil", "contador"],
  },
  {
    field: "responsavel",
    label: "Responsável",
    required: false,
    aliases: ["responsavel", "tecnico_responsavel", "engenheiro_responsavel"],
  },
  {
    field: "contato",
    label: "Contato",
    required: false,
    aliases: ["contato", "telefone", "email_contato"],
  },
  {
    field: "tipo_documento",
    label: "Documento",
    required: true,
    aliases: ["documento", "tipo_documento", "tipo", "tipo_de_documento"],
  },
  {
    field: "titulo",
    label: "Título",
    required: false,
    aliases: ["titulo", "descricao_documento", "nome_documento"],
  },
  {
    field: "data_conclusao",
    label: "Data de Conclusão",
    required: false,
    aliases: ["data_conclusao", "conclusao", "data_de_conclusao", "elaboracao", "data_elaboracao"],
  },
  {
    field: "data_vencimento",
    label: "Vencimento",
    required: true,
    aliases: ["data_vencimento", "vencimento", "data_de_vencimento", "validade"],
  },
  { field: "situacao", label: "Situação", required: false, aliases: ["situacao"] },
  { field: "status", label: "Status", required: false, aliases: ["status"] },
  {
    field: "observacoes",
    label: "Observações",
    required: false,
    aliases: ["observacoes", "obs", "observacao", "notas"],
  },
];

export function normalizeHeader(raw: string): string {
  return raw
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s./-]+/g, "_")
    .replace(/_+/g, "_");
}

/**
 * Recebe os cabeçalhos da planilha e retorna o mapeamento header → canonical
 * mais a lista de campos canônicos não encontrados.
 */
export function buildColumnMap(headers: string[]) {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const map: Partial<Record<CanonicalField, string>> = {};

  for (const def of COLUMN_DEFINITIONS) {
    const match = normalized.find((h) => def.aliases.includes(h.norm));
    if (match) map[def.field] = match.raw;
  }

  const missingRequired = REQUIRED_COLUMNS.filter((f) => !map[f]);
  const matchedFields = COLUMN_DEFINITIONS.filter((d) => map[d.field]).map((d) => d.field);

  return { map, missingRequired, matchedFields };
}
